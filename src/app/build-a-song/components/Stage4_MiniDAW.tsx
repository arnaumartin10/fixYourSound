"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Square, ChevronRight, Volume2 } from "lucide-react";
import { SongState, MelodyNote, BeatTrack } from "./types";

interface Props {
  state: SongState;
  onNext: () => void;
}

const TRACK_CONFIG = [
  { key: "lead", label: "Lead Melody", color: "#00f5d4", bgColor: "rgba(0,245,212,0.15)" },
  { key: "chords", label: "Chords", color: "#ffd166", bgColor: "rgba(255,209,102,0.15)" },
  { key: "bass", label: "Bassline", color: "#9d4edd", bgColor: "rgba(157,78,237,0.15)" },
  { key: "drums", label: "Drums", color: "#ff6b35", bgColor: "rgba(255,107,53,0.15)" },
];

const DRUM_COLORS: Record<string, string> = {
  Kick: "#ff6b35",
  Snare: "#ff9f1c",
  ClosedHat: "#ffbf69",
  OpenHat: "#ffd166",
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function noteToMidi(pitch: string): number {
  const match = pitch.match(/^([A-G]#?b?)(-?\d+)$/);
  if (!match) return 60;
  const [, name, octStr] = match;
  const oct = parseInt(octStr, 10);
  const pc = NOTE_NAMES.indexOf(name);
  return (oct + 1) * 12 + (pc >= 0 ? pc : 0);
}

function NoteBlock({ note, maxTime, minMidi, midiRange, color }: {
  note: MelodyNote; maxTime: number; minMidi: number; midiRange: number; color: string;
}) {
  const x = (note.startTime / maxTime) * 100;
  const w = Math.max((note.duration / maxTime) * 100, 1);
  const midi = noteToMidi(note.pitch);
  const y = ((minMidi + midiRange - midi) / midiRange) * 100;
  return (
    <div
      className="absolute rounded-[3px] opacity-90"
      style={{ left: `${x}%`, width: `${w}%`, top: `${y}%`, height: `${100 / midiRange}%`, backgroundColor: color, minHeight: 6 }}
      title={note.pitch}
    />
  );
}

export function Stage4_MiniDAW({ state, onNext }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBar, setCurrentBar] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);

  const melody = state.selectedMelody;
  const beat = state.selectedBeat;
  const chords = state.selectedChordOption;
  const bpm = beat?.tempo ?? melody?.bpm ?? 120;

  // Build note ranges for piano roll sections
  const leadNotes = melody?.lead ?? [];
  const bassNotes = melody?.bassline ?? [];
  const allLeadBass = [...leadNotes, ...bassNotes];
  const midiVals = allLeadBass.map(n => noteToMidi(n.pitch));
  const minMidi = midiVals.length ? Math.min(...midiVals) - 1 : 40;
  const maxMidi = midiVals.length ? Math.max(...midiVals) + 1 : 72;
  const midiRange = Math.max(maxMidi - minMidi + 1, 16);
  const maxTime = 8;

  // Chord note dots
  const chordDots = (chords?.chords ?? []).map((c, i) => ({
    label: c.chord,
    x: (i / (chords!.chords.length)) * 100,
    w: (1 / (chords!.chords.length)) * 100,
  }));

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      stopRef.current?.();
      setIsPlaying(false);
      setCurrentBar(0);
      return;
    }
    setIsPlaying(true);
    setCurrentBar(0);

    try {
      const Tone = await import("tone");
      await Tone.start();
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();
      transport.bpm.value = bpm;

      // Lead synth
      const leadSynth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.8 },
      }).toDestination();

      // Bass synth
      const bassSynth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.7, release: 0.5 },
      }).toDestination();
      bassSynth.volume.value = -4;

      // Chord synth
      const chordSynth = new Tone.PolySynth(Tone.Synth).toDestination();
      chordSynth.volume.value = -8;

      // Drum synths
      const kick = new Tone.MembraneSynth().toDestination();
      const snare = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 } }).toDestination();
      snare.volume.value = -6;
      const hat = new Tone.MetalSynth().toDestination();
      hat.volume.value = -10;

      // Part for melody
      const beatsPerSec = 60 / bpm;
      const secPerBar = 4 * beatsPerSec;

      // Schedule notes (repeat 2 bars for 8 bars)
      for (let rep = 0; rep < 4; rep++) {
        const repOffset = rep * 2 * secPerBar;
        if (melody) {
          for (const note of melody.lead) {
            const t = repOffset + note.startTime * beatsPerSec;
            const dur = note.duration * beatsPerSec;
            transport.schedule((time) => { leadSynth.triggerAttackRelease(note.pitch, dur, time); }, t);
          }
          for (const note of melody.bassline) {
            const t = repOffset + note.startTime * beatsPerSec;
            const dur = note.duration * beatsPerSec;
            transport.schedule((time) => { bassSynth.triggerAttackRelease(note.pitch, dur, time); }, t);
          }
        }
        // Chords — one per 2 beats
        if (chords) {
          chords.chords.forEach((c, ci) => {
            const t = repOffset + ci * (2 * beatsPerSec);
            const { Chord } = require("tonal");
            const notes = Chord.get(c.chord).notes.slice(0, 4).map((n: string) => `${n}4`);
            if (notes.length) {
              transport.schedule((time) => { chordSynth.triggerAttackRelease(notes, "2n", time); }, t);
            }
          });
        }
      }

      // Drums — 8 bars
      if (beat) {
        for (let bar = 0; bar < 8; bar++) {
          for (let step = 0; step < 16; step++) {
            const t = bar * secPerBar + step * (secPerBar / 16);
            const trackLen = beat.tracks[0]?.steps.length ?? 16;
            const si = step % trackLen;
            for (const track of beat.tracks) {
              if (track.steps[si]) {
                if (track.instrument === "Kick") {
                  transport.schedule((time) => kick.triggerAttackRelease("C1", "8n", time), t);
                } else if (track.instrument === "Snare") {
                  transport.schedule((time) => snare.triggerAttackRelease("8n", time), t);
                } else if (track.instrument === "ClosedHat") {
                  transport.schedule((time) => hat.triggerAttackRelease("16n", time), t);
                }
              }
            }
          }
        }
      }

      // Bar counter
      const barInterval = setInterval(() => {
        setCurrentBar(b => {
          if (b >= 7) { clearInterval(barInterval); return 0; }
          return b + 1;
        });
      }, secPerBar * 1000);

      const totalDur = 8 * secPerBar * 1000;
      const endTimeout = setTimeout(() => {
        transport.stop();
        transport.cancel();
        setIsPlaying(false);
        setCurrentBar(0);
        clearInterval(barInterval);
      }, totalDur + 200);

      transport.start();

      stopRef.current = () => {
        transport.stop();
        transport.cancel();
        clearInterval(barInterval);
        clearTimeout(endTimeout);
      };
    } catch (e) {
      console.error("DAW playback error", e);
      setIsPlaying(false);
    }
  }, [isPlaying, bpm, melody, beat, chords]);

  return (
    <div className="space-y-6">
      {/* BPM & key info */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
          <span className="text-[10px] text-white/30 font-black uppercase tracking-wider block">Tempo</span>
          <span className="text-lg font-black text-[#00f5d4]">{bpm} BPM</span>
        </div>
        <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
          <span className="text-[10px] text-white/30 font-black uppercase tracking-wider block">Key</span>
          <span className="text-lg font-black text-white">{state.key}</span>
        </div>
        <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
          <span className="text-[10px] text-white/30 font-black uppercase tracking-wider block">Length</span>
          <span className="text-lg font-black text-white">8 Bars</span>
        </div>
      </div>

      {/* Bar timeline */}
      <div className="flex gap-1">
        {Array.from({ length: 8 }, (_, i) => (
          <motion.div
            key={i}
            animate={{ backgroundColor: currentBar === i && isPlaying ? "#00f5d4" : "rgba(255,255,255,0.05)" }}
            className="flex-1 h-1.5 rounded-full"
          />
        ))}
      </div>

      {/* Tracks */}
      <div className="space-y-2 bg-[#060606] rounded-2xl border border-white/5 p-4 overflow-hidden">
        {/* Track header */}
        <div className="flex items-center gap-3 pb-2 border-b border-white/5">
          <div className="w-24 flex-shrink-0"></div>
          <div className="flex-1 flex gap-px">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex-1 text-center text-[8px] font-black text-white/20">
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {TRACK_CONFIG.map(track => (
          <div key={track.key} className="flex items-center gap-3">
            {/* Track label */}
            <div className="w-24 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: track.color }} />
                <span className="text-[10px] font-black text-white/50 truncate">{track.label}</span>
              </div>
            </div>

            {/* Grid area */}
            <div className="flex-1 relative" style={{ height: track.key === "drums" ? 40 : 56 }}>
              <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ backgroundColor: track.bgColor, border: `1px solid ${track.color}20` }}>
                {/* Bar dividers */}
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 w-px bg-white/5" style={{ left: `${((i + 1) / 8) * 100}%` }} />
                ))}

                {/* Content per track */}
                {track.key === "lead" && leadNotes.map((note, i) => (
                  <NoteBlock key={i} note={note} maxTime={maxTime} minMidi={minMidi} midiRange={midiRange} color={track.color} />
                ))}
                {track.key === "bass" && bassNotes.map((note, i) => (
                  <NoteBlock key={i} note={note} maxTime={maxTime} minMidi={minMidi} midiRange={midiRange} color={track.color} />
                ))}
                {track.key === "chords" && chordDots.map((c, i) => (
                  <div
                    key={i}
                    className="absolute top-1 bottom-1 rounded-md flex items-center justify-center"
                    style={{ left: `${c.x}%`, width: `${c.w - 0.5}%`, backgroundColor: `${track.color}30`, border: `1px solid ${track.color}60` }}
                  >
                    <span className="text-[9px] font-black" style={{ color: track.color }}>{c.label}</span>
                  </div>
                ))}
                {track.key === "drums" && beat && beat.tracks.slice(0, 2).map((drumTrack, ti) => (
                  drumTrack.steps.map((active, si) => active ? (
                    <div
                      key={`${ti}-${si}`}
                      className="absolute top-1/4 rounded-[2px]"
                      style={{
                        left: `${(si / 16) * 100}%`,
                        width: `${(1 / 16) * 100 - 0.5}%`,
                        height: "50%",
                        backgroundColor: ti === 0 ? DRUM_COLORS.Kick : DRUM_COLORS.Snare,
                        opacity: 0.85,
                      }}
                    />
                  ) : null)
                ))}

                {/* Playhead */}
                {isPlaying && (
                  <motion.div
                    animate={{ left: `${(currentBar / 8) * 100}%` }}
                    transition={{ duration: (60 / bpm) * 4, ease: "linear" }}
                    className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Master play button */}
      <div className="flex items-center gap-4">
        <motion.button
          onClick={handlePlay}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          animate={isPlaying ? { boxShadow: ["0 0 20px rgba(0,245,212,0.4)", "0 0 40px rgba(0,245,212,0.7)", "0 0 20px rgba(0,245,212,0.4)"] } : {}}
          transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg transition-all ${
            isPlaying
              ? "bg-white/10 border border-[#00f5d4]/50 text-[#00f5d4]"
              : "bg-[#00f5d4] text-black shadow-[0_0_30px_rgba(0,245,212,0.3)]"
          }`}
        >
          {isPlaying ? <Square size={20} /> : <Play size={20} />}
          {isPlaying ? "Stop Song" : "▶ Play Full Song"}
        </motion.button>

        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-[#00f5d4]"
          >
            <Volume2 size={16} />
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ height: [4, 12 + i * 3, 4] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1 rounded-full bg-[#00f5d4]"
                  style={{ height: 4 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={onNext}
          className="flex items-center gap-3 bg-gradient-to-r from-[#9d4edd] to-[#7b2fe8] text-white px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(157,78,237,0.3)]"
        >
          Next: Sound Design
          <ChevronRight size={20} />
        </button>
      </motion.div>
    </div>
  );
}
