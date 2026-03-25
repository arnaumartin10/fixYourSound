"use client";

import React, { useMemo } from "react";
import { Note, Chord } from "tonal";

interface GuitarVisualizerProps {
  chordName: string; // e.g., 'Am7'
}

const STRINGS = ["E4", "B3", "G3", "D3", "A2", "E2"]; // Standard tuning (High to Low)
const FRET_COUNT = 12;

export function GuitarVisualizer({ chordName }: GuitarVisualizerProps) {
  // Get notes of the chord
  const chordNotes = useMemo(() => {
    if (!chordName) return [];
    return Chord.get(chordName).notes;
  }, [chordName]);

  const findFret = (stringNote: string, noteName: string) => {
    const stringMidi = Note.midi(stringNote);
    if (!stringMidi) return -1;

    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const currentNote = Note.fromMidi(stringMidi + fret);
      if (Note.simplify(currentNote).replace(/[0-9]/, "") === Note.simplify(noteName)) {
        return fret;
      }
    }
    return -1;
  };

  // Simplified voicing logic: for each string, find the lowest fret that matches a chord note
  // In a real app, this would be much more sophisticated (CAGED system, etc.)
  const voicing = useMemo(() => {
    if (!chordNotes.length) return [null, null, null, null, null, null];

    return STRINGS.map((stringNote) => {
      let bestFret = -1;
      for (const note of chordNotes) {
        const fret = findFret(stringNote, note);
        if (fret !== -1) {
          if (bestFret === -1 || fret < bestFret) {
            bestFret = fret;
          }
        }
      }
      return bestFret === -1 ? null : bestFret; // null = muted/not played
    });
  }, [chordNotes]);

  const width = 600;
  const height = 180;
  const margin = { top: 20, right: 30, bottom: 20, left: 40 };
  const fretWidth = (width - margin.left - margin.right) / FRET_COUNT;
  const stringSpacing = (height - margin.top - margin.bottom) / (STRINGS.length - 1);

  return (
    <div className="w-full bg-[#0a0a0a] rounded-2xl border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-[#9d4edd]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative z-10 overflow-x-auto pb-4 scrollbar-hide">
        <svg
          width={width}
          height={height}
          className="mx-auto"
        >
          {/* Fretwire */}
          {Array.from({ length: FRET_COUNT + 1 }).map((_, i) => (
            <line
              key={`fret-${i}`}
              x1={margin.left + i * fretWidth}
              y1={margin.top}
              x2={margin.left + i * fretWidth}
              y2={height - margin.bottom}
              stroke={i === 0 ? "#fff" : "rgba(255,255,255,0.2)"}
              strokeWidth={i === 0 ? 4 : 2}
            />
          ))}

          {/* Strings */}
          {STRINGS.map((_, i) => (
            <line
              key={`string-${i}`}
              x1={margin.left}
              y1={margin.top + i * stringSpacing}
              x2={width - margin.right}
              y2={margin.top + i * stringSpacing}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1 + i * 0.5}
            />
          ))}

          {/* Markers (dots) */}
          {[3, 5, 7, 9, 12].map((fret) => (
            <circle
              key={`marker-${fret}`}
              cx={margin.left + (fret - 0.5) * fretWidth}
              cy={height / 2}
              r={4}
              fill="rgba(255,255,255,0.1)"
            />
          ))}

          {/* Fingerings (Dots) */}
          {voicing.map((fret, sIndex) => {
            if (fret === null) {
               // Show 'X' for muted strings
               return (
                <text
                  key={`muted-${sIndex}`}
                  x={margin.left - 20}
                  y={margin.top + sIndex * stringSpacing + 5}
                  fill="rgba(255,255,255,0.2)"
                  fontSize="12"
                  fontWeight="bold"
                >
                  X
                </text>
               );
            }
            if (fret === 0) {
              // Open string marker (Turquoise Ring)
              return (
                <circle
                  key={`open-${sIndex}`}
                  cx={margin.left - 15}
                  cy={margin.top + sIndex * stringSpacing}
                  r={6}
                  fill="none"
                  stroke="#00f5d4"
                  strokeWidth="2"
                />
              );
            }
            
            // Fret marker (Turquoise Solid)
            return (
              <circle
                key={`fret-${sIndex}-${fret}`}
                cx={margin.left + (fret - 0.5) * fretWidth}
                cy={margin.top + sIndex * stringSpacing}
                r={10}
                fill="#00f5d4"
                className="drop-shadow-[0_0_8px_rgba(0,245,212,0.6)]"
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex justify-between px-10 text-[10px] uppercase font-black tracking-widest text-white/20">
        <span>Fret 1</span>
        <span>Fret 5</span>
        <span>Fret 12</span>
      </div>
    </div>
  );
}
