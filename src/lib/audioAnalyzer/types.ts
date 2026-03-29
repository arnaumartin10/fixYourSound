/**
 * Types for Song Analyzer module
 */

export interface AnalysisResult {
  bpm: number;
  key: DetectedKey | null;
  loudness: LoudnessMetrics;
  timestamp: number;
}

export interface DetectedKey {
  note: string; // e.g., "C", "G", "F#"
  mode: "major" | "minor"; // e.g., "major", "minor"
  confidence: number; // 0..1
}

export interface LoudnessMetrics {
  peakLevel: number; // dB
  rmsLevel: number; // dB
  loudnessValue: number; // simplified 0-100 scale
}

export interface ProducerInsight {
  tip: string;
  vibe: string;
  recommendation: string;
}

export interface TapTempoState {
  taps: number[];
  currentBpm: number | null;
  isActive: boolean;
}
