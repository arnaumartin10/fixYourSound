export type VoiceToNotesQuantization = "8" | "16";

export interface VoiceToNotesWorkerInit {
  type: "init";
  /**
   * Audio sample rate used for pitch analysis (Hz).
   */
  sampleRate: number;
  /**
   * Analysis window size in samples.
   */
  bufferSizeSamples: number;
  /**
   * Hop size in samples between analysis frames.
   */
  hopSizeSamples: number;

  minFrequencyHz: number;
  maxFrequencyHz: number;
  /**
   * Frames below this RMS dBFS threshold are treated as silence.
   * Typical range: -60..-20
   */
  silenceThresholdDb: number;
  /**
   * Minimum frame confidence required to consider a frame "voiced".
   */
  minFrameConfidence: number;
  /**
   * Allowed cents deviation from the nearest semitone for a frame
   * to be considered the same discrete note.
   */
  pitchCentsTolerance: number;
  /**
   * Maximum silent duration allowed *inside* a note before we end it.
   */
  maxSilenceInsideNoteSec: number;
  /**
   * If two consecutive notes have the same pitch and the gap between them
   * is <= this duration, we merge them (gap filling).
   */
  gapFillSec: number;
  /**
   * Minimum voiced duration for a note to be kept.
   */
  minNoteDurationSec: number;

  /**
   * Downsample control for pitch-bend data.
   */
  bendDownsampleEveryFrames: number;
  maxBendPointsPerNote: number;
  bendCentsChangeThreshold: number;

  /**
   * Optional: enables progress messages for file uploads.
   */
  totalDurationSec?: number;

  /**
   * Reduce UI spam: post a `frame` message only every N analysis frames.
   */
  framePostEvery: number;
}

export interface VoiceToNotesAudioChunkMessage {
  type: "audioChunk";
  /**
   * Mono PCM samples in range [-1, 1]
   */
  pcm: Float32Array;
}

export interface VoiceToNotesEndMessage {
  type: "end";
}

export type VoiceToNotesWorkerInboundMessage =
  | VoiceToNotesWorkerInit
  | VoiceToNotesAudioChunkMessage
  | VoiceToNotesEndMessage;

export interface VoiceToNotesFrameMessage {
  type: "frame";
  timeSec: number;
  midiInt: number | null;
  freqHz: number | null;
  confidence: number; // 0..1
  rmsDb: number; // dBFS
}

export interface VoiceToNotesProgressMessage {
  type: "progress";
  analyzedTimeSec: number;
  totalDurationSec?: number;
}

export interface PitchBendPoint {
  /**
   * Time inside the note (seconds).
   */
  tSecWithinNote: number;
  /**
   * Deviation from the nearest semitone (cents).
   */
  cents: number;
  confidence: number; // 0..1
}

export interface DetectedNoteSegment {
  midiInt: number; // 0..127
  startTimeSec: number;
  endTimeSec: number;
  /**
   * Voiced confidence (0..1)
   */
  confidence: number;
  /**
   * Velocity mapped to MIDI-friendly range 0..127.
   */
  velocity127: number;
  /**
   * Pitch-cents points for creating MIDI pitch-bend automation.
   */
  pitchCentsSeries: PitchBendPoint[];
  /**
   * First/last observed cents (useful when quantization extends note duration).
   */
  firstCents: number;
  lastCents: number;
}

export interface VoiceToNotesDoneMessage {
  type: "done";
  segments: DetectedNoteSegment[];
}

export type VoiceToNotesWorkerOutboundMessage =
  | VoiceToNotesFrameMessage
  | VoiceToNotesProgressMessage
  | VoiceToNotesDoneMessage;

export interface VoiceToNotesMidiExportOptions {
  bpm: number;
  quantization: VoiceToNotesQuantization;
  pitchBendRangeSemis: number;
  /**
   * Note split duration grid used for generating bend-scheduled segments.
   * Defaults to the selected quantization.
   */
  bendSchedulingGrid?: VoiceToNotesQuantization;
  channel: number; // 1..16
  includeExpressionCC7: boolean;
}

