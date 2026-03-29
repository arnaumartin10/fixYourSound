"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Play, Square, Info, Music, Sparkles, Zap } from "lucide-react";
import { PianoRoll } from "@/components/MelodyGenerator/PianoRoll";

interface MelodyNote {
  pitch: string;
  startTime: number;
  duration: number;
}

interface MelodyData {
  lead: MelodyNote[];
  bassline: MelodyNote[];
  bpm: number;
  timeSignature: string;
}

export default function MelodyGeneratorPage() {
  const [chordProgression, setChordProgression] = useState("");
  const [vibe, setVibe] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [melodyData, setMelodyData] = useState<MelodyData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  const synth = useRef<{ lead: Tone.PolySynth | null; bass: Tone.PolySynth | null }>({
    lead: null,
    bass: null,
  });
  const synthInitRef = useRef(false);
  const playbackIdRef = useRef<number | null>(null);

  // Init synth - can be called multiple times safely
  const initSynth = useCallback(async () => {
    // Ensure AudioContext is started
    if (Tone.context.state !== "running") {
      await Tone.start();
    }

    // Only create synths if they don't exist or have been disposed
    if (!synth.current.lead || !synth.current.bass) {
      const leadReverb = new Tone.Reverb({ decay: 2, wet: 0.2 }).toDestination();
      const leadSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.5 },
      }).connect(leadReverb);
      leadSynth.volume.value = -3; // Slightly louder (-3dB instead of -6dB)

      const bassReverb = new Tone.Reverb({ decay: 2, wet: 0.1 }).toDestination();
      const bassSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 },
      }).connect(bassReverb);
      bassSynth.volume.value = -9; // Slightly louder (-9dB instead of -12dB)

      synth.current = { lead: leadSynth, bass: bassSynth };
    }

    synthInitRef.current = true;
  }, []);

  const playMelody = useCallback(async () => {
    if (!melodyData || isPlaying) return;

    try {
      // Ensure synth is initialized and AudioContext is running
      await initSynth();

      // Add a small delay to ensure AudioContext is fully ready
      await new Promise(resolve => setTimeout(resolve, 50));

      // Ensure we have valid synths
      if (!synth.current.lead || !synth.current.bass) {
        console.error("Synths failed to initialize");
        alert("Failed to initialize audio. Please try again.");
        return;
      }

      const { lead, bassline, bpm } = melodyData;
      const beatDuration = (60 / bpm); // Duration in seconds (not milliseconds)
      const totalDuration = 8 * beatDuration; // Total duration in seconds

      setIsPlaying(true);
      setCurrentTime(0);

      const startTime = Tone.now();

      // Schedule all lead notes
      lead.forEach((note) => {
        const noteStartTime = startTime + note.startTime * beatDuration;
        const noteDuration = note.duration * beatDuration;
        
        if (synth.current.lead) {
          synth.current.lead.triggerAttackRelease(
            note.pitch,
            noteDuration,
            noteStartTime
          );
        }
      });

      // Schedule all bassline notes
      bassline.forEach((note) => {
        const noteStartTime = startTime + note.startTime * beatDuration;
        const noteDuration = note.duration * beatDuration;
        
        if (synth.current.bass) {
          synth.current.bass.triggerAttackRelease(
            note.pitch,
            noteDuration,
            noteStartTime
          );
        }
      });

      // Update playhead position in real time
      const updatePlayhead = () => {
        const elapsed = Tone.now() - startTime; // Elapsed time in seconds
        const normalizedTime = Math.min((elapsed / totalDuration) * 8, 8);
        setCurrentTime(normalizedTime);

        if (elapsed < totalDuration) {
          playbackIdRef.current = window.requestAnimationFrame(updatePlayhead);
        } else {
          setIsPlaying(false);
          setCurrentTime(0);
          playbackIdRef.current = null;
        }
      };

      playbackIdRef.current = window.requestAnimationFrame(updatePlayhead);
    } catch (error) {
      console.error("Playback error:", error);
      setIsPlaying(false);
      alert("An error occurred during playback. Please try again.");
    }
  }, [melodyData, isPlaying, initSynth]);

  const stopPlayback = useCallback(() => {
    // Cancel animation frame
    if (playbackIdRef.current) {
      cancelAnimationFrame(playbackIdRef.current);
      playbackIdRef.current = null;
    }

    // Release all notes from synths
    if (synth.current.lead) {
      try {
        synth.current.lead.releaseAll();
      } catch (e) {
        console.warn("Error releasing lead synth:", e);
      }
    }
    
    if (synth.current.bass) {
      try {
        synth.current.bass.releaseAll();
      } catch (e) {
        console.warn("Error releasing bass synth:", e);
      }
    }

    // Reset state
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleGenerate = async () => {
    if (!chordProgression.trim() || !vibe.trim()) {
      alert("Please fill in both chord progression and vibe");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-melody", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chordProgression: chordProgression.trim(),
          vibe: vibe.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate melody");
      }

      setMelodyData(data);
      setCurrentTime(0);
      setShowInfo(true);
    } catch (error: any) {
      console.error("Failed to generate melody:", error);
      alert("Error generating melody. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (playbackIdRef.current) {
        cancelAnimationFrame(playbackIdRef.current);
      }
    };
  }, []);

  const presetChords = [
    { name: "Jazz Comping", chords: "Cmaj7 - Am7 - Dm7 - G7" },
    { name: "Pop Progression", chords: "C - F - G - C" },
    { name: "Blues", chords: "C7 - C7 - C7 - C7" },
    { name: "Smooth Jazz", chords: "Cmaj9 - Bm7b5 - E7alt - Am" },
  ];

  const presetVibes = [
    "Energetic and uplifting",
    "Melancholic and introspective",
    "Lo-fi hip hop chill vibes",
    "Film noir cinematic",
    "Funky and groovy",
  ];

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black text-white mb-4 tracking-tighter flex items-center justify-center gap-3">
          <Music className="text-[#00f5d4]" size={40} />
          Melody Generator
        </h1>
        <p className="text-white/50 text-lg max-w-2xl mx-auto">
          Transform chord progressions into beautiful melodies with AI-powered composition
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Input Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Chord Progression Input */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 space-y-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 block mb-2">
                Chord Progression
              </label>
              <textarea
                value={chordProgression}
                onChange={(e) => setChordProgression(e.target.value)}
                placeholder="e.g., Cmaj7 - Am7 - Dm7 - G7"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00f5d4]/50 transition-colors resize-none h-24 text-sm"
              />

              {/* Chord Presets */}
              <div className="mt-4 space-y-2">
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">Presets</p>
                <div className="flex flex-wrap gap-2">
                  {presetChords.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setChordProgression(preset.chords)}
                      className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white/60 hover:text-white hover:border-[#00f5d4]/30 transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Vibe Input */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 space-y-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#9d4edd]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 block mb-2">
                Vibe / Style
              </label>
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="e.g., Uplifting and energetic"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00f5d4]/50 transition-colors resize-none h-24 text-sm"
              />

              {/* Vibe Presets */}
              <div className="mt-4 space-y-2">
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">Presets</p>
                <div className="flex flex-wrap gap-2">
                  {presetVibes.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setVibe(preset)}
                      className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white/60 hover:text-white hover:border-[#00f5d4]/30 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !chordProgression.trim() || !vibe.trim()}
            className="w-full group relative flex items-center justify-center gap-2 bg-[#00f5d4] text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.2)] disabled:opacity-50"
          >
            {isLoading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              <>
                <Sparkles size={18} />
                Generate Melody
              </>
            )}
          </button>

          {/* Playback Controls */}
          <AnimatePresence>
            {melodyData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6 space-y-4 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#9d4edd]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative z-10">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Playback</h3>

                  <div className="flex gap-3">
                    <button
                      onClick={isPlaying ? stopPlayback : playMelody}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-sm transition-all ${
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
                  </div>

                  {/* Metadata */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Tempo:</span>
                      <span className="text-[#00f5d4] font-bold">{melodyData.bpm} BPM</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Signature:</span>
                      <span className="text-[#00f5d4] font-bold">{melodyData.timeSignature}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Notes:</span>
                      <span className="text-[#00f5d4] font-bold">
                        {melodyData.lead.length + melodyData.bassline.length}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Visualization & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Piano Roll */}
          <AnimatePresence>
            {melodyData ? (
              <motion.div
                key="pianoroll"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PianoRoll
                  lead={melodyData.lead}
                  bassline={melodyData.bassline}
                  bpm={melodyData.bpm}
                  currentTime={currentTime}
                  maxTime={8}
                />
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-12 flex flex-col items-center justify-center min-h-[400px]"
              >
                <Zap className="text-white/20 mb-4" size={48} />
                <p className="text-white/40 text-center text-sm">
                  Complete the inputs and click "Generate Melody" to see your composition
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Section */}
          <AnimatePresence>
            {melodyData && showInfo && (
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

                <div className="flex gap-3 mb-4">
                  <Info className="text-[#9d4edd] flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2">How It Works</h3>
                    <ul className="space-y-1 text-xs text-white/60">
                      <li>• <strong>Cyan blocks:</strong> Lead melody (main musical line)</li>
                      <li>• <strong>Blue blocks:</strong> Bassline (harmonic foundation)</li>
                      <li>• Width represents note duration in beats</li>
                      <li>• Height on grid represents pitch (vertically stacked from low to high)</li>
                      <li>• Click Play to hear your generated composition!</li>
                    </ul>
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
