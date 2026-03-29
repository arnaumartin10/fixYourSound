"use client";

import React, { useMemo } from "react";
import * as Tone from "tone";

interface MelodyNote {
  pitch: string;
  startTime: number;
  duration: number;
}

interface PianoRollProps {
  lead: MelodyNote[];
  bassline: MelodyNote[];
  bpm: number;
  currentTime: number;
  maxTime?: number;
}

// All piano notes from C2 to C6
const PIANO_NOTES = [
  "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2",
  "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
  "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4",
  "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5",
  "C6", "C#6", "D6", "D#6", "E6",
];

export function PianoRoll({
  lead,
  bassline,
  bpm,
  currentTime,
  maxTime = 8,
}: PianoRollProps) {
  const pixelsPerBeat = 80; // Pixels per beat on x-axis
  const pixelsPerNote = 20; // Pixels per note on y-axis

  // Get the min and max pitches to display only the relevant range
  const allMelodies = [...lead, ...bassline];
  const pitchIndices = allMelodies
    .map((note) => PIANO_NOTES.indexOf(note.pitch))
    .filter((idx) => idx !== -1);

  const minPitchIdx = pitchIndices.length > 0 ? Math.min(...pitchIndices) : 36; // C4 by default
  const maxPitchIdx = pitchIndices.length > 0 ? Math.max(...pitchIndices) : 48; // C5 by default

  // Show 12 notes range (one octave) or extend if needed
  const displayRange = Math.max(12, maxPitchIdx - minPitchIdx + 2);
  const displayStartIdx = Math.max(0, minPitchIdx - 1);
  const displayEndIdx = Math.min(PIANO_NOTES.length, displayStartIdx + displayRange);

  const visibleNotes = PIANO_NOTES.slice(displayStartIdx, displayEndIdx);

  const getNotePosition = (pitchName: string) => {
    const idx = PIANO_NOTES.indexOf(pitchName);
    if (idx === -1) return null;
    const relativeIdx = idx - displayStartIdx;
    return relativeIdx >= 0 && relativeIdx < visibleNotes.length ? relativeIdx : null;
  };

  const width = maxTime * pixelsPerBeat;
  const height = visibleNotes.length * pixelsPerNote;

  // Playhead position
  const playheadX = (currentTime / maxTime) * width;

  return (
    <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6 overflow-x-auto">
      <div className="relative" style={{ width, height: height + 40 }}>
        {/* Background grid */}
        <svg
          className="absolute top-10 left-0 pointer-events-none"
          width={width}
          height={height}
          style={{ background: "rgba(255,255,255,0.01)" }}
        >
          {/* Beat lines (vertical) */}
          {Array.from({ length: maxTime + 1 }).map((_, i) => (
            <line
              key={`beat-${i}`}
              x1={i * pixelsPerBeat}
              y1="0"
              x2={i * pixelsPerBeat}
              y2={height}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          ))}
          {/* Note lines (horizontal) */}
          {visibleNotes.map((_, i) => (
            <line
              key={`note-${i}`}
              x1="0"
              y1={i * pixelsPerNote}
              x2={width}
              y2={i * pixelsPerNote}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Note names (left sidebar) */}
        <div className="absolute left-0 top-10" style={{ width: 60 }}>
          {visibleNotes.map((note, i) => (
            <div
              key={note}
              className="text-[10px] font-bold text-white/40 h-[20px] flex items-center justify-end pr-2 border-b border-white/5"
              style={{ height: pixelsPerNote }}
            >
              {note}
            </div>
          ))}
        </div>

        {/* Beat numbers (top) */}
        <div className="absolute top-0 left-0 h-10 flex">
          {Array.from({ length: maxTime }).map((_, i) => (
            <div
              key={`beat-label-${i}`}
              className="text-[10px] font-bold text-white/30 flex items-center justify-center"
              style={{ width: pixelsPerBeat }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Piano roll notes - Bassline (blue) */}
        {bassline.map((note, idx) => {
          const yPos = getNotePosition(note.pitch);
          if (yPos === null) return null;

          const x = note.startTime * pixelsPerBeat + 60;
          const y = yPos * pixelsPerNote + 40;
          const noteWidth = note.duration * pixelsPerBeat - 2;

          return (
            <div
              key={`bassline-${idx}`}
              className="absolute bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg border border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.4)] hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all opacity-90 hover:opacity-100 cursor-pointer group"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${Math.max(20, noteWidth)}px`,
                height: `${pixelsPerNote - 2}px`,
              }}
              title={`Bassline: ${note.pitch} (${note.duration} beat${note.duration !== 1 ? "s" : ""})`}
            >
              <div className="text-[9px] font-bold text-white px-1 py-0.5 overflow-hidden truncate">
                {note.pitch}
              </div>
            </div>
          );
        })}

        {/* Piano roll notes - Lead (cyan) */}
        {lead.map((note, idx) => {
          const yPos = getNotePosition(note.pitch);
          if (yPos === null) return null;

          const x = note.startTime * pixelsPerBeat + 60;
          const y = yPos * pixelsPerNote + 40;
          const noteWidth = note.duration * pixelsPerBeat - 2;

          return (
            <div
              key={`lead-${idx}`}
              className="absolute bg-gradient-to-r from-[#00f5d4] to-cyan-400 rounded-lg border border-[#00f5d4]/60 shadow-[0_0_12px_rgba(0,245,212,0.4)] hover:shadow-[0_0_20px_rgba(0,245,212,0.6)] transition-all opacity-90 hover:opacity-100 cursor-pointer group"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${Math.max(20, noteWidth)}px`,
                height: `${pixelsPerNote - 2}px`,
              }}
              title={`Lead: ${note.pitch} (${note.duration} beat${note.duration !== 1 ? "s" : ""})`}
            >
              <div className="text-[9px] font-bold text-black px-1 py-0.5 overflow-hidden truncate">
                {note.pitch}
              </div>
            </div>
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 w-0.5 h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] pointer-events-none z-20"
          style={{ left: `${playheadX + 60}px` }}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-4 px-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-[#00f5d4] to-cyan-400 rounded border border-[#00f5d4]/60" />
          <span className="text-white/60">Lead Melody</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded border border-blue-400/50" />
          <span className="text-white/60">Bassline</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-red-500 rounded-sm" />
          <span className="text-white/60">Playhead</span>
        </div>
      </div>
    </div>
  );
}
