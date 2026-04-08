"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Play, Square, Check, Music } from "lucide-react";
import { ChordProgression, SongState, SCALES } from "./types";

interface Props {
  state: SongState;
  onUpdate: (updates: Partial<SongState>) => void;
  onNext: () => void;
}

const DRUM_KIT_OPTIONS = [
  { value: "electronic", label: "Electronic" },
  { value: "rock", label: "Rock" },
  { value: "pop", label: "Pop" },
  { value: "rap-trap", label: "Trap" },
  { value: "latino", label: "Latino" },
];

function ChordCard({
  option,
  index,
  isSelected,
  isPlaying,
  onSelect,
  onPlay,
}: {
  option: ChordProgression;
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
      transition={{ delay: index * 0.08 }}
      onClick={onSelect}
      className={`relative rounded-2xl border p-5 cursor-pointer transition-all group ${
        isSelected
          ? "bg-[#00f5d4]/10 border-[#00f5d4] shadow-[0_0_20px_rgba(0,245,212,0.2)]"
          : "bg-white/3 border-white/10 hover:border-[#00f5d4]/40 hover:bg-white/5"
      }`}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-[#00f5d4] rounded-full flex items-center justify-center">
          <Check size={12} className="text-black" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#00f5d4]/60">
          Option {String.fromCharCode(65 + index)}
        </span>
      </div>

      {/* Chord pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {option.chords.map((c, i) => (
          <span
            key={i}
            className={`px-3 py-1.5 rounded-xl text-sm font-black border transition-all ${
              isSelected
                ? "bg-[#00f5d4]/20 border-[#00f5d4]/40 text-[#00f5d4]"
                : "bg-white/5 border-white/10 text-white/80 group-hover:border-white/20"
            }`}
          >
            {c.chord}
          </span>
        ))}
      </div>

      {/* Explanation of first chord */}
      <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
        {option.chords[0]?.explanation}
      </p>

      {/* Play button */}
      <button
        onClick={e => { e.stopPropagation(); onPlay(); }}
        className={`mt-3 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
          isSelected
            ? "bg-[#00f5d4]/20 text-[#00f5d4] hover:bg-[#00f5d4]/30"
            : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
        }`}
      >
        {isPlaying ? <Square size={10} /> : <Play size={10} />}
        {isPlaying ? "Stop" : "Preview"}
      </button>
    </motion.div>
  );
}

export function Stage1_Genre({ state, onUpdate, onNext }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [tonePlayer, setTonePlayer] = useState<{ stop: () => void } | null>(null);

  const handleGenerate = async () => {
    if (!state.genre.trim()) return;
    setIsGenerating(true);
    onUpdate({ chordOptions: [], selectedChordOption: null });
    try {
      const response = await fetch("/api/generate-chords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scale: state.key,
          vibe: state.genre,
        }),
      });
      const data = await response.json();
      const options: ChordProgression[] = (data.options || []).map((opt: any, i: number) => ({
        chords: opt.chords ?? [],
        strummingIdea: opt.strummingIdea,
        label: `Option ${String.fromCharCode(65 + i)}`,
      }));
      onUpdate({ chordOptions: options });
    } catch (e) {
      console.error("Chord generation error:", e);
    } finally {
      setIsGenerating(false);
    }
  };


  const playOption = async (option: ChordProgression, idx: number) => {
    if (playingIdx === idx) {
      tonePlayer?.stop();
      setPlayingIdx(null);
      setTonePlayer(null);
      return;
    }
    tonePlayer?.stop();
    setPlayingIdx(idx);

    try {
      // Lazy-load Tone to avoid SSR issues
      const Tone = await import("tone");
      await Tone.start();

      const synth = new Tone.PolySynth(Tone.Synth);
      const reverb = new Tone.Reverb(1.5);
      synth.connect(reverb);
      reverb.toDestination();
      synth.set({ oscillator: { type: "triangle" }, envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 1 } });

      const { Chord } = await import("tonal");
      let time = Tone.now() + 0.1;
      for (const c of option.chords) {
        const notes = Chord.get(c.chord).notes.map((n: string) => `${n}4`);
        if (notes.length) {
          synth.triggerAttackRelease(notes, "2n", time);
          time += 1.2;
        }
      }
      const timeout = setTimeout(() => {
        setPlayingIdx(null);
        setTonePlayer(null);
      }, option.chords.length * 1400 + 500);

      setTonePlayer({ stop: () => { synth.releaseAll(); clearTimeout(timeout); } });
    } catch (e) {
      console.error("Playback error", e);
      setPlayingIdx(null);
    }
  };

  const canProceed = !!state.selectedChordOption;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Describe your Genre & Vibe
          </label>
          <textarea
            value={state.genre}
            onChange={e => onUpdate({ genre: e.target.value })}
            placeholder='e.g. "Chill lo-fi hip hop with a nostalgic, rainy-day feel" or "Energetic EDM drop with euphoria"'
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#00f5d4]/50 transition-colors h-24 resize-none text-sm placeholder:text-white/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Musical Key
          </label>
          <select
            value={state.key}
            onChange={e => onUpdate({ key: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#00f5d4]/50 transition-colors appearance-none text-sm"
          >
            {SCALES.map(s => <option key={s} value={s} className="bg-[#0a0a0a]">{s}</option>)}
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !state.genre.trim()}
        className="flex items-center gap-3 bg-[#00f5d4] text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            Generating 4 progressions…
          </>
        ) : (
          <>
            <Sparkles size={20} />
            Generate Chord Progressions
          </>
        )}
      </button>

      {/* Options grid */}
      <AnimatePresence>
        {state.chordOptions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-2 mb-4">
              <Music size={14} className="text-[#00f5d4]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#00f5d4]">
                Choose your progression
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {state.chordOptions.map((option, idx) => (
                <ChordCard
                  key={idx}
                  option={option}
                  index={idx}
                  isSelected={state.selectedChordOption === option}
                  isPlaying={playingIdx === idx}
                  onSelect={() => onUpdate({ selectedChordOption: option })}
                  onPlay={() => playOption(option, idx)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button */}
      {canProceed && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={onNext}
            className="flex items-center gap-3 bg-gradient-to-r from-[#00f5d4] to-[#00d4aa] text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.4)]"
          >
            Next: The Rhythm
            <ChevronRight size={20} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
