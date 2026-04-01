"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Music,
  Zap,
  Activity,
  Volume2,
  Sparkles,
  AudioLines,
  Hand,
  RotateCcw,
  Info,
} from "lucide-react";
import { HelpButton } from "@/components/HelpButton";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  bpm: number;
  key: string;
  scale: string;
  peakDb: number;
  rmsDb: number;
  loudnessLabel: string;
  loudnessColor: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Chromagram-based key detection using the Krumhansl-Schmuckler algorithm */
function detectKey(audioBuffer: AudioBuffer): { key: string; scale: string } {
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  // Krumhansl-Schmuckler key profiles
  const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const fftSize = 4096;

  // Build a chromagram by sampling several windows across the track
  const chroma = new Float32Array(12).fill(0);
  const step = Math.floor(channelData.length / 20);

  for (let s = 0; s < 20; s++) {
    const offset = s * step;
    const frame = channelData.slice(offset, offset + fftSize);

    // Simple DFT over the relevant frequency bins
    for (let noteIdx = 0; noteIdx < 12; noteIdx++) {
      // Map chroma bin to frequency (A4 = 440 Hz across 5 octaves)
      for (let octave = 2; octave <= 6; octave++) {
        const freq = 440 * Math.pow(2, (noteIdx - 9 + (octave - 4) * 12) / 12);
        const k = Math.round((freq * fftSize) / sampleRate);
        if (k <= 0 || k >= fftSize / 2) continue;

        let re = 0, im = 0;
        for (let n = 0; n < Math.min(fftSize, frame.length); n++) {
          const angle = (2 * Math.PI * k * n) / fftSize;
          re += frame[n] * Math.cos(angle);
          im -= frame[n] * Math.sin(angle);
        }
        chroma[noteIdx] += Math.sqrt(re * re + im * im);
      }
    }
  }

  // Normalize
  const maxChroma = Math.max(...chroma);
  const normChroma = maxChroma > 0 ? chroma.map((v) => v / maxChroma) : chroma;

  // Correlate against all 24 keys
  let bestScore = -Infinity;
  let bestKey = "C";
  let bestScale = "Major";

  for (let root = 0; root < 12; root++) {
    const majorScore = pearson(rotateArray(MAJOR_PROFILE, root), normChroma);
    const minorScore = pearson(rotateArray(MINOR_PROFILE, root), normChroma);

    if (majorScore > bestScore) { bestScore = majorScore; bestKey = NOTE_NAMES[root]; bestScale = "Major"; }
    if (minorScore > bestScore) { bestScore = minorScore; bestKey = NOTE_NAMES[root]; bestScale = "Minor"; }
  }

  return { key: bestKey, scale: bestScale };
}

function rotateArray(arr: number[], steps: number): number[] {
  const n = arr.length;
  return arr.map((_, i) => arr[(i + steps) % n]);
}

function pearson(a: number[], b: Float32Array | number[]): number {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = (b as number[]).reduce((s: number, v: number) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const ea = a[i] - meanA, eb = (b as number[])[i] - meanB;
    num += ea * eb; da += ea * ea; db += eb * eb;
  }
  return da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db);
}

