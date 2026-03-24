import * as Tone from "tone";
import { DspState } from "./SemanticProcessor";

/**
 * Recreates the real-time DSP chain in an offline context and renders to an AudioBuffer.
 */
export async function renderAudio(
  sourceBuffer: Tone.ToneAudioBuffer,
  dspState: DspState
): Promise<AudioBuffer> {
  const duration = sourceBuffer.duration;
  const nativeBuffer = sourceBuffer.get();
  if (!nativeBuffer) throw new Error("Audio buffer not loaded");
  
  const rendered = await Tone.Offline(async () => {
    // 1. Create Nodes
    const player = new Tone.Player(nativeBuffer);
    const lowShelf = new Tone.Filter(dspState.lowShelf.frequency, "lowshelf");
    const peaking1 = new Tone.Filter(dspState.peaking1.frequency, "peaking");
    const boxyNotch = new Tone.Filter(dspState.boxyNotch.frequency, "peaking");
    const peaking2 = new Tone.Filter(dspState.peaking2.frequency, "peaking");
    const peaking3 = new Tone.Filter(dspState.peaking3.frequency, "peaking");
    const highShelf = new Tone.Filter(dspState.highShelf.frequency, "highshelf");
    const lowPass = new Tone.Filter(dspState.lowPass.frequency, "lowpass");
    const highPass = new Tone.Filter(dspState.highPass.frequency, "highpass");
    const distortion = new Tone.Distortion(dspState.saturation.amount);
    const reverb = new Tone.Reverb({ decay: 1.5, wet: dspState.reverb.wet });
    const compressor = new Tone.Compressor({
      threshold: dspState.compressor.threshold,
      ratio: dspState.compressor.ratio,
      attack: dspState.compressor.attack,
      release: dspState.compressor.release,
    });
    const bitcrusher = new Tone.BitCrusher(dspState.bitcrusher.bits);
    const limiter = new Tone.Limiter(0);

    // 2. Set Parameters
    lowShelf.gain.value = dspState.lowShelf.gain;
    lowShelf.Q.value = dspState.lowShelf.q;

    peaking1.gain.value = dspState.peaking1.gain;
    peaking1.Q.value = dspState.peaking1.q;

    boxyNotch.gain.value = dspState.boxyNotch.gain;
    boxyNotch.Q.value = dspState.boxyNotch.q;

    peaking2.gain.value = dspState.peaking2.gain;
    peaking2.Q.value = dspState.peaking2.q;

    peaking3.gain.value = dspState.peaking3.gain;
    peaking3.Q.value = dspState.peaking3.q;

    highShelf.gain.value = dspState.highShelf.gain;
    highShelf.Q.value = dspState.highShelf.q;

    lowPass.Q.value = dspState.lowPass.q;
    highPass.Q.value = dspState.highPass.q;

    distortion.wet.value = dspState.saturation.amount;
    bitcrusher.wet.value = dspState.bitcrusher.wet;

    // 3. Connect Chain
    player.chain(
      lowShelf,
      peaking1,
      boxyNotch,
      peaking2,
      peaking3,
      highShelf,
      lowPass,
      highPass,
      distortion,
      reverb,
      compressor,
      bitcrusher,
      limiter,
      Tone.getDestination()
    );

    // 4. Start
    player.start(0);
    
    // Ensure reverb is ready (offline context handles async nodes by waiting for them)
    await reverb.ready;
  }, duration);

  return rendered.get() as AudioBuffer;
}

/**
 * Converts an AudioBuffer to a WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF Chunk
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  
  // Format Chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  
  // Data Chunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write PCM samples
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      // Clamp to [-1, 1]
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Converts an AudioBuffer to an MP3 Blob using MediaRecorder.
 * This happens at real-time playback since MediaRecorder doesn't support offline contexts.
 */
export async function audioBufferToMp3Blob(buffer: AudioBuffer): Promise<Blob> {
  const context = new (window.AudioContext || (window as any).webkitAudioContext)();
  const source = context.createBufferSource();
  source.buffer = buffer;
  
  const destination = context.createMediaStreamDestination();
  source.connect(destination);
  
  // Try to find a supported MP3-ish mime type
  const mimeTypes = ['audio/mpeg', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus'];
  const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
  
  const recorder = new MediaRecorder(destination.stream, { mimeType: supportedType });
  const chunks: BlobPart[] = [];
  
  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: supportedType }));
      context.close();
    };
    recorder.onerror = reject;
    
    source.start(0);
    recorder.start();
    
    // Stop after buffer duration
    setTimeout(() => {
      recorder.stop();
      source.stop();
    }, buffer.duration * 1000 + 100); // add small buffer
  });
}
