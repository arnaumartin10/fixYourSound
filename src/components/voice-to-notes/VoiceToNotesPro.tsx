"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { WaveformCanvas } from "@/components/voice-to-notes/WaveformCanvas";
import { KeyDetectionCard } from "@/components/voice-to-notes/KeyDetectionCard";
import { MiniPianoRoll } from "@/components/voice-to-notes/MiniPianoRoll";
import { MelodySummaryTable } from "@/components/voice-to-notes/MelodySummaryTable";
import type {
  DetectedNoteSegment,
  VoiceToNotesQuantization,
} from "@/lib/voiceToNotes/types";
import type {
  VoiceToNotesWorkerInboundMessage,
  VoiceToNotesWorkerOutboundMessage,
  VoiceToNotesMidiExportOptions,
} from "@/lib/voiceToNotes/types";
import { generateMidiFileFromSegments } from "@/lib/voiceToNotes/midiExport";
import { Note } from "tonal";
import {
  Download,
  Music,
  Mic,
  UploadCloud,
  PauseCircle,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { clamp } from "@/lib/voiceToNotes/pitchUtils";
import type { VoiceToNotesWorkerInit as WorkerInit } from "@/lib/voiceToNotes/types";

const ANALYSIS_BUFFER_SIZE_SAMPLES = 2048;
const ANALYSIS_HOP_SIZE_SAMPLES = 256;

const VOICE_TO_NOTES_DEFAULTS = {
  minFrequencyHz: 55,
  maxFrequencyHz: 2000,
  silenceThresholdDb: -45,
  minFrameConfidence: 0.25,
  pitchCentsTolerance: 35,
  maxSilenceInsideNoteSec: 0.06,
  gapFillMs: 80,
  minNoteDurationSec: 0.12,
  bendDownsampleEveryFrames: 2,
  maxBendPointsPerNote: 64,
  bendCentsChangeThreshold: 6,
  framePostEvery: 2,
};

const WAVEFORM_SAMPLES = 2048;

type LatestFrame = {
  timeSec: number;
  midiInt: number | null;
  freqHz: number | null;
  confidence: number;
  rmsDb: number;
};

export function VoiceToNotesPro() {
  const [mode, setMode] = useState<"mic" | "upload">("mic");

  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [latestFrame, setLatestFrame] = useState<LatestFrame>({
    timeSec: 0,
    midiInt: null,
    freqHz: null,
    confidence: 0,
    rmsDb: -Infinity,
  });

  const [segments, setSegments] = useState<DetectedNoteSegment[]>([]);
  const [progress, setProgress] = useState<number>(0);

  // MIDI export controls
  const [bpm, setBpm] = useState(120);
  const [quantization, setQuantization] = useState<VoiceToNotesQuantization>("16");
  const [pitchBendRangeSemis, setPitchBendRangeSemis] = useState(2);
  const [includeExpressionCC7, setIncludeExpressionCC7] = useState(true);

  // Pitch analysis controls (affect segmentation)
  const [silenceThresholdDb, setSilenceThresholdDb] = useState<number>(
    VOICE_TO_NOTES_DEFAULTS.silenceThresholdDb
  );
  const [minFrameConfidence, setMinFrameConfidence] = useState<number>(
    VOICE_TO_NOTES_DEFAULTS.minFrameConfidence
  );
  const [pitchCentsTolerance, setPitchCentsTolerance] = useState<number>(
    VOICE_TO_NOTES_DEFAULTS.pitchCentsTolerance
  );
  const [gapFillMs, setGapFillMs] = useState<number>(VOICE_TO_NOTES_DEFAULTS.gapFillMs);

  const [maxSilenceInsideNoteSec, setMaxSilenceInsideNoteSec] = useState<number>(
    VOICE_TO_NOTES_DEFAULTS.maxSilenceInsideNoteSec
  );
  const [minNoteDurationSec, setMinNoteDurationSec] = useState<number>(
    VOICE_TO_NOTES_DEFAULTS.minNoteDurationSec
  );

  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const waveformSamplesRef = useRef<Float32Array>(new Float32Array(WAVEFORM_SAMPLES));

  const isCancelledRef = useRef(false);

  const latestNoteName = useMemo(() => {
    if (latestFrame.midiInt === null) return "—";
    return Note.fromMidi(latestFrame.midiInt) || "—";
  }, [latestFrame.midiInt]);

  const createWorker = () => {
    // Path is relative to this file.
    const url = new URL("../../workers/voiceToNotesPitchWorker.ts", import.meta.url);
    const worker = new Worker(url, { type: "module" });
    return worker;
  };

  const buildWorkerInit = (sampleRate: number, totalDurationSec?: number): WorkerInit => {
    const gapFillSec = Math.max(0, gapFillMs) / 1000;
    const init: WorkerInit = {
      type: "init",
      sampleRate,
      bufferSizeSamples: ANALYSIS_BUFFER_SIZE_SAMPLES,
      hopSizeSamples: ANALYSIS_HOP_SIZE_SAMPLES,

      minFrequencyHz: VOICE_TO_NOTES_DEFAULTS.minFrequencyHz,
      maxFrequencyHz: VOICE_TO_NOTES_DEFAULTS.maxFrequencyHz,
      silenceThresholdDb,
      minFrameConfidence,
      pitchCentsTolerance,
      maxSilenceInsideNoteSec,
      gapFillSec,
      minNoteDurationSec,

      bendDownsampleEveryFrames: VOICE_TO_NOTES_DEFAULTS.bendDownsampleEveryFrames,
      maxBendPointsPerNote: VOICE_TO_NOTES_DEFAULTS.maxBendPointsPerNote,
      bendCentsChangeThreshold: VOICE_TO_NOTES_DEFAULTS.bendCentsChangeThreshold,

      totalDurationSec,
      framePostEvery: VOICE_TO_NOTES_DEFAULTS.framePostEvery,
    };
    return init;
  };

  const stopAndCleanup = () => {
    isCancelledRef.current = true;
    try {
      scriptProcessorRef.current?.disconnect();
    } catch {
      // ignore
    }
    scriptProcessorRef.current = null;

    try {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    mediaStreamRef.current = null;

    try {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
      }
    } catch {
      // ignore
    }
    audioContextRef.current = null;

    try {
      workerRef.current?.terminate();
    } catch {
      // ignore
    }
    workerRef.current = null;
  };

  const pushWaveformSamples = (pcm: Float32Array) => {
    const wave = waveformSamplesRef.current;
    const len = pcm.length;
    if (len <= 0) return;

    if (len >= wave.length) {
      wave.set(pcm.subarray(len - wave.length));
      return;
    }

    // Shift left and append new samples.
    wave.copyWithin(0, len);
    wave.set(pcm, wave.length - len);
  };

  const startMic = async () => {
    setError(null);
    setMode("mic");
    setSegments([]);
    setProgress(0);
    setLatestFrame({
      timeSec: 0,
      midiInt: null,
      freqHz: null,
      confidence: 0,
      rmsDb: -Infinity,
    });

    stopAndCleanup();
    isCancelledRef.current = false;
    setIsRecording(true);
    setIsAnalyzing(true);

    const worker = createWorker();
    workerRef.current = worker;

    const onWorkerMessage = (event: MessageEvent) => {
      const msg = event.data as VoiceToNotesWorkerOutboundMessage;
      if (msg.type === "frame") {
        if (isCancelledRef.current) return;
        setLatestFrame({
          timeSec: msg.timeSec,
          midiInt: msg.midiInt,
          freqHz: msg.freqHz,
          confidence: msg.confidence,
          rmsDb: msg.rmsDb,
        });
      }
      if (msg.type === "progress") {
        if (isCancelledRef.current) return;
        if (msg.totalDurationSec) {
          setProgress(clamp(msg.analyzedTimeSec / msg.totalDurationSec, 0, 1));
        } else {
          setProgress(0);
        }
      }
      if (msg.type === "done") {
        if (isCancelledRef.current) return;
        setSegments(msg.segments);
        setIsAnalyzing(false);
        setIsRecording(false);
        stopAndCleanup();
      }
    };

    worker.onmessage = onWorkerMessage;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Deprecated ScriptProcessor is still the most straightforward way to get PCM without
      // an AudioWorklet setup.
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      const zeroGain = audioContext.createGain();
      zeroGain.gain.value = 0;

      source.connect(processor);
      processor.connect(zeroGain);
      zeroGain.connect(audioContext.destination);

      const sampleRate = audioContext.sampleRate;
      const init = buildWorkerInit(sampleRate);
      worker.postMessage(init as unknown as VoiceToNotesWorkerInboundMessage);

      waveformSamplesRef.current = new Float32Array(WAVEFORM_SAMPLES);

      processor.onaudioprocess = (e) => {
        if (isCancelledRef.current) return;
        const input = e.inputBuffer;
        const channels = input.numberOfChannels;
        const len = input.length;
        const mono = new Float32Array(len);

        for (let c = 0; c < channels; c += 1) {
          const data = input.getChannelData(c);
          for (let i = 0; i < len; i += 1) {
            mono[i] += data[i] / channels;
          }
        }

        pushWaveformSamples(mono);
        worker.postMessage({
          type: "audioChunk",
          pcm: mono,
        } as VoiceToNotesWorkerInboundMessage);
      };
    } catch (err) {
      setError("Microphone access failed. Please allow mic permissions and try again.");
      setIsRecording(false);
      setIsAnalyzing(false);
      stopAndCleanup();
      console.error(err);
    }
  };

  const stopMic = () => {
    setIsRecording(false);
    setIsAnalyzing(true);

    // Stop audio capture immediately; keep the worker alive so it can flush the last buffers.
    try {
      scriptProcessorRef.current?.disconnect();
    } catch {
      // ignore
    }
    scriptProcessorRef.current = null;

    try {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    mediaStreamRef.current = null;

    try {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
      }
    } catch {
      // ignore
    }
    audioContextRef.current = null;

    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({ type: "end" } as VoiceToNotesWorkerInboundMessage);
    }
  };

  const processUploadedFile = async (file: File) => {
    setError(null);
    setMode("upload");
    setSegments([]);
    setProgress(0);
    setIsAnalyzing(true);
    setIsRecording(false);

    stopAndCleanup();
    isCancelledRef.current = false;

    const worker = createWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data as VoiceToNotesWorkerOutboundMessage;
      if (msg.type === "frame") {
        if (isCancelledRef.current) return;
        setLatestFrame({
          timeSec: msg.timeSec,
          midiInt: msg.midiInt,
          freqHz: msg.freqHz,
          confidence: msg.confidence,
          rmsDb: msg.rmsDb,
        });
      }
      if (msg.type === "progress") {
        if (isCancelledRef.current) return;
        if (msg.totalDurationSec) {
          setProgress(clamp(msg.analyzedTimeSec / msg.totalDurationSec, 0, 1));
        }
      }
      if (msg.type === "done") {
        if (isCancelledRef.current) return;
        setSegments(msg.segments);
        setIsAnalyzing(false);
        setIsRecording(false);
        stopAndCleanup();
      }
    };

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const sampleRate = audioBuffer.sampleRate;
      const totalDurationSec = audioBuffer.duration;

      const mono = audioBuffer.getChannelData(0);

      // Static waveform preview (downsample to WAVEFORM_SAMPLES).
      const wave = new Float32Array(WAVEFORM_SAMPLES);
      const stride = Math.max(1, Math.floor(mono.length / WAVEFORM_SAMPLES));
      for (let i = 0; i < WAVEFORM_SAMPLES; i += 1) {
        const start = i * stride;
        const end = Math.min(mono.length, start + stride);
        let peak = 0;
        for (let j = start; j < end; j += 1) {
          const v = Math.abs(mono[j]);
          if (v > peak) peak = v;
        }
        wave[i] = peak * (mono[start] >= 0 ? 1 : -1);
      }
      waveformSamplesRef.current = wave;

      const init = buildWorkerInit(sampleRate, totalDurationSec);
      worker.postMessage(init as unknown as VoiceToNotesWorkerInboundMessage);

      // Wait a bit for worker init. The worker will ignore chunks if not ready anyway.
      await new Promise((r) => setTimeout(r, 50));

      const chunkSamples = 8192;
      for (let i = 0; i < mono.length; i += chunkSamples) {
        if (isCancelledRef.current) break;
        const chunk = mono.subarray(i, i + chunkSamples);
        worker.postMessage({
          type: "audioChunk",
          pcm: new Float32Array(chunk),
        } as VoiceToNotesWorkerInboundMessage);
      }

      worker.postMessage({ type: "end" } as VoiceToNotesWorkerInboundMessage);
    } catch (err) {
      setError("Could not process that audio file. Try a .wav or .mp3 with clear monophonic melody.");
      setIsAnalyzing(false);
      setIsRecording(false);
      stopAndCleanup();
      console.error(err);
    }
  };

  useEffect(() => {
    return () => {
      stopAndCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const midiExportOptions: VoiceToNotesMidiExportOptions = useMemo(
    () => ({
      bpm,
      quantization,
      pitchBendRangeSemis,
      channel: 1,
      includeExpressionCC7,
    }),
    [bpm, quantization, pitchBendRangeSemis, includeExpressionCC7]
  );

  const [isDownloading, setIsDownloading] = useState(false);

  const downloadMidi = async () => {
    if (!segments.length) return;
    setIsDownloading(true);
    setError(null);
    try {
      const bytes = generateMidiFileFromSegments(segments, midiExportOptions);
      const blob = new Blob([bytes as any], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fix-your-music-voice-to-notes-${Date.now()}.mid`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      setError("MIDI export failed. Try again or adjust quantization options.");
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="space-y-8">
        <header className="rounded-3xl border border-white/5 bg-[#0a0a0a]/60 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative z-10 flex items-start justify-between gap-6 flex-col md:flex-row">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-3 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <Music className="text-[#00f5d4]" size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00f5d4]">
                  Voice-to-Notes Pro
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
                Hummed Melody to Professional MIDI
              </h1>
              <p className="text-sm text-white/40 font-medium leading-relaxed max-w-2xl">
                Record or upload a melody. We detect the current note in real time,
                then export a quantized MIDI track with pitch bends.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMode("mic")}
                className={`px-5 py-3 rounded-2xl border font-black transition-all text-sm ${
                  mode === "mic"
                    ? "bg-[#00f5d4] text-black border-[#00f5d4]"
                    : "bg-white/5 text-white/60 border-white/10 hover:border-[#00f5d4]/40"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Mic size={16} />
                  Microphone
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={`px-5 py-3 rounded-2xl border font-black transition-all text-sm ${
                  mode === "upload"
                    ? "bg-[#00f5d4] text-black border-[#00f5d4]"
                    : "bg-white/5 text-white/60 border-white/10 hover:border-[#00f5d4]/40"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <UploadCloud size={16} />
                  Upload Audio
                </span>
              </button>
            </div>
          </div>
        </header>

        <section className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <section className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-56 h-56 bg-[#00f5d4]/10 blur-[70px] rounded-full" />
              <div className="relative z-10">
                <div className="text-sm font-black uppercase tracking-widest text-white/40 mb-2">
                  Live Note Detection
                </div>
                <div className="flex items-end justify-between gap-4 flex-col sm:flex-row">
                  <div>
                    <div className="text-5xl font-black tracking-tighter text-white drop-shadow">
                      {latestNoteName}
                    </div>
                    <div className="mt-2 text-sm text-white/50 font-medium">
                      {latestFrame.freqHz ? (
                        <>
                          {latestFrame.freqHz.toFixed(1)} Hz{" "}
                          <span className="text-white/30">
                            • {Math.round(latestFrame.confidence * 100)}% confidence
                          </span>
                        </>
                      ) : (
                        "Listening..."
                      )}
                    </div>
                  </div>
                  <div className="w-full sm:w-[220px]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                      Analysis Progress
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full border border-white/10 overflow-hidden">
                      <div
                        className="h-full bg-[#9d4edd] rounded-full transition-[width] duration-200"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-[10px] text-white/30">
                      {mode === "upload"
                        ? `${Math.round(progress * 100)}%`
                        : isRecording
                        ? "Recording"
                        : isAnalyzing
                        ? "Processing"
                        : "Idle"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-black uppercase tracking-widest text-white/40">
                  Waveform
                </div>
                <div className="text-xs text-white/30 font-medium">
                  {mode === "mic" ? "Live input" : "Upload preview"}
                </div>
              </div>
              <WaveformCanvas getSamples={() => waveformSamplesRef.current} />
            </section>

            <section className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl space-y-5">
              <div className="text-sm font-black uppercase tracking-widest text-white/40">
                Engine Controls
              </div>

              {mode === "mic" ? (
                <div className="space-y-3">
                  <div className="text-xs text-white/50 leading-relaxed">
                    Hum or sing a mostly monophonic melody (single pitch at a time) for best results.
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={() => void startMic()}
                        className="group relative flex items-center justify-center gap-2 bg-[#00f5d4] text-black px-6 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.2)] disabled:opacity-50"
                        disabled={isAnalyzing}
                      >
                        <PlayCircle size={18} />
                        Start Recording
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopMic}
                        className="group relative flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-4 rounded-2xl font-black text-lg transition-all border border-white/10 disabled:opacity-50"
                        disabled={!isRecording}
                      >
                        <PauseCircle size={18} />
                        Stop & Analyze
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <FileDropzone onFile={processUploadedFile} />
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs text-white/50 space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-white/30">
                    Silence Threshold (dBFS)
                  </span>
                  <input
                    type="range"
                    min={-70}
                    max={-25}
                    step={1}
                    value={silenceThresholdDb}
                    onChange={(e) => setSilenceThresholdDb(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="block text-white/70 font-medium">{silenceThresholdDb} dB</span>
                </label>
                <label className="text-xs text-white/50 space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-white/30">
                    Min Frame Confidence
                  </span>
                  <input
                    type="range"
                    min={0.05}
                    max={0.7}
                    step={0.01}
                    value={minFrameConfidence}
                    onChange={(e) => setMinFrameConfidence(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="block text-white/70 font-medium">{minFrameConfidence.toFixed(2)}</span>
                </label>
                <label className="text-xs text-white/50 space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-white/30">
                    Gap Fill (ms)
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={gapFillMs}
                    onChange={(e) => setGapFillMs(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="block text-white/70 font-medium">{gapFillMs} ms</span>
                </label>
                <label className="text-xs text-white/50 space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-white/30">
                    Pitch Tolerance (cents)
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={70}
                    step={1}
                    value={pitchCentsTolerance}
                    onChange={(e) => setPitchCentsTolerance(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="block text-white/70 font-medium">{pitchCentsTolerance} cents</span>
                </label>
              </div>

              <div className="pt-2 text-[11px] text-white/30 leading-relaxed">
                These analysis settings affect segmentation and confidence. Quantization & MIDI bend range
                can be tweaked after analysis without re-running detection.
              </div>
            </section>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <section className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
                <div>
                  <div className="text-sm font-black uppercase tracking-widest text-white/40">
                    MIDI Export
                  </div>
                  <div className="mt-2 text-xs text-white/50 leading-relaxed">
                    Quantizes to your selected grid, then schedules pitch bend from detected vibrato/glissando.
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                      BPM
                    </div>
                    <input
                      type="number"
                      min={40}
                      max={240}
                      step={1}
                      value={bpm}
                      onChange={(e) => setBpm(Number(e.target.value))}
                      className="w-28 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#00f5d4]/50"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void downloadMidi()}
                    disabled={!segments.length || isDownloading}
                    className="relative flex items-center justify-center gap-2 bg-[#00f5d4] text-black px-6 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    Download MIDI
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <label className="space-y-2 text-xs text-white/50">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-white/30">
                    Quantization
                  </span>
                  <div className="flex gap-3">
                    {(["8", "16"] as VoiceToNotesQuantization[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantization(q)}
                        className={`flex-1 px-4 py-3 rounded-xl border text-sm font-black transition-all ${
                          quantization === q
                            ? "bg-[#9d4edd] border-[#9d4edd] text-black shadow-[0_0_30px_rgba(157,78,237,0.25)]"
                            : "bg-white/5 border-white/10 text-white/60 hover:border-[#9d4edd]/40"
                        }`}
                      >
                        1/{q}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="space-y-2 text-xs text-white/50">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-white/30">
                    Pitch Bend Range (Semis)
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={pitchBendRangeSemis}
                    onChange={(e) => setPitchBendRangeSemis(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-white/70 font-medium">{pitchBendRangeSemis} semis</div>
                </label>
                <label className="space-y-2 text-xs text-white/50 sm:col-span-2">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-white/30">
                    Expression CC7
                  </span>
                  <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <span className="text-white/60 font-medium">
                      Add CC7 (volume/expression) using detected note loudness
                    </span>
                    <input
                      type="checkbox"
                      checked={includeExpressionCC7}
                      onChange={(e) => setIncludeExpressionCC7(e.target.checked)}
                      className="w-5 h-5 accent-[#00f5d4]"
                    />
                  </div>
                </label>
              </div>

              {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
            </section>

            <KeyDetectionCard segments={segments} />

            <MiniPianoRoll segments={segments} bpm={bpm} quantization={quantization} />

            <MelodySummaryTable segments={segments} />
          </div>
        </section>
      </div>
    </main>
  );
}