/** BPM detection: autocorrelation on the onset envelope */
function detectBPM(audioBuffer: AudioBuffer): number {
  const sampleRate = audioBuffer.sampleRate;
  const data = audioBuffer.getChannelData(0);
  const hopSize = 512;
  const frameLen = 1024;

  // Build onset envelope (HFC - High Frequency Content)
  const envelope: number[] = [];
  for (let i = 0; i + frameLen < data.length; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < frameLen; j++) {
      energy += data[i + j] * data[i + j] * (j + 1); // HFC weighting
    }
    envelope.push(Math.sqrt(energy / frameLen));
  }

  // Half-wave rectified first-difference (novelty function)
  const novelty: number[] = [0];
  for (let i = 1; i < envelope.length; i++) {
    const diff = envelope[i] - envelope[i - 1];
    novelty.push(Math.max(0, diff));
  }

  // Autocorrelation in BPM range 60–200
  const framesPerSec = sampleRate / hopSize;
  const bpmRange = [60, 200];
  const lagMin = Math.floor((60 / bpmRange[1]) * framesPerSec);
  const lagMax = Math.ceil((60 / bpmRange[0]) * framesPerSec);

  let bestLag = lagMin;
  let bestCorr = -Infinity;
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let corr = 0;
    for (let i = 0; i + lag < novelty.length; i++) {
      corr += novelty[i] * novelty[i + lag];
    }
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }

  const rawBpm = (60 / bestLag) * framesPerSec;

  // Snap to common BPM values
  const commonBpms = [60, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 128, 130, 135, 140, 145, 150, 160, 170, 174, 175, 180];
  return commonBpms.reduce((prev, curr) =>
    Math.abs(curr - rawBpm) < Math.abs(prev - rawBpm) ? curr : prev
  );
}

/** Loudness metrics */
function getLoudness(audioBuffer: AudioBuffer): { peakDb: number; rmsDb: number; label: string; color: string } {
  const data = audioBuffer.getChannelData(0);
  let peak = 0, sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
    sumSq += data[i] * data[i];
  }
  const rms = Math.sqrt(sumSq / data.length);
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;

  let label = "Too Quiet";
  let color = "#60a5fa"; // blue
  if (rmsDb > -6) { label = "Too Loud / Clipping Risk"; color = "#f87171"; }
  else if (rmsDb > -12) { label = "Radio Ready"; color = "#4ade80"; }
  else if (rmsDb > -18) { label = "Good Mix Level"; color = "#00f5d4"; }
  else if (rmsDb > -24) { label = "Moderate Level"; color = "#facc15"; }

  return { peakDb: Math.round(peakDb * 10) / 10, rmsDb: Math.round(rmsDb * 10) / 10, label, color };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const Tooltip = ({ text }: { text: string }) => (
  <div className="relative group/tip inline-flex ml-1.5">
    <Info size={12} className="text-white/20 hover:text-white/60 transition-colors cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-[11px] text-white/60 w-48 text-center opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed shadow-xl">
      {text}
    </div>
  </div>
);

