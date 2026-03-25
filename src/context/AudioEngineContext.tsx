"use client";

import * as Tone from "tone";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BASE_DSP_STATE,
  SemanticProcessor,
  type DspState,
  type LlmDspParams,
} from "@/lib/SemanticProcessor";
import {
  renderAudio,
  audioBufferToWavBlob,
  audioBufferToMp3Blob,
} from "@/lib/AudioExporter";
import type { SemanticTerm } from "@/types/audio";

interface AudioEngineValue {
  isReady: boolean;
  isPlaying: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  hasPrompt: boolean;
  playbackVersion: "dry" | "processed" | null;
  dryFftValues: Float32Array;
  processedFftValues: Float32Array;
  originalWaveform: Float32Array;
  processedWaveform: Float32Array;
  dspState: DspState;
  semanticTerms: SemanticTerm[];
  lastCommand: string;
  explanation: string;
  isBouncing: boolean;
  loadAudio: (file: File) => Promise<void>;
  playOriginal: () => Promise<void>;
  playProcessed: () => Promise<void>;
  applySemanticCommand: (command: string) => Promise<void>;
  exportAudio: (format: "wav" | "mp3") => Promise<void>;
}

const AudioEngineContext = createContext<AudioEngineValue | null>(null);
const RAMP_SECONDS = 0.08;
const WAVEFORM_POINTS = 320;

function getBufferChannelData(buffer: Tone.ToneAudioBuffer): Float32Array | null {
  const raw = buffer.toArray();
  if (raw instanceof Float32Array) {
    return raw;
  }
  if (Array.isArray(raw) && raw[0] instanceof Float32Array) {
    return raw[0];
  }
  return null;
}

function extractWaveformEnvelope(buffer: Tone.ToneAudioBuffer): Float32Array {
  const channelData = getBufferChannelData(buffer);
  if (!channelData || channelData.length === 0) {
    return new Float32Array(0);
  }

  const envelope = new Float32Array(WAVEFORM_POINTS);
  const windowSize = Math.max(1, Math.floor(channelData.length / WAVEFORM_POINTS));
  for (let i = 0; i < WAVEFORM_POINTS; i += 1) {
    const start = i * windowSize;
    const end = Math.min(channelData.length, start + windowSize);
    let peak = 0;
    for (let j = start; j < end; j += 1) {
      const abs = Math.abs(channelData[j] ?? 0);
      if (abs > peak) peak = abs;
    }
    envelope[i] = peak;
  }
  return envelope;
}

function applyWaveformTransform(source: Float32Array, state: DspState): Float32Array {
  if (source.length === 0) return new Float32Array(0);

  const shaped = new Float32Array(source.length);
  const compressionStrength = Math.min(0.5, Math.max(0, (state.compressor.ratio - 1) * 0.08));
  const saturationStrength = Math.min(0.5, state.saturation.amount * 0.8);
  const crusherStrength = state.bitcrusher.wet > 0 ? Math.min(0.45, (8 - state.bitcrusher.bits) / 16) : 0;
  const highBandCut = Math.max(0, (12000 - state.lowPass.frequency) / 12000);
  const lowBandCut = Math.max(0, (state.highPass.frequency - 20) / 1000);
  const gainScale = 1 - compressionStrength - crusherStrength * 0.3 + saturationStrength * 0.15;
  const tilt = 1 - highBandCut * 0.35 - lowBandCut * 0.12;

  for (let i = 0; i < source.length; i += 1) {
    const input = source[i] ?? 0;
    const compressed = input ** (1 + compressionStrength);
    const saturated = Math.tanh(compressed * (1 + saturationStrength)) / Math.tanh(1 + saturationStrength);
    const crushed = Math.max(0, saturated - crusherStrength * 0.08);
    shaped[i] = Math.min(1, Math.max(0, crushed * gainScale * tilt));
  }

  return shaped;
}

