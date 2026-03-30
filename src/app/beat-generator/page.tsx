"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Play,
  Square,
  Info,
  Music,
  Sparkles,
  Zap,
  Volume2,
  Loader,
} from "lucide-react";
import {
  createDrumKitSampler,
  clearSampleCache,
  triggerDrumSample,
  getSamplesLoadingProgress,
  type DrumGenre,
} from "@/lib/beatGenerator/SampleLoader";

interface BeatTrack {
  instrument: string;
  steps: boolean[];
}

interface BeatData {
  explanation: string;
  tempo: number;
  kitType: "trap" | "house" | "acoustic" | "dnb" | "techno" | "funk";
  drumKit: "rock" | "pop" | "electronic" | "latino" | "rap-trap";
  bars: 1 | 2 | 4;
  tracks: BeatTrack[];
}

interface DrumKitSampler {
  kick: Tone.Sampler;
  snare: Tone.Sampler;
  closedHat: Tone.Sampler;
  openHat: Tone.Sampler;
  isReady: boolean;
}

export default function BeatGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [intensity, setIntensity] = useState(50);
  const [complexity, setComplexity] = useState(50);
  const [drumKit, setDrumKit] = useState<"rock" | "pop" | "electronic" | "latino" | "rap-trap">("electronic");
  const [bars, setBars] = useState<1 | 2 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [beatData, setBeatData] = useState<BeatData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [samplesLoadingProgress, setSamplesLoadingProgress] = useState(0);
  const maxSteps = bars * 16;

  const drukitSamplerRef = useRef<DrumKitSampler | null>(null);
  const transportRef = useRef<Tone.Loop | null>(null);
  const samplerInitRef = useRef(false);

  // Initialize drum samplers based on user-selected drumKit and prompt analysis
  const initDrumSamplers = useCallback(
    async (userDrumKit: "rock" | "pop" | "electronic" | "latino" | "rap-trap", userPrompt: string) => {
      // If already initialized, return the cached kit
      if (samplerInitRef.current && drukitSamplerRef.current) {
        console.log("✓ Using cached drum kit sampler");
        return drukitSamplerRef.current;
      }

      if (Tone.context.state !== "running") {
        await Tone.start();
      }

      setIsLoadingSamples(true);
      setSamplesLoadingProgress(0);

      try {
        // Load samples from the selected genre folder
        const kit = await createDrumKitSampler(userDrumKit as DrumGenre, userPrompt);
        drukitSamplerRef.current = kit;
        samplerInitRef.current = true;
        setSamplesLoadingProgress(100);
        setIsLoadingSamples(false);
        return kit;
      } catch (error) {
        console.error("Failed to initialize drum samplers:", error);
        setIsLoadingSamples(false);
        alert("Failed to load high-quality samples. Using fallback sounds.");
        return null;
      }
    },
    []
  );

  // Trigger drum sample
  const triggerDrumSound = useCallback((instrument: string, time: number) => {
    const sampler = drukitSamplerRef.current;
    if (!sampler) return;

    switch (instrument) {
      case "Kick":
        triggerDrumSample(sampler.kick, time, "8n");
        break;
      case "Snare":
        triggerDrumSample(sampler.snare, time, "16n");
        break;
      case "ClosedHat":
        triggerDrumSample(sampler.closedHat, time, "32n");
        break;
      case "OpenHat":
        triggerDrumSample(sampler.openHat, time, "16n");
        break;
    }
  }, []);

  // Play beat
  const playBeat = useCallback(async () => {
    if (!beatData || isPlaying) return;

    try {
      // CRITICAL: Start AudioContext immediately on user gesture (before any async operations)
      if (Tone.context.state !== "running") {
        await Tone.start();
        console.log("✓ AudioContext started:", Tone.context.state);
      }

      // Now load samplers
      const samplers = await initDrumSamplers(drumKit, prompt);
      if (!samplers) {
        alert("Failed to load samples. Please try again.");
        return;
      }

      setIsPlaying(true);
      setCurrentStep(0);

      const totalSteps = beatData.tracks[0].steps.length;
      const stepDuration = (60 / beatData.tempo) * 0.25;

      // Cancel existing transport if any
      if (transportRef.current) {
        transportRef.current.stop();
        transportRef.current.dispose();
      }

      // Create new loop
      let step = 0;
      const loop = new Tone.Loop((time) => {
        // Update current step UI
        setCurrentStep(step % totalSteps);

        // Trigger drums for this step
        beatData.tracks.forEach((track) => {
          if (track.steps[step % totalSteps]) {
            triggerDrumSound(track.instrument, time);
          }
        });

        step++;
      }, stepDuration);

      loop.start(0);
      Tone.Transport.start();
      transportRef.current = loop;
    } catch (error) {
      console.error("Playback error:", error);
      setIsPlaying(false);
      alert("Failed to start playback. Please try again.");
    }
  }, [beatData, isPlaying, initDrumSamplers, triggerDrumSound, prompt, drumKit]);

  // Stop beat
  const stopBeat = useCallback(() => {
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel();

      if (transportRef.current) {
        transportRef.current.stop();
        transportRef.current.dispose();
        transportRef.current = null;
      }

      // Release all sounds
      if (drukitSamplerRef.current) {
        const { kick, snare, closedHat, openHat } = drukitSamplerRef.current;
        [kick, snare, closedHat, openHat].forEach((sampler) => {
          if (sampler) {
            try {
              sampler.triggerRelease?.();
            } catch (e) {
              // Ignore errors
            }
          }
        });
      }

      setIsPlaying(false);
      setCurrentStep(0);
    } catch (error) {
      console.error("Stop error:", error);
    }
  }, []);

  // Generate beat
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Please enter a beat prompt");
      return;
    }

    // Reset sampler initialization when generating new beat
    samplerInitRef.current = false;
    clearSampleCache();

    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-beat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          intensity,
          complexity,
          drumKit,
          bars,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate beat");
      }

      setBeatData(data);
      setCurrentStep(0);
      setShowInfo(true);
    } catch (error: any) {
      console.error("Failed to generate beat:", error);
      alert("Error generating beat. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle step
  const toggleStep = (trackIndex: number, stepIndex: number) => {
    if (!beatData) return;

    const newBeatData = { ...beatData };
    newBeatData.tracks = newBeatData.tracks.map((track, idx) => {
      if (idx === trackIndex) {
        const newSteps = [...track.steps];
        newSteps[stepIndex] = !newSteps[stepIndex];
        return { ...track, steps: newSteps };
      }
      return track;
    });

    setBeatData(newBeatData);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isPlaying) {
        stopBeat();
      }
      clearSampleCache();
    };
  }, [isPlaying, stopBeat]);

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black text-white mb-4 tracking-tighter flex items-center justify-center gap-3">
          <Zap className="text-[#00f5d4]" size={40} />
          Beat Generator
        </h1>
        <p className="text-white/50 text-lg max-w-2xl mx-auto">
          Generate AI-powered drum beats with a customizable 16-step sequencer
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Input Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Prompt Input */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 space-y-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 block mb-2">
                Beat Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'fast trap beat', 'slow reggaeton', 'progressive rock groove'"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00f5d4]/50 transition-colors resize-none h-24 text-sm"
              />
            </div>
          </div>

          {/* Intensity Slider */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 space-y-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 block mb-4">
                Intensity: <span className="text-[#00f5d4] font-bold">{intensity}</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00f5d4]"
              />
              <p className="text-xs text-white/40 mt-2">
                {intensity < 33 ? "Sparse" : intensity < 67 ? "Moderate" : "Dense"}
              </p>
            </div>
          </div>

          {/* Complexity Slider */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 space-y-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 block mb-4">
                Complexity: <span className="text-[#00f5d4] font-bold">{complexity}</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={complexity}
                onChange={(e) => setComplexity(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#9d4edd]"
              />
              <p className="text-xs text-white/40 mt-2">
                {complexity < 33 ? "Simple" : complexity < 67 ? "Balanced" : "Complex"}
              </p>
            </div>
          </div>

          {/* Drum Kit Selector */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 space-y-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 block mb-4">
                Drum Kit
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "electronic", label: "Electronic" },
                  { value: "pop", label: "Pop" },
                  { value: "rock", label: "Rock" },
                  { value: "latino", label: "Latino" },
                  { value: "rap-trap", label: "Rap/Trap" },
                ].map((kit) => (
                  <button
                    key={kit.value}
                    onClick={() => setDrumKit(kit.value as any)}
                    className={`py-3 px-3 rounded-xl font-bold text-xs transition-all ${
                      drumKit === kit.value
                        ? "bg-[#00f5d4] text-black shadow-[0_0_16px_rgba(0,245,212,0.3)]"
                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:border-[#00f5d4]/30"
                    }`}
                  >
                    {kit.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bars Selector */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 space-y-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#9d4edd]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 block mb-3">
                Measures: <span className="text-[#00f5d4] font-bold">{bars}</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 4].map((barOption) => (
                  <button
                    key={barOption}
                    onClick={() => setBars(barOption as 1 | 2 | 4)}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all ${
                      bars === barOption
                        ? "bg-[#00f5d4] text-black shadow-[0_0_16px_rgba(0,245,212,0.3)]"
                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {barOption === 1 ? "1 Bar (16)" : barOption === 2 ? "2 Bars (32)" : "4 Bars (64)"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/40 mt-2">
                {bars === 1 ? "Short & snappy" : bars === 2 ? "Medium pattern" : "Full arrangement"}
              </p>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="w-full group relative flex items-center justify-center gap-2 bg-[#00f5d4] text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.2)] disabled:opacity-50"
          >
            {isLoading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              <>
                <Sparkles size={18} />
                Generate Beat
              </>
            )}
          </button>

          {/* Playback Controls */}
          <AnimatePresence>
            {beatData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6 space-y-4 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#9d4edd]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative z-10">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">
                    Playback
                  </h3>

                  {/* Loading Samples Status */}
                  {isLoadingSamples && (
                    <div className="mb-4 p-3 rounded-2xl bg-[#00f5d4]/10 border border-[#00f5d4]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader size={14} className="text-[#00f5d4] animate-spin" />
                        <span className="text-xs font-bold text-[#00f5d4]">
                          Loading High-Quality Samples...
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[#00f5d4]"
                          initial={{ width: 0 }}
                          animate={{ width: `${samplesLoadingProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-[10px] text-white/40 mt-2">
                        {samplesLoadingProgress}% - {["Resolving samples...", "Pre-buffering audio...", "Almost ready..."][Math.floor(samplesLoadingProgress / 40)] || "Finalizing..."}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={isPlaying ? stopBeat : playBeat}
                    disabled={isLoadingSamples}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-sm transition-all ${
                      isPlaying
                        ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                        : isLoadingSamples
                          ? "bg-white/10 text-white/40 border border-white/10 cursor-not-allowed"
                          : "bg-[#00f5d4] text-black border border-[#00f5d4] hover:scale-[1.02]"
                    }`}
                  >
                    {isLoadingSamples ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Loading Samples...
                      </>
                    ) : isPlaying ? (
                      <>
                        <Square size={16} />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Play
                      </>
                    )}
                  </button>

                  {/* Metadata */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Tempo:</span>
                      <span className="text-[#00f5d4] font-bold">
                        {beatData.tempo} BPM
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Kit Type:</span>
                      <span className="text-[#00f5d4] font-bold capitalize">
                        {beatData.kitType}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Kit Genre:</span>
                      <span className="text-[#00f5d4] font-bold capitalize">
                        {drumKit}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Tracks:</span>
                      <span className="text-[#00f5d4] font-bold">
                        {beatData.tracks.length}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Sequencer & Explanation */}
        <div className="lg:col-span-2 space-y-6">
          {/* 16-Step Sequencer */}
          <AnimatePresence>
            {beatData ? (
              <motion.div
                key="sequencer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6 overflow-x-auto"
              >
                <h3 className="text-sm font-black text-white/50 uppercase tracking-widest mb-6">
                  {beatData.tracks[0].steps.length}-Step Sequencer ({beatData.bars} Bar{beatData.bars > 1 ? "s" : ""})
                </h3>

                <div className="space-y-4">
                  {beatData.tracks.map((track, trackIdx) => (
                    <div key={track.instrument} className="space-y-2">
                      {/* Track label */}
                      <div className="flex items-center gap-3">
                        <div className="w-24 text-sm font-bold text-white/60">
                          {track.instrument}
                        </div>

                        {/* Steps grid with bar dividers */}
                        <div className="flex relative flex-1">
                          {track.steps.map((isActive, stepIdx) => {
                            const isBarStart = stepIdx % 16 === 0 && stepIdx > 0;
                            return (
                              <div key={stepIdx} className="flex-1 relative">
                                {isBarStart && (
                                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20" />
                                )}
                                <button
                                  onClick={() => toggleStep(trackIdx, stepIdx)}
                                  className={`w-full h-12 rounded-lg transition-all duration-200 border ${
                                    isActive
                                      ? "bg-[#00f5d4] border-[#00f5d4] shadow-[0_0_12px_rgba(0,245,212,0.4)]"
                                      : "bg-white/5 border-white/10 hover:bg-white/10"
                                  } ${
                                    currentStep === stepIdx && isPlaying
                                      ? "ring-2 ring-red-500 ring-offset-2 ring-offset-[#0a0a0a]"
                                      : ""
                                  }`}
                                  title={`${track.instrument} - Step ${stepIdx + 1}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Step numbers every 4 steps */}
                      {trackIdx === 0 && (
                        <div className="flex items-center gap-3">
                          <div className="w-24" />
                          <div className="flex gap-0.5 flex-1 text-[10px] text-white/30">
                            {Array.from({ length: beatData.tracks[0].steps.length / 4 }).map((_, i) => (
                              <div
                                key={i}
                                className="flex-1 text-center"
                                style={{ marginLeft: i === 0 ? 0 : "calc(25% - 2px)" }}
                              >
                                {i * 4 + 1}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-white/5 flex gap-4 text-[10px] text-white/40">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#00f5d4]" />
                    Active Step
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded ring-2 ring-red-500 bg-white/5" />
                    Current Playhead
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-12 flex flex-col items-center justify-center min-h-[400px]"
              >
                <Music className="text-white/20 mb-4" size={48} />
                <p className="text-white/40 text-center text-sm">
                  Enter a beat prompt and click &quot;Generate Beat&quot; to see the sequencer
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explanation */}
          <AnimatePresence>
            {beatData && showInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-br from-[#9d4edd]/10 to-transparent rounded-3xl border border-[#9d4edd]/20 p-6 relative overflow-hidden group"
              >
                <button
                  onClick={() => setShowInfo(false)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                  ✕
                </button>

                <div className="flex gap-3">
                  <Info className="text-[#9d4edd] flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2">Beat Explanation</h3>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {beatData.explanation}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
