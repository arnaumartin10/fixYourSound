import type { DetectedNoteSegment } from "./types";
import { Note } from "tonal";

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]; // natural minor

function pitchClass(midiInt: number) {
  return ((midiInt % 12) + 12) % 12;
}

function tonicNameFromPitchClass(pc: number) {
  // Force tonal to use the expected spelling via midi -> note name.
  // We pick octave 4; we only keep the pitch-class name.
  const full = Note.fromMidi(60 + pc); // base octave
  // `fromMidi` returns e.g. "Eb4" => strip trailing digits.
  return full.replace(/[0-9]/g, "");
}

export interface DetectedKey {
  tonic: string;
  mode: "major" | "minor";
  confidence: number; // 0..1 heuristic
}

/**
 * Heuristic key detection from monophonic note segments.
 * Scores each key by how much energy is present on scale degrees.
 */
export function detectKeyFromSegments(segments: DetectedNoteSegment[]): DetectedKey | null {
  if (!segments.length) return null;

  const pcWeights = new Array(12).fill(0);
  for (const seg of segments) {
    const pc = pitchClass(seg.midiInt);
    const weight = seg.confidence * (seg.endTimeSec - seg.startTimeSec);
    pcWeights[pc] += weight;
  }

  let best: { tonicPc: number; mode: "major" | "minor"; score: number } | null = null;

  const keysToTry = Array.from({ length: 12 }, (_, tonicPc) => tonicPc);
  for (const tonicPc of keysToTry) {
    // Major
    {
      const scalePcs = new Set(MAJOR_SCALE.map((d) => (tonicPc + d) % 12));
      const score = pcWeights.reduce((acc, w, pc) => acc + (scalePcs.has(pc) ? w : -0.35 * w), 0);
      if (!best || score > best.score) best = { tonicPc, mode: "major", score };
    }
    // Minor
    {
      const scalePcs = new Set(MINOR_SCALE.map((d) => (tonicPc + d) % 12));
      const score = pcWeights.reduce((acc, w, pc) => acc + (scalePcs.has(pc) ? w : -0.35 * w), 0);
      if (!best || score > best.score) best = { tonicPc, mode: "minor", score };
    }
  }

  if (!best) return null;
  const totalEnergy = pcWeights.reduce((a, b) => a + b, 0) || 1;
  const normalized = clamp01(best.score / totalEnergy);

  return {
    tonic: tonicNameFromPitchClass(best.tonicPc),
    mode: best.mode,
    confidence: clamp01(normalized),
  };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

