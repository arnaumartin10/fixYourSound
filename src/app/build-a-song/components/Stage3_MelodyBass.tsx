"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Check, Music, Play, Square } from "lucide-react";
import { MelodyNote, MelodyOption, SongState } from "./types";

interface Props {
  state: SongState;
  onUpdate: (updates: Partial<SongState>) => void;
  onNext: () => void;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteToMidi(pitch: string): number {
  const match = pitch.match(/^([A-G]#?b?)(-?\d+)$/);
  if (!match) return 60;
  const [, name, octStr] = match;
  const oct = parseInt(octStr, 10);
  const pitchClass = NOTE_NAMES.indexOf(name.replace("b", "#")); // approximate
  return (oct + 1) * 12 + (pitchClass >= 0 ? pitchClass : 0);
}

function PianoRollLite({ notes, color }: { notes: MelodyNote[]; color: string }) {
  if (!notes.length) return null;
  const maxTime = Math.max(...notes.map(n => n.startTime + n.duration), 8);
  const midiValues = notes.map(n => noteToMidi(n.pitch));
  const minMidi = Math.min(...midiValues) - 1;
  const maxMidi = Math.max(...midiValues) + 1;
  const range = Math.max(maxMidi - minMidi, 12);
  const HEIGHT = 48;
  const WIDTH = 220;

  return (
    <div className="relative rounded-lg overflow-hidden bg-black/40" style={{ height: HEIGHT, width: "100%" }}>
      {notes.map((note, i) => {
        const midi = noteToMidi(note.pitch);
        const x = (note.startTime / maxTime) * 100;
        const w = (note.duration / maxTime) * 100;
        const y = ((maxMidi - midi) / range) * 100;
        const h = (1 / range) * 100;
        return (
          <div
            key={i}
            className="absolute rounded-sm opacity-90"
            style={{
              left: `${x}%`,
              width: `${Math.max(w, 1.5)}%`,
              top: `${y}%`,
              height: `${Math.max(h, 8)}%`,
              backgroundColor: color,
            }}
          />
        );
      })}
    </div>
  );
}

function MelodyCard({
  option,
  index,
  isSelected,
  isPlaying,
  onSelect,
  onPlay,
}: {
  option: MelodyOption;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPlay: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      onClick={onSelect}
      className={`relative rounded-2xl border p-5 cursor-pointer transition-all group ${
        isSelected
          ? "bg-[#9d4edd]/10 border-[#9d4edd] shadow-[0_0_20px_rgba(157,78,237,0.2)]"
          : "bg-white/3 border-white/10 hover:border-[#9d4edd]/40 hover:bg-white/5"
      }`}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-[#9d4edd] rounded-full flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#9d4edd]/60">
          Combo {index + 1}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onPlay(); }}
          className={`p-2 rounded-xl transition-all ${
            isPlaying
              ? "bg-[#9d4edd]/20 text-[#9d4edd]"
              : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
          }`}
        >
          {isPlaying ? <Square size={14} /> : <Play size={14} />}
        </button>
      </div>
      <div className="space-y-2">
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-[#00f5d4]/50 mb-1 block">Lead</span>
          <PianoRollLite notes={option.lead} color="#00f5d4" />
        </div>
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-[#9d4edd]/50 mb-1 block">Bass</span>
          <PianoRollLite notes={option.bassline} color="#9d4edd" />
        </div>
      </div>
      <p className="text-xs text-white/30 mt-3">{option.lead.length} lead notes · {option.bassline.length} bass notes · {option.bpm} BPM</p>
    </motion.div>
  );
}

export function Stage3_MelodyBass({ state, onUpdate, onNext }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [playerRef, setPlayerRef] = useState<{ stop: () => void } | null>(null);

  const chordStr = state.selectedChordOption?.chords.map(c => c.chord).join(" - ") ?? "";

  const handleGenerate = async () => {
    setIsGenerating(true);
    onUpdate({ melodyOptions: [], selectedMelody: null });
    try {
      const response = await fetch("/api/generate-melody", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chordProgression: chordStr, vibe: state.genre }),
      });
      const data = await response.json();
      onUpdate({ melodyOptions: (data.options || []) as MelodyOption[] });
    } catch (e) {
      console.error("Melody generation error:", e);
    } finally {
      setIsGenerating(false);
    }
  };


  const playOption = async (option: MelodyOption, idx: number) => {
    if (playingIdx === idx) {
      playerRef?.stop();
      setPlayingIdx(null);
      setPlayerRef(null);
      return;
    }
    playerRef?.stop();
    setPlayingIdx(idx);

    try {
      const Tone = await import("tone");
      await Tone.start();

      const leadSynth = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.5 } }).toDestination();
      const bassSynth = new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.7, release: 0.4 } }).toDestination();
      bassSynth.volume.value = -6;

      const secPerBeat = 60 / (option.bpm || 120);
      const now = Tone.now() + 0.1;
      const parts: Array<{ time: number; cancel: () => void }> = [];

      for (const note of option.lead) {
        const id = setTimeout(() => {
          const duration = note.duration * secPerBeat;
          leadSynth.triggerAttackRelease(note.pitch, duration);
        }, (note.startTime * secPerBeat) * 1000);
        parts.push({ time: note.startTime, cancel: () => clearTimeout(id) });
      }
      for (const note of option.bassline) {
        const id = setTimeout(() => {
          const duration = note.duration * secPerBeat;
          bassSynth.triggerAttackRelease(note.pitch, duration);
        }, (note.startTime * secPerBeat) * 1000);
        parts.push({ time: note.startTime, cancel: () => clearTimeout(id) });
      }

      const maxTime = Math.max(
        ...option.lead.map(n => n.startTime + n.duration),
        ...option.bassline.map(n => n.startTime + n.duration)
      );
      const totalMs = maxTime * secPerBeat * 1000 + 500;

      const endTimeout = setTimeout(() => {
        setPlayingIdx(null);
        setPlayerRef(null);
      }, totalMs);

      setPlayerRef({
        stop: () => {
          parts.forEach(p => p.cancel());
          clearTimeout(endTimeout);
          leadSynth.triggerRelease();
          bassSynth.triggerRelease();
        },
      });
    } catch (e) {
      console.error("Melody playback error", e);
      setPlayingIdx(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Context summary */}
      <div className="flex flex-wrap gap-4">
        {state.selectedChordOption && (
          <div className="flex items-center gap-2 p-3 bg-white/3 rounded-xl border border-white/5">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Chords:</span>
            <span className="text-sm font-black text-[#00f5d4]">{chordStr}</span>
          </div>
        )}
        {state.selectedBeat && (
          <div className="flex items-center gap-2 p-3 bg-white/3 rounded-xl border border-white/5">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/30">BPM:</span>
            <span className="text-sm font-black text-[#00f5d4]">{state.selectedBeat.tempo}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="flex items-center gap-3 bg-[#00f5d4] text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.3)] disabled:opacity-40"
      >
        {isGenerating ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            Generating 4 melody combos…
          </>
        ) : (
          <>
            <Music size={20} />
            Generate Melodies & Basslines
          </>
        )}
      </button>

      <AnimatePresence>
        {state.melodyOptions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-4">
            {state.melodyOptions.map((option, idx) => (
              <MelodyCard
                key={idx}
                option={option}
                index={idx}
                isSelected={state.selectedMelody === option}
                isPlaying={playingIdx === idx}
                onSelect={() => onUpdate({ selectedMelody: option })}
                onPlay={() => playOption(option, idx)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {state.selectedMelody && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={onNext}
            className="flex items-center gap-3 bg-gradient-to-r from-[#00f5d4] to-[#00d4aa] text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.4)]"
          >
            Next: Your Mini-DAW
            <ChevronRight size={20} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
