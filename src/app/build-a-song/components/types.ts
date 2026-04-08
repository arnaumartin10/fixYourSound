// ─── Shared types for the "Let's Build a Song" wizard ─────────────────────────

export interface ChordProgression {
  chords: ProgressionChord[];
  strummingIdea?: string;
  label?: string; // e.g. "Option A"
}

export interface ProgressionChord {
  chord: string;
  explanation: string;
}

export interface BeatTrack {
  instrument: string;
  steps: boolean[];
}

export interface Beat {
  explanation: string;
  tempo: number;
  kitType?: string;
  drumKit: string;
  bars: number;
  tracks: BeatTrack[];
}

export interface MelodyNote {
  pitch: string;
  startTime: number;
  duration: number;
}

export interface MelodyOption {
  lead: MelodyNote[];
  bassline: MelodyNote[];
  bpm: number;
  timeSignature: string;
  label?: string;
}

export interface SoundPreset {
  label: string;
  role: "lead" | "chords" | "bass";
  params: Record<string, unknown>;
  explanation: string;
  mode: "synth" | "guitar";
}

export interface SelectedSounds {
  lead: SoundPreset | null;
  chords: SoundPreset | null;
  bass: SoundPreset | null;
}

export interface SongState {
  // Stage 1
  genre: string;
  key: string;
  tempo: number;

  // Stage 1 output
  chordOptions: ChordProgression[];
  selectedChordOption: ChordProgression | null;

  // Stage 2 output
  beatOptions: Beat[];
  selectedBeat: Beat | null;

  // Stage 3 output
  melodyOptions: MelodyOption[];
  selectedMelody: MelodyOption | null;

  // Stage 5 output
  soundPresets: {
    lead: SoundPreset[];
    chords: SoundPreset[];
    bass: SoundPreset[];
  };
  selectedSounds: SelectedSounds;
}

export const INITIAL_SONG_STATE: SongState = {
  genre: "",
  key: "C major",
  tempo: 120,
  chordOptions: [],
  selectedChordOption: null,
  beatOptions: [],
  selectedBeat: null,
  melodyOptions: [],
  selectedMelody: null,
  soundPresets: { lead: [], chords: [], bass: [] },
  selectedSounds: { lead: null, chords: null, bass: null },
};

export const STAGES = [
  { label: "Genre & Vibe", short: "Genre" },
  { label: "The Rhythm", short: "Beats" },
  { label: "Melody & Bass", short: "Melody" },
  { label: "Mini-DAW", short: "DAW" },
  { label: "Sound Design", short: "Sounds" },
];

export const SCALES = [
  "C major", "G major", "D major", "A major", "E major", "B major", "F# major",
  "F major", "Bb major", "Eb major", "Ab major", "Db major",
  "A minor", "E minor", "B minor", "F# minor", "C# minor",
  "D minor", "G minor", "C minor", "F minor", "Bb minor",
];
