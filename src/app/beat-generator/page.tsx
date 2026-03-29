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
} from "lucide-react";

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
  const maxSteps = bars * 16;

  const drumSynths = useRef<{
    kick: Tone.MembraneSynth | null;
    snare: Tone.NoiseSynth | null;
    closedHat: Tone.MetalSynth | null;
    openHat: Tone.MetalSynth | null;
  }>({
    kick: null,
    snare: null,
    closedHat: null,
    openHat: null,
  });

  const transportRef = useRef<Tone.Loop | null>(null);
  const synthInitRef = useRef(false);
  const kitTypeRef = useRef<BeatData["kitType"]>("house");

  // Create drum kit configuration based on user-selected drumKit
  const createDrumKit = useCallback(
    (userDrumKit: "rock" | "pop" | "electronic" | "latino" | "rap-trap") => {
      if (Tone.context.state !== "running") {
        return null;
      }

      const configs = {
        "rap-trap": {
          // 808-style long decay kick, crisp snare
          kick: () =>
            new Tone.MembraneSynth({
              pitchDecay: 0.2, // Long pitch drop like 808
              octaves: 8,
              oscillator: { type: "sine" },
              envelope: {
                attack: 0.001,
                decay: 1,
                sustain: 0.1,
                release: 1.5,
              },
            })
              .toDestination(),
          snare: () =>
            new Tone.NoiseSynth({
              envelope: {
                attack: 0.003,
                decay: 0.18,
                sustain: 0,
                release: 0.02,
              },
            })
              .toDestination(),
          closedHat: () =>
            new Tone.MetalSynth({
              envelope: { attack: 0.0005, decay: 0.07, release: 0.005 },
              harmonicity: 15,
              resonance: 1100,
            })
              .toDestination(),
          openHat: () =>
            new Tone.MetalSynth({
              envelope: { attack: 0.0005, decay: 0.3, release: 0.05 },
              harmonicity: 14,
              resonance: 1050,
            })
              .toDestination(),
        },
        rock: {
          // Punchy kick, lower-pitched snare
          kick: () =>
            new Tone.MembraneSynth({
              pitchDecay: 0.06,
              octaves: 5,
              oscillator: { type: "sine" },
              envelope: {
                attack: 0.001,
                decay: 0.35,
                sustain: 0,
                release: 0.9,
              },
            })
              .toDestination(),
          snare: () =>
            new Tone.NoiseSynth({
              envelope: {
                attack: 0.002,
                decay: 0.22,
                sustain: 0,
                release: 0.03,
              },
            })
              .toDestination(),
          closedHat: () =>
            new Tone.MetalSynth({
              envelope: { attack: 0.002, decay: 0.13, release: 0.02 },
              harmonicity: 11,
              resonance: 750,
            })
              .toDestination(),
          openHat: () =>
            new Tone.MetalSynth({
              envelope: { attack: 0.002, decay: 0.45, release: 0.08 },
              harmonicity: 10,
              resonance: 800,
            })
              .toDestination(),
        },
        electronic: {
          // 909/808 hybrid, clean and punchy
          kick: () =>
            new Tone.MembraneSynth({
              pitchDecay: 0.09,
              octaves: 7,
              oscillator: { type: "sine" },
              envelope: {
                attack: 0.001,
                decay: 0.45,
                sustain: 0.08,
                release: 1.2,
              },
            })
              .toDestination(),
          snare: () =>
            new Tone.NoiseSynth({
              envelope: {
                attack: 0.002,
                decay: 0.2,
                sustain: 0,
                release: 0.01,
              },
            })
              .toDestination(),
          closedHat: () =>
            new Tone.MetalSynth({
              envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
              harmonicity: 12,
              resonance: 850,
            })
              .toDestination(),
          openHat: () =>
            new Tone.MetalSynth({
              envelope: { attack: 0.001, decay: 0.32, release: 0.05 },
              harmonicity: 11,
              resonance: 900,
            })
              .toDestination(),
        },
        latino: {
          // Tight, high-pitched kick with quick decay
          kick: () =>
            new Tone.MembraneSynth({
              pitchDecay: 0.07,
              octaves: 5.5,
              oscillator: { type: "sine" },
              envelope: {
                attack: 0.001,
                decay: 0.32,
                sustain: 0,
                release: 0.7,
              },
            })
              .toDestination(),
          snare: () =>
            new Tone.NoiseSynth({
              envelope: {
                attack: 0.003,
                decay: 0.16,
                sustain: 0,
                release: 0.02,
              },
            })
              .toDestination(),
          closedHat: () =>
            new Tone.MetalSynth({
              envelope: { attack: 0.0008, decay: 0.09, release: 0.01 },
              harmonicity: 13,
              resonance: 950,
            })
              .toDestination(),
          openHat: () =>
            new Tone.MetalSynth({
              envelope: { attack: 0.001, decay: 0.38, release: 0.06 },
              harmonicity: 12,
              resonance: 920,
            })
              .toDestination(),
        },
        pop: {
          // Standard 909/808 hybrid, balanced sound
          kick: () =>
            new Tone.MembraneSynth({
              pitchDecay: 0.08,
              octaves: 6,
              oscillator: { type: "sine" },
              envelope: {
                attack: 0.001,
                decay: 0.4,
                sustain: 0.1,
                release: 1.2,
              },
            })
              .toDestination(),
          snare: () =>
            new Tone.NoiseSynth({
              envelope: {
                attack: 0.001,
                decay: 0.2,
                sustain: 0,
                release: 0.01,
              },
            })
              .toDestination(),
          closedHat: () =>
            new Tone.MetalSynth({
              envelope: { attack: 0.001, decay: 0.12, release: 0.01 },
              harmonicity: 12,
              resonance: 800,
            })
              .toDestination(),
          openHat: () =>
            new Tone.MetalSynth({
              envelope: { attack: 0.001, decay: 0.3, release: 0.05 },
              harmonicity: 10,
              resonance: 900,
            })
              .toDestination(),
        },
      };

      const config = configs[userDrumKit] || configs.electronic;

      return {
        kick: config.kick(),
        snare: config.snare(),
        closedHat: config.closedHat(),
        openHat: config.openHat(),
      };
    },
    []
  );

  // Initialize drum synths based on user-selected drumKit
  const initDrums = useCallback(
    async (userDrumKit: "rock" | "pop" | "electronic" | "latino" | "rap-trap") => {
      if (synthInitRef.current) return;

      if (Tone.context.state !== "running") {
        await Tone.start();
      }

      const kit = createDrumKit(userDrumKit);
      if (!kit) return;

      // Set volumes
      kit.kick.volume.value = -6;
      kit.snare.volume.value = -8;
      kit.closedHat.volume.value = -10;
      kit.openHat.volume.value = -9;

      drumSynths.current = {
        kick: kit.kick as Tone.MembraneSynth,
        snare: kit.snare as Tone.NoiseSynth,
        closedHat: kit.closedHat as Tone.MetalSynth,
        openHat: kit.openHat as Tone.MetalSynth,
      };

      synthInitRef.current = true;
    },
    [createDrumKit]
  );

  // Trigger drum sounds with proper envelope timing (fixes Hi-Hat pitch glitch)
  const triggerDrum = useCallback((instrument: string, time: number) => {
    switch (instrument) {
      case "Kick":
        // Use triggerAttackRelease for clean envelope
        drumSynths.current.kick?.triggerAttackRelease("C1", "0.5", time);
        break;
      case "Snare":
        // Short, crisp snare hit
        drumSynths.current.snare?.triggerAttackRelease("32n", time);
        break;
      case "ClosedHat":
        // FIXED: Use triggerAttackRelease instead of separate triggerAttack/triggerRelease
        // This prevents pitch glitches and ensures envelope resets properly
        drumSynths.current.closedHat?.triggerAttackRelease("64n", time);
        break;
      case "OpenHat":
        // FIXED: Use triggerAttackRelease for proper envelope handling
        drumSynths.current.openHat?.triggerAttackRelease("32n", time);
        break;
    }
  }, []);

  // Play beat
  const playBeat = useCallback(async () => {
    if (!beatData || isPlaying) return;

    try {
      await initDrums(drumKit);

      setIsPlaying(true);
      setCurrentStep(0);

      const totalSteps = beatData.tracks[0].steps.length; // Should be 16, 32, or 64
      const stepDuration = (60 / beatData.tempo) * 0.25; // 16 steps per beat

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
            triggerDrum(track.instrument, time);
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
  }, [beatData, isPlaying, initDrums, triggerDrum, drumKit]);

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
      Object.values(drumSynths.current).forEach((synth) => {
        if (synth) {
          try {
            (synth as any).triggerRelease?.();
          } catch (e) {
            // Ignore errors
          }
        }
      });

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

    // Reset synth initialization when generating new beat
    synthInitRef.current = false;

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

                  <button
                    onClick={isPlaying ? stopBeat : playBeat}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-sm transition-all ${
                      isPlaying
                        ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                        : "bg-[#00f5d4] text-black border border-[#00f5d4] hover:scale-[1.02]"
                    }`}
                  >
                    {isPlaying ? (
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
                  Enter a beat prompt and click "Generate Beat" to see the sequencer
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