export function AudioEngineProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<Tone.Player | null>(null);
  const processorGainRef = useRef<Tone.Gain | null>(null);
  const selectorRef = useRef<Tone.CrossFade | null>(null);
  const limiterRef = useRef<Tone.Limiter | null>(null);
  const dryAnalyserRef = useRef<Tone.Analyser | null>(null);
  const processedAnalyserRef = useRef<Tone.Analyser | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const bandChainRef = useRef<{
    lowShelf: Tone.Filter;
    peaking1: Tone.Filter;
    boxyNotch: Tone.Filter;
    peaking2: Tone.Filter;
    peaking3: Tone.Filter;
    highShelf: Tone.Filter;
    lowPass: Tone.Filter;
    highPass: Tone.Filter;
    distortion: Tone.Distortion;
    reverb: Tone.Reverb;
    compressor: Tone.Compressor;
    bitcrusher: Tone.BitCrusher;
  } | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [playbackVersion, setPlaybackVersion] = useState<"dry" | "processed" | null>(null);
  const [semanticTerms, setSemanticTerms] = useState<SemanticTerm[]>([]);
  const [lastCommand, setLastCommand] = useState("");
  const [dryFftValues, setDryFftValues] = useState<Float32Array>(new Float32Array(1024));
  const [processedFftValues, setProcessedFftValues] = useState<Float32Array>(new Float32Array(1024));
  const [originalWaveform, setOriginalWaveform] = useState<Float32Array>(new Float32Array(0));
  const [processedWaveform, setProcessedWaveform] = useState<Float32Array>(new Float32Array(0));
  const [dspState, setDspState] = useState<DspState>(BASE_DSP_STATE);
  const [explanation, setExplanation] = useState("");
  const [isBouncing, setIsBouncing] = useState(false);
  const [originalFilename, setOriginalFilename] = useState("");

  const initializeAudio = useCallback(async () => {
    if (isReady) return;

    await Tone.start();

    const player = new Tone.Player({ autostart: false, loop: true });
    const processedGain = new Tone.Gain(1);
    const selector = new Tone.CrossFade(0); // 0 = dry, 1 = processed
    const limiter = new Tone.Limiter(0);
    const dryAnalyser = new Tone.Analyser("fft", 4096);
    const processedAnalyser = new Tone.Analyser("fft", 4096);

    const lowShelf = new Tone.Filter(BASE_DSP_STATE.lowShelf.frequency, "lowshelf");
    const peaking1 = new Tone.Filter(BASE_DSP_STATE.peaking1.frequency, "peaking");
    const boxyNotch = new Tone.Filter(BASE_DSP_STATE.boxyNotch.frequency, "peaking");
    const peaking2 = new Tone.Filter(BASE_DSP_STATE.peaking2.frequency, "peaking");
    const peaking3 = new Tone.Filter(BASE_DSP_STATE.peaking3.frequency, "peaking");
    const highShelf = new Tone.Filter(BASE_DSP_STATE.highShelf.frequency, "highshelf");
    const lowPass = new Tone.Filter(BASE_DSP_STATE.lowPass.frequency, "lowpass");
    const highPass = new Tone.Filter(BASE_DSP_STATE.highPass.frequency, "highpass");
    const distortion = new Tone.Distortion(0);
    distortion.wet.value = 0;
    const reverb = new Tone.Reverb({ decay: 1.5, wet: 0 });
    const compressor = new Tone.Compressor(-18, 1);
    const bitcrusher = new Tone.BitCrusher(8);
    bitcrusher.wet.value = 0;

    player.connect(processedGain);
    player.connect(selector.a);
    player.connect(dryAnalyser);

    processedGain
      .chain(
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
        selector.b
      );
    selector.b.connect(processedAnalyser);
    selector.connect(limiter);
    limiter.toDestination();

    playerRef.current = player;
    processorGainRef.current = processedGain;
    selectorRef.current = selector;
    limiterRef.current = limiter;
    dryAnalyserRef.current = dryAnalyser;
    processedAnalyserRef.current = processedAnalyser;
    bandChainRef.current = {
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
    };

    setIsReady(true);
  }, [isReady]);

  const applyDspState = useCallback((state: DspState) => {
    const bandChain = bandChainRef.current;
    if (!bandChain) return;

    const now = Tone.now();

    const safeRamp = (param: any, value: any, duration: number) => {
      const num = Number(value);
      if (Number.isFinite(num) && param && typeof param.rampTo === 'function') {
        param.rampTo(num, duration, now);
      }
    };

    safeRamp(bandChain.lowShelf.frequency, state.lowShelf.frequency, RAMP_SECONDS);
    safeRamp(bandChain.lowShelf.gain, state.lowShelf.gain, RAMP_SECONDS);
    safeRamp(bandChain.lowShelf.Q, state.lowShelf.q, RAMP_SECONDS);

    safeRamp(bandChain.peaking1.frequency, state.peaking1.frequency, RAMP_SECONDS);
    safeRamp(bandChain.peaking1.gain, state.peaking1.gain, RAMP_SECONDS);
    safeRamp(bandChain.peaking1.Q, state.peaking1.q, RAMP_SECONDS);

    safeRamp(bandChain.boxyNotch.frequency, state.boxyNotch.frequency, RAMP_SECONDS);
    safeRamp(bandChain.boxyNotch.gain, state.boxyNotch.gain, RAMP_SECONDS);
    safeRamp(bandChain.boxyNotch.Q, state.boxyNotch.q, RAMP_SECONDS);

    safeRamp(bandChain.peaking2.frequency, state.peaking2.frequency, RAMP_SECONDS);
    safeRamp(bandChain.peaking2.gain, state.peaking2.gain, RAMP_SECONDS);
    safeRamp(bandChain.peaking2.Q, state.peaking2.q, RAMP_SECONDS);

    safeRamp(bandChain.peaking3.frequency, state.peaking3.frequency, RAMP_SECONDS);
    safeRamp(bandChain.peaking3.gain, state.peaking3.gain, RAMP_SECONDS);
    safeRamp(bandChain.peaking3.Q, state.peaking3.q, RAMP_SECONDS);

    safeRamp(bandChain.highShelf.frequency, state.highShelf.frequency, RAMP_SECONDS);
    safeRamp(bandChain.highShelf.gain, state.highShelf.gain, RAMP_SECONDS);
    safeRamp(bandChain.highShelf.Q, state.highShelf.q, RAMP_SECONDS);

    safeRamp(bandChain.lowPass.frequency, state.lowPass.frequency, 0.5);
    safeRamp(bandChain.lowPass.Q, state.lowPass.q, RAMP_SECONDS);
    safeRamp(bandChain.highPass.frequency, state.highPass.frequency, 0.5);
    safeRamp(bandChain.highPass.Q, state.highPass.q, RAMP_SECONDS);

    if (Number.isFinite(state.saturation.amount)) {
      bandChain.distortion.distortion = state.saturation.amount;
      bandChain.distortion.wet.rampTo(state.saturation.amount, 0.5, now);
    }
    
    if (Number.isFinite(state.reverb.wet)) {
      bandChain.reverb.wet.rampTo(state.reverb.wet, 0.5, now);
    }

    safeRamp(bandChain.compressor.threshold, state.compressor.threshold, RAMP_SECONDS);
    safeRamp(bandChain.compressor.ratio, state.compressor.ratio, RAMP_SECONDS);
    safeRamp(bandChain.compressor.attack, state.compressor.attack, RAMP_SECONDS);
    safeRamp(bandChain.compressor.release, state.compressor.release, RAMP_SECONDS);

    if (Number.isFinite(state.bitcrusher.bits)) {
      bandChain.bitcrusher.bits.rampTo(state.bitcrusher.bits, 0.5, now);
    }
    if (Number.isFinite(state.bitcrusher.wet)) {
      bandChain.bitcrusher.wet.rampTo(state.bitcrusher.wet, 0.5, now);
    }
  }, []);

  const loadAudio = useCallback(async (file: File) => {
    if (!playerRef.current) {
      await initializeAudio();
    }

    const player = playerRef.current;
    if (!player) {
      setIsLoading(false);
      setIsLoaded(false);
      return;
    }

    (player as Tone.Player & { onerror?: (error: unknown) => void }).onerror = (error: unknown) => {
      console.error("Tone.Player decoding error:", error);
      setIsLoading(false);
      setIsLoaded(false);
    };

    setIsLoading(true);
    setIsLoaded(false);
    setHasPrompt(false);
    setSemanticTerms([]);
    setLastCommand("");
    setProcessedWaveform(new Float32Array(0));
    setDspState(BASE_DSP_STATE);
    setExplanation("");

    if (isPlaying) {
      player.stop();
      setIsPlaying(false);
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    try {
      await player
        .load(url)
        .then(() => {
          setIsLoaded(true);
          setIsLoading(false);
          setOriginalFilename(file.name);
          const waveform = extractWaveformEnvelope(player.buffer);
          setOriginalWaveform(waveform);
        })
        .catch((error) => {
          throw error;
        });
    } catch (error) {
      try {
        await player.buffer.load(url);
        setIsLoaded(true);
        setIsLoading(false);
        const waveform = extractWaveformEnvelope(player.buffer);
        setOriginalWaveform(waveform);
      } catch (fallbackError) {
        setIsLoading(false);
        setIsLoaded(false);
        console.error("Failed to load audio into Tone.Player", fallbackError);
      }
    }
  }, [initializeAudio, isPlaying]);

  const playVersion = useCallback(async (version: "dry" | "processed") => {
    if (!playerRef.current) {
      await initializeAudio();
    }

    const player = playerRef.current;
    const selector = selectorRef.current;
    if (!player || !selector) return;

    await Tone.start();

    if (!player.buffer.loaded) {
      return;
    }

    if (version === "processed" && !hasPrompt) {
      return;
    }

    const targetFade = version === "dry" ? 0 : 1;
    selector.fade.rampTo(targetFade, RAMP_SECONDS, Tone.now());

    if (!isPlaying) {
      player.start();
      setIsPlaying(true);
      setPlaybackVersion(version);
    } else {
      if (playbackVersion === version) {
        player.stop();
        setIsPlaying(false);
        setPlaybackVersion(null);
      } else {
        setPlaybackVersion(version);
      }
    }
  }, [hasPrompt, initializeAudio, isPlaying, playbackVersion]);

  const playOriginal = useCallback(async () => {
    await playVersion("dry");
  }, [playVersion]);

  const playProcessed = useCallback(async () => {
    if (selectorRef.current) {
      console.log("Crossfade value before ramp:", selectorRef.current.fade.value);
    }
    await playVersion("processed");
  }, [playVersion]);

  const exportAudio = useCallback(
    async (format: "wav" | "mp3") => {
      if (!playerRef.current || !playerRef.current.buffer.loaded) return;

      setIsBouncing(true);
      try {
        const renderedBuffer = await renderAudio(playerRef.current.buffer, dspState);
        let blob: Blob;
        if (format === "wav") {
          blob = audioBufferToWavBlob(renderedBuffer);
        } else {
          blob = await audioBufferToMp3Blob(renderedBuffer);
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const baseName = originalFilename.replace(/\.[^/.]+$/, "");
        a.download = `${baseName}-processed.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Export failed:", error);
      } finally {
        setIsBouncing(false);
      }
    },
    [dspState, originalFilename]
  );

  const applySemanticCommand = useCallback(
    async (command: string) => {
      const json = (await SemanticProcessor.applyFromPrompt(command)) as LlmDspParams;
      console.log("Gemini DSP Params:", json);

      // Enforce minimum audible values if effects are requested but returned as 0
      if (json.distortion === 0) json.distortion = 0.05; // Subtle saturation
      if (json.bitrate === 0 || json.bitrate > 15) json.bitrate = 14; // Subtle crushing if "off" or "0"

      const nextDspState = SemanticProcessor.toDspState(json);

      applyDspState(nextDspState);
      setDspState(nextDspState);
      setExplanation(json.explanation);
      setSemanticTerms([command.trim()]);
      setLastCommand(command);
      setHasPrompt(command.trim().length > 0);
      setProcessedWaveform(applyWaveformTransform(originalWaveform, nextDspState));
    },
    [applyDspState, originalWaveform]
  );

  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      const dryAnalyser = dryAnalyserRef.current;
      const processedAnalyser = processedAnalyserRef.current;
      if (dryAnalyser) {
        const values = dryAnalyser.getValue();
        if (values instanceof Float32Array) {
          setDryFftValues(values);
        }
      }
      if (processedAnalyser) {
        const values = processedAnalyser.getValue();
        if (values instanceof Float32Array) {
          setProcessedFftValues(values);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(
    () => () => {
      playerRef.current?.dispose();
      processorGainRef.current?.dispose();
      selectorRef.current?.dispose();
      limiterRef.current?.dispose();
      dryAnalyserRef.current?.dispose();
      processedAnalyserRef.current?.dispose();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (bandChainRef.current) {
        Object.values(bandChainRef.current).forEach((node) => node.dispose());
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      isReady,
      isPlaying,
      isLoaded,
      isLoading,
      hasPrompt,
      playbackVersion,
      dryFftValues,
      processedFftValues,
      originalWaveform,
      processedWaveform,
      dspState,
      semanticTerms,
      lastCommand,
      explanation,
      isBouncing,
      loadAudio,
      playOriginal,
      playProcessed,
      applySemanticCommand,
      exportAudio,
    }),
    [
      isReady,
      isPlaying,
      isLoaded,
      isLoading,
      hasPrompt,
      playbackVersion,
      dryFftValues,
      processedFftValues,
      originalWaveform,
      processedWaveform,
      dspState,
      semanticTerms,
      lastCommand,
      explanation,
      isBouncing,
      loadAudio,
      playOriginal,
      playProcessed,
      applySemanticCommand,
      exportAudio,
    ]
  );

  return <AudioEngineContext.Provider value={value}>{children}</AudioEngineContext.Provider>;
}

export function useAudioEngine() {
  const ctx = useContext(AudioEngineContext);
  if (!ctx) {
    throw new Error("useAudioEngine must be used within AudioEngineProvider");
  }
  return ctx;
}
