"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Check, Drum, Play, Square } from "lucide-react";
import { Beat, SongState } from "./types";

interface Props {
  state: SongState;
  onUpdate: (updates: Partial<SongState>) => void;
  onNext: () => void;
}

const BEAT_STYLE_LABELS: Record<string, string> = {
  electronic: "Electronic",
  rock: "Rock",
  pop: "Pop",
  "rap-trap": "Trap",
  latino: "Latino",
  house: "House",
  funk: "Funk",
  dnb: "D&B",
  acoustic: "Acoustic",
};

const DRUM_COLORS: Record<string, string> = {
  Kick: "bg-[#ff6b35]",
  Snare: "bg-[#00f5d4]",
  ClosedHat: "bg-[#9d4edd]",
  OpenHat: "bg-[#ffd166]",
};

function MiniStepGrid({ beat }: { beat: Beat }) {
  const displaySteps = 16;
  return (
    <div className="space-y-1.5">
      {beat.tracks.map(track => (
        <div key={track.instrument} className="flex items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider text-white/30 w-16 flex-shrink-0">
            {track.instrument.replace("ClosedHat", "Hat").replace("OpenHat", "O.Hat")}
          </span>
          <div className="flex gap-0.5 flex-1">
            {track.steps.slice(0, displaySteps).map((active, i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-[2px] transition-all ${
                  active
                    ? DRUM_COLORS[track.instrument] ?? "bg-white/60"
                    : "bg-white/5"
                } ${i % 4 === 0 && i > 0 ? "ml-0.5" : ""}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function guessKitFromGenre(genre: string): string {
  const lower = (genre ?? "").toLowerCase();
  if (lower.includes("rock") || lower.includes("metal")) return "rock";
  if (lower.includes("trap") || lower.includes("rap") || lower.includes("hip")) return "rap-trap";
  if (lower.includes("latin") || lower.includes("salsa") || lower.includes("reggaeton")) return "latino";
  if (lower.includes("edm") || lower.includes("house") || lower.includes("techno") || lower.includes("electronic")) return "electronic";
  return "pop";
}

export function Stage2_Rhythm({ state, onUpdate, onNext }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [schedulerRef, setSchedulerRef] = useState<{ stop: () => void } | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    onUpdate({ beatOptions: [], selectedBeat: null });
    const kit = guessKitFromGenre(state.genre);
    try {
      const response = await fetch("/api/generate-beat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: state.genre,
          intensity: 70,
          complexity: 60,
          drumKit: kit,
          bars: 1,
        }),
      });
      const data = await response.json();
      onUpdate({ beatOptions: (data.options || []) as Beat[], selectedBeat: null });
    } catch (e) {
      console.error("Beat generation error:", e);
    } finally {
      setIsGenerating(false);
    }
  };


  const playBeat = async (beat: Beat, idx: number) => {
    if (playingIdx === idx) {
      schedulerRef?.stop();
      setPlayingIdx(null);
      setSchedulerRef(null);
      return;
    }
    schedulerRef?.stop();
    setPlayingIdx(idx);

    try {
      const Tone = await import("tone");
      await Tone.start();

      const bpm = beat.tempo || 120;
      Tone.getTransport().bpm.value = bpm;

      const membraneParams = { pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 } };
      const kickSynth = new Tone.MembraneSynth(membraneParams).toDestination();
      const snareSynth = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 } }).toDestination();
      const hatSynth = new Tone.MetalSynth().toDestination();
      hatSynth.volume.value = -10;

      const stepDuration = "16n";
      let stepIdx = 0;

      const loop = new Tone.Sequence(
        (time) => {
          const si = stepIdx % 16;
          for (const track of beat.tracks) {
            if (track.steps[si]) {
              if (track.instrument === "Kick") kickSynth.triggerAttackRelease("C1", "8n", time);
              if (track.instrument === "Snare") snareSynth.triggerAttackRelease("8n", time);
              if (track.instrument === "ClosedHat") hatSynth.triggerAttackRelease("16n", time);
            }
          }
          stepIdx++;
        },
        Array.from({ length: 16 }, (_, i) => i),
        stepDuration
      );

      loop.start(0);
      Tone.getTransport().start();

      const timeout = setTimeout(() => {
        loop.stop();
        Tone.getTransport().stop();
        setPlayingIdx(null);
        setSchedulerRef(null);
      }, 4000);

      setSchedulerRef({
        stop: () => {
          loop.stop();
          Tone.getTransport().stop();
          clearTimeout(timeout);
        },
      });
    } catch (e) {
      console.error("Beat playback error", e);
      setPlayingIdx(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Context display */}
      {state.selectedChordOption && (
        <div className="flex flex-wrap gap-2 p-3 bg-white/3 rounded-2xl border border-white/5">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/30 self-center">Chords:</span>
          {state.selectedChordOption.chords.map((c, i) => (
            <span key={i} className="px-2.5 py-1 bg-[#00f5d4]/10 border border-[#00f5d4]/20 rounded-lg text-xs font-black text-[#00f5d4]">
              {c.chord}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="flex items-center gap-3 bg-[#00f5d4] text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.3)] disabled:opacity-40"
      >
        {isGenerating ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            Generating 4 beat patterns…
          </>
        ) : (
          <>
            <Drum size={20} />
            Generate Beat Patterns
          </>
        )}
      </button>

      <AnimatePresence>
        {state.beatOptions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-4">
            {state.beatOptions.map((beat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                onClick={() => onUpdate({ selectedBeat: beat })}
                className={`relative rounded-2xl border p-5 cursor-pointer transition-all group ${
                  state.selectedBeat === beat
                    ? "bg-[#00f5d4]/10 border-[#00f5d4] shadow-[0_0_20px_rgba(0,245,212,0.2)]"
                    : "bg-white/3 border-white/10 hover:border-[#00f5d4]/40 hover:bg-white/5"
                }`}
              >
                {state.selectedBeat === beat && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-[#00f5d4] rounded-full flex items-center justify-center">
                    <Check size={12} className="text-black" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00f5d4]/60">Beat {idx + 1}</span>
                    <p className="text-sm font-black text-white/80 mt-0.5">
                      {BEAT_STYLE_LABELS[beat.kitType ?? beat.drumKit] ?? beat.kitType} · {beat.tempo} BPM
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); playBeat(beat, idx); }}
                    className={`p-2 rounded-xl transition-all ${
                      playingIdx === idx
                        ? "bg-[#00f5d4]/20 text-[#00f5d4]"
                        : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {playingIdx === idx ? <Square size={14} /> : <Play size={14} />}
                  </button>
                </div>

                <MiniStepGrid beat={beat} />

                <p className="text-xs text-white/30 mt-3 leading-relaxed line-clamp-2">{beat.explanation}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {state.selectedBeat && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={onNext}
            className="flex items-center gap-3 bg-gradient-to-r from-[#00f5d4] to-[#00d4aa] text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.4)]"
          >
            Next: Melody & Bass
            <ChevronRight size={20} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
