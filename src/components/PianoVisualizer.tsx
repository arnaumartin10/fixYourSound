"use client";

import React, { useMemo } from "react";
import { Note } from "tonal";

interface PianoVisualizerProps {
  activeNotes: string[]; // e.g., ['C3', 'E3', 'G3']
}

const OCTAVES = [2, 3, 4];
const WHITE_KEYS = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_KEYS: Record<string, number> = {
  C: 1, // C#
  D: 2, // D#
  F: 4, // F#
  G: 5, // G#
  A: 6, // A#
};

export function PianoVisualizer({ activeNotes }: PianoVisualizerProps) {
  // Normalize notes for comparison (e.g., C#3 or Db3)
  const normalizedActive = useMemo(() => {
    if (activeNotes.length === 0) {
      console.warn("PianoVisualizer: No active notes to display. Parsing may have failed for the current chord.");
    }
    return activeNotes.map(n => Note.simplify(n));
  }, [activeNotes]);

  const isNoteActive = (note: string, octave: number) => {
    const fullNote = `${note}${octave}`;
    const simplified = Note.simplify(fullNote);
    return normalizedActive.includes(simplified);
  };

  const keyWidth = 40;
  const keyHeight = 160;
  const blackKeyWidth = 24;
  const blackKeyHeight = 100;

  return (
    <div className="w-full bg-[#0a0a0a] rounded-2xl border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative z-10 overflow-x-auto pb-4 scrollbar-hide">
        <svg
          width={OCTAVES.length * 7 * keyWidth}
          height={keyHeight}
          className="mx-auto"
        >
          {/* White Keys */}
          {OCTAVES.map((octave, oIndex) =>
            WHITE_KEYS.map((key, kIndex) => {
              const x = (oIndex * 7 + kIndex) * keyWidth;
              const active = isNoteActive(key, octave);
              return (
                <rect
                  key={`${key}${octave}`}
                  x={x}
                  y={0}
                  width={keyWidth - 1}
                  height={keyHeight}
                  fill={active ? "#00f5d4" : "#1a1a1a"}
                  stroke="#000"
                  strokeWidth="1"
                  rx="4"
                  className="transition-colors duration-300"
                />
              );
            })
          )}

          {/* Black Keys */}
          {OCTAVES.map((octave, oIndex) =>
            Object.keys(BLACK_KEYS).map((key) => {
              const kIndex = WHITE_KEYS.indexOf(key);
              const x = (oIndex * 7 + kIndex) * keyWidth + keyWidth * 0.7;
              const active = isNoteActive(`${key}#`, octave);
              return (
                <rect
                  key={`${key}#${octave}`}
                  x={x}
                  y={0}
                  width={blackKeyWidth}
                  height={blackKeyHeight}
                  fill={active ? "#00f5d4" : "#000"}
                  stroke="#222"
                  strokeWidth="1"
                  rx="3"
                  className="transition-colors duration-300 shadow-xl"
                />
              );
            })
          )}
        </svg>
      </div>
      
      <div className="mt-6 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20">
        <span>Octave 2</span>
        <span>Octave 3</span>
        <span>Octave 4</span>
      </div>
    </div>
  );
}