const MetricCard = ({
  icon: Icon,
  label,
  value,
  unit,
  subtext,
  color,
  tooltip,
  animate: shouldAnimate = false,
}: {
  icon: any;
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  color?: string;
  tooltip: string;
  animate?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6 relative overflow-hidden group hover:border-white/10 transition-all duration-500"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} style={{ color: color || "#00f5d4" }} />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</span>
        <Tooltip text={tooltip} />
      </div>
      <div className="flex items-baseline gap-2">
        <motion.span
          key={String(value)}
          initial={shouldAnimate ? { scale: 1.2, opacity: 0 } : {}}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-black tracking-tighter"
          style={{ color: color || "#00f5d4" }}
        >
          {value}
        </motion.span>
        {unit && <span className="text-sm text-white/30 font-bold">{unit}</span>}
      </div>
      {subtext && <p className="text-xs text-white/30 mt-2 font-medium">{subtext}</p>}
    </div>
  </motion.div>
);

const LoudnessMeter = ({ rmsDb }: { rmsDb: number }) => {
  // Map rmsDb (typically -60 to 0) to a 0-100 progress
  const pct = Math.max(0, Math.min(100, ((rmsDb + 60) / 60) * 100));
  const zones = [
    { label: "Low", range: "< -24 dB", color: "#60a5fa", pct: 40 },
    { label: "Good", range: "-24 to -12 dB", color: "#00f5d4", pct: 30 },
    { label: "Hot", range: "-12 to -6 dB", color: "#4ade80", pct: 15 },
    { label: "Clip", range: "> -6 dB", color: "#f87171", pct: 15 },
  ];

  return (
    <div className="space-y-2">
      <div className="relative h-4 w-full rounded-full overflow-hidden bg-white/5">
        <div className="absolute inset-0 flex">
          {zones.map((z) => (
            <div key={z.label} style={{ width: `${z.pct}%`, background: z.color + "40" }} />
          ))}
        </div>
        <motion.div
          className="absolute top-0 bottom-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, #60a5fa, #00f5d4, #4ade80, #f87171)`,
            width: `${pct}%`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          initial={{ left: "0%" }}
          animate={{ left: `calc(${pct}% - 6px)` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/20">
        {zones.map((z) => (
          <span key={z.label}>{z.label}</span>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SongAnalyzer() {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [aiTip, setAiTip] = useState<string>("");
  const [isLoadingTip, setIsLoadingTip] = useState(false);

  // Tap Tempo state
  const [tapBpm, setTapBpm] = useState<number | null>(null);
  const [isLedOn, setIsLedOn] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimestamps = useRef<number[]>([]);
  const ledTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ledIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── AI Tip fetcher ────────────────────────────────────────────────────────
  const fetchAiTip = useCallback(async (bpm: number, key: string, scale: string) => {
    setIsLoadingTip(true);
    setAiTip("");
    try {
      const res = await fetch("/api/song-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bpm, key, scale }),
      });
      const data = await res.json();
      setAiTip(data.tip || "");
    } catch {
      setAiTip("Unable to fetch AI insight right now. Check your connection and try again.");
    } finally {
      setIsLoadingTip(false);
    }
  }, []);

  // ── File Analysis ─────────────────────────────────────────────────────────
  const analyzeFile = useCallback(
    async (file: File) => {
      if (!file.type.match(/(audio\/mpeg|audio\/wav|audio\/mp3|audio\/wave)/)) {
        alert("Please upload an MP3 or WAV file.");
        return;
      }
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setResult(null);
      setAiTip("");
      setFileName(file.name);

      try {
        // We use ArrayBuffer on the browser
        const arrayBuffer = await file.arrayBuffer();
        setAnalysisProgress(20);

        const audioCtx = new AudioContext();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        setAnalysisProgress(40);

        const bpm = detectBPM(audioBuffer);
        setAnalysisProgress(65);

        const { key, scale } = detectKey(audioBuffer);
        setAnalysisProgress(82);

        const { peakDb, rmsDb, label: loudnessLabel, color: loudnessColor } = getLoudness(audioBuffer);
        setAnalysisProgress(100);

        audioCtx.close();

        const resultData: AnalysisResult = { bpm, key, scale, peakDb, rmsDb, loudnessLabel, loudnessColor };
        setResult(resultData);
      } catch (e) {
        console.error("Analysis failed:", e);
        alert("Could not analyze this file. Please try another audio file.");
      } finally {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }
    },
    [fetchAiTip]
  );

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) analyzeFile(file);
  };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyzeFile(file);
  };

  // ── Tap Tempo ─────────────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    const now = performance.now();
    const timestamps = tapTimestamps.current;
    timestamps.push(now);

    // Keep last 8 taps for sliding window
    if (timestamps.length > 8) timestamps.shift();
    setTapCount(timestamps.length);

    if (timestamps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }
      // Filter out intervals > 3 seconds (user paused)
      const valid = intervals.filter((iv) => iv < 3000);
      if (valid.length >= 1) {
        const avgInterval = valid.reduce((a, b) => a + b, 0) / valid.length;
        const bpm = Math.round(60000 / avgInterval);
        const clampedBpm = Math.max(40, Math.min(280, bpm));
        setTapBpm(clampedBpm);

        // Flash LED and set interval pulse
        if (ledIntervalRef.current) clearInterval(ledIntervalRef.current);
        if (ledTimeoutRef.current) clearTimeout(ledTimeoutRef.current);

        setIsLedOn(true);
        ledTimeoutRef.current = setTimeout(() => setIsLedOn(false), 80);

        // Start interval pulse
        ledIntervalRef.current = setInterval(() => {
          setIsLedOn(true);
          ledTimeoutRef.current = setTimeout(() => setIsLedOn(false), 80);
        }, avgInterval);
      }
    }

    // Reset if no tap for 3 seconds
    if (ledTimeoutRef.current) clearTimeout(ledTimeoutRef.current);
    ledTimeoutRef.current = setTimeout(() => {
      if (ledIntervalRef.current) clearInterval(ledIntervalRef.current);
    }, 3000);
  }, []);

  const resetTap = () => {
    tapTimestamps.current = [];
    setTapBpm(null);
    setTapCount(0);
    setIsLedOn(false);
    if (ledIntervalRef.current) clearInterval(ledIntervalRef.current);
    if (ledTimeoutRef.current) clearTimeout(ledTimeoutRef.current);
  };

  // Spacebar listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleTap]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (ledIntervalRef.current) clearInterval(ledIntervalRef.current);
      if (ledTimeoutRef.current) clearTimeout(ledTimeoutRef.current);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#00f5d4]/30">
      {/* Background glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,245,212,0.06)_0%,transparent_60%)] pointer-events-none" />

      <div className="container mx-auto px-6 py-12 max-w-7xl relative z-10">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00f5d4]/10 rounded-full border border-[#00f5d4]/20 text-[10px] font-black uppercase tracking-widest text-[#00f5d4] mb-6">
            <AudioLines size={12} />
            Song Analyzer
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9] mb-4">
            DECODE YOUR<br />
            <span className="text-[#00f5d4] drop-shadow-[0_0_40px_rgba(0,245,212,0.4)]">TRACK&apos;S DNA</span>
          </h1>
          <p className="text-lg text-white/40 max-w-2xl font-medium leading-relaxed">
            Upload any audio file to instantly reveal its BPM, Key, and Loudness. Use Tap Tempo to find the
            rhythm in your head, then get AI-powered producer insights tailored to your music.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-white/30">
              <span className="w-2 h-2 bg-[#00f5d4] rounded-full" />
              Step 1: Upload audio
            </span>
            <span className="flex items-center gap-1.5 text-white/30">
              <span className="w-2 h-2 bg-white/30 rounded-full" />
              Step 2: View analysis
            </span>
            <span className="flex items-center gap-1.5 text-white/30">
              <span className="w-2 h-2 bg-white/30 rounded-full" />
              Step 3: Get AI tips
            </span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8">

          {/* ── LEFT COLUMN: Upload + Tap Tempo ── */}
          <div className="lg:col-span-5 space-y-6">

            {/* File Upload Drop Zone */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
                  ${isDragging
                    ? "border-[#00f5d4] bg-[#00f5d4]/5 shadow-[0_0_40px_rgba(0,245,212,0.15)]"
                    : "border-white/10 bg-[#0a0a0a] hover:border-white/20 hover:bg-white/[0.02]"
                  }`}
              >
                <input ref={fileInputRef} type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" className="hidden" onChange={onFileChange} />

                <div className="p-10 flex flex-col items-center gap-5 text-center">
                  <motion.div
                    animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                    className={`w-20 h-20 rounded-3xl flex items-center justify-center border transition-all duration-300 ${
                      isDragging ? "bg-[#00f5d4]/20 border-[#00f5d4]/50 text-[#00f5d4]" : "bg-white/5 border-white/10 text-white/30"
                    }`}
                  >
                    <Upload size={36} />
                  </motion.div>

                  {isAnalyzing ? (
                    <div className="space-y-3 w-full">
                      <p className="text-sm font-black text-white/60 uppercase tracking-widest">Analyzing...</p>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#00f5d4] to-[#9d4edd] rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: `${analysisProgress}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                      <p className="text-xs text-white/30">{analysisProgress}%</p>
                    </div>
                  ) : fileName ? (
                    <div className="space-y-1">
                      <p className="text-sm font-black text-[#00f5d4]">✓ {fileName}</p>
                      <p className="text-xs text-white/30">Click or drop to analyze a new file</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-base font-black text-white/60">Drop your track here</p>
                      <p className="text-sm text-white/20">MP3 or WAV • Click to browse</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Tap Tempo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#9d4edd]/5 to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Hand size={14} className="text-[#9d4edd]" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-white/30">Tap Tempo</h2>
                  </div>
                  <button
                    onClick={resetTap}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-white/60 transition-all"
                    title="Reset tap tempo"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>

                {/* LED + BPM Display */}
                <div className="flex items-center gap-6 mb-6">
                  {/* Blinking LED */}
                  <motion.div
                    animate={isLedOn
                      ? { scale: [1, 1.3, 1], opacity: [1, 1, 1] }
                      : { scale: 1, opacity: 0.3 }}
                    transition={{ duration: 0.1 }}
                    className="relative flex-shrink-0"
                  >
                    <div className={`w-8 h-8 rounded-full transition-all duration-75 ${
                      isLedOn
                        ? "bg-[#9d4edd] shadow-[0_0_20px_rgba(157,78,237,0.9),0_0_40px_rgba(157,78,237,0.4)]"
                        : "bg-[#9d4edd]/20"
                    }`} />
                    {isLedOn && (
                      <div className="absolute inset-0 rounded-full bg-[#9d4edd]/30 animate-ping" />
                    )}
                  </motion.div>
                  
                  <div>
                    <div className="text-5xl font-black tracking-tighter text-white">
                      {tapBpm ?? "--"}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-1">BPM</div>
                  </div>
                </div>

                {/* Tap Button */}
                <motion.button
                  id="tap-tempo-button"
                  onClick={handleTap}
                  whileTap={{ scale: 0.94 }}
                  className="w-full py-5 rounded-2xl bg-[#9d4edd]/15 hover:bg-[#9d4edd]/25 border border-[#9d4edd]/30 hover:border-[#9d4edd]/60 text-[#9d4edd] font-black text-lg tracking-wide transition-all duration-150 active:bg-[#9d4edd]/40 shadow-[0_0_20px_rgba(157,78,237,0.1)] hover:shadow-[0_0_30px_rgba(157,78,237,0.2)]"
                >
                  TAP {tapCount > 0 && <span className="text-sm font-medium opacity-60">({tapCount} taps)</span>}
                </motion.button>

                <p className="text-center text-[10px] text-white/20 font-bold mt-3 uppercase tracking-widest">
                  Or press <kbd className="px-2 py-0.5 bg-white/10 rounded text-white/40 font-mono">Space</kbd>
                </p>
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN: Metrics + AI ── */}
          <div className="lg:col-span-7 space-y-6">
            <AnimatePresence>
              {result && (
                <motion.div
                  key="metrics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* BPM + Key row */}
                  <div className="grid grid-cols-2 gap-5">
                    <MetricCard
                      icon={Zap}
                      label="BPM"
                      value={result.bpm}
                      subtext="Beats Per Minute — the tempo of your track"
                      color="#00f5d4"
                      tooltip="BPM (Beats Per Minute) tells you how fast your track is. 60=slow ballad, 128=dance floor, 174=drum & bass."
                      animate
                    />
                    <MetricCard
                      icon={Music}
                      label="Key & Scale"
                      value={result.key}
                      unit={result.scale}
                      subtext={`The tonal center of your track`}
                      color="#9d4edd"
                      tooltip="The Key is the home note your track revolves around. Major sounds bright & happy. Minor sounds dark & emotional."
                      animate
                    />
                  </div>

                  {/* Loudness Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6 group hover:border-white/10 transition-all duration-500"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Volume2 size={14} style={{ color: result.loudnessColor }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Loudness Meter</span>
                        <Tooltip text="Loudness tells you if your track is too quiet, too loud, or in the sweet spot for streaming platforms and radio." />
                      </div>
                      <motion.span
                        key={result.loudnessLabel}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xs font-black px-3 py-1 rounded-full border"
                        style={{ color: result.loudnessColor, borderColor: result.loudnessColor + "40", background: result.loudnessColor + "15" }}
                      >
                        {result.loudnessLabel}
                      </motion.span>
                    </div>

                    <LoudnessMeter rmsDb={result.rmsDb} />

                    <div className="grid grid-cols-2 gap-4 mt-5">
                      <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1 flex items-center gap-1">
                          Peak Level <Tooltip text="The absolute loudest moment in your track. Should stay below 0 dBFS to avoid digital clipping." />
                        </div>
                        <p className="text-2xl font-black" style={{ color: result.peakDb > -3 ? "#f87171" : "#00f5d4" }}>
                          {result.peakDb} <span className="text-sm text-white/30 font-bold">dBFS</span>
                        </p>
                      </div>
                      <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1 flex items-center gap-1">
                          RMS Level <Tooltip text="Average loudness of your track. Streaming platforms target around -14 LUFS (roughly -18 to -12 dBFS RMS)." />
                        </div>
                        <p className="text-2xl font-black" style={{ color: result.loudnessColor }}>
                          {result.rmsDb} <span className="text-sm text-white/30 font-bold">dBFS</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Placeholder when no analysis yet */}
              {!result && !isAnalyzing && (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-12 flex flex-col items-center justify-center text-center min-h-[320px] gap-6"
                >
                  <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                    <Activity size={36} className="text-white/10" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white/20">No track analyzed yet</p>
                    <p className="text-sm text-white/10 mt-1">Upload a file or use Tap Tempo to get started</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Smart Advice Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-7 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-48 bg-[#9d4edd]/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-32 bg-[#00f5d4]/5 blur-[60px] rounded-full -ml-10 -mb-10 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#9d4edd]/20 border border-[#9d4edd]/30 flex items-center justify-center">
                      <Sparkles size={14} className="text-[#9d4edd]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Smart Advice</h3>
                      <p className="text-[10px] text-white/30 font-medium">AI Insights</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      const bpmToUse = result?.bpm || tapBpm;
                      if (!bpmToUse) {
                        alert("Please analyze a track or tap a tempo first.");
                        return;
                      }
                      fetchAiTip(bpmToUse, result?.key || "C", result?.scale || "Major");
                    }}
                    disabled={isLoadingTip}
                    className="px-4 py-2 rounded-xl bg-[#9d4edd]/10 hover:bg-[#9d4edd]/20 border border-[#9d4edd]/30 text-[#9d4edd] text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(157,78,237,0.15)] disabled:opacity-50"
                  >
                    Generate Advice
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {isLoadingTip && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 py-4"
                    >
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                            className="w-2 h-2 rounded-full bg-[#9d4edd]/60"
                          />
                        ))}
                      </div>
                      <span className="text-sm text-white/30 font-medium">Getting producer insights...</span>
                    </motion.div>
                  )}

                  {aiTip && !isLoadingTip && (
                    <motion.p
                      key={aiTip}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="text-base text-white/70 leading-relaxed font-medium"
                    >
                      &ldquo;{aiTip}&rdquo;
                    </motion.p>
                  )}

                  {!aiTip && !isLoadingTip && (
                    <motion.p
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-white/20 italic"
                    >
                      Analyze a track or tap a tempo, then click Generate Advice to receive personalized producer insights.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        <HelpButton 
          toolName="Song Analyzer"
          content={{
            what: "Song Analyzer decodes the technical DNA of any audio file. It detects BPM (tempo), Musical Key, Scale, and Loudness (peak/RMS) levels.",
            why: "Use it to understand any track's fundamental properties. Essential for key matching, tempo synchronization, and understanding mixing decisions in reference tracks.",
            how: "1. Drag & drop or click to upload an audio file\n2. Wait for analysis to complete\n3. View BPM, Key, Scale, and Loudness results\n4. Use Tap Tempo to find rhythm by tapping\n5. Click 'Generate Advice' for AI production tips",
            tips: [
              "Works with MP3, WAV, FLAC, and other common formats",
              "Use Tap Tempo if you can't analyze a full file",
              "The key detection uses chromagram analysis for accuracy",
              "AI tips give genre-specific production advice"
            ],
            productionTip: "Match the detected key when writing melodies or choosing chord progressions. Use BPM as a starting point, adjust to fit your track. The loudness meter helps identify if you need compression or limiting."
          }}
        />
      </div>
    </div>
  );
}
