import type {
  DetectedNoteSegment,
  PitchBendPoint,
  VoiceToNotesWorkerInit,
} from "./types";
import { clamp, velocityFromRmsDb } from "./pitchUtils";

export interface PitchFrameForSegmentation {
  timeSec: number; // analysis frame start
  hopDurationSec: number;
  midiInt: number | null;
  freqHz: number | null;
  cents: number | null;
  confidence: number; // 0..1
  rmsDb: number; // dBFS
  frameValid: boolean;
}

interface ActiveNote {
  midiInt: number;
  startTimeSec: number;

  /**
   * End time is updated on each valid frame.
   * Represents "note end" as last valid frame end (frame start + hop).
   */
  endTimeSec: number;
  lastValidTimeSec: number;

  /**
   * For voiced stats (we don't count silences).
   */
  voicedConfidenceSum: number;
  voicedFrames: number;
  voicedRmsDbSum: number;
  voicedFramesForRms: number;

  /**
   * Active silence run (consecutive invalid frames) used to end a note.
   */
  invalidRunSec: number;

  pitchCentsSeries: PitchBendPoint[];
  firstCents: number;
  firstCentsConfidence: number;
  lastCents: number;
  lastCentsConfidence: number;
}

export class NoteSegmenter {
  private readonly settings: VoiceToNotesWorkerInit;
  private readonly hopDurationSec: number;

  private active: ActiveNote | null = null;
  private segments: DetectedNoteSegment[] = [];

  private lastStoredCents: number | null = null;
  private validFrameIndexInNote = 0;

  constructor(settings: VoiceToNotesWorkerInit) {
    this.settings = settings;
    this.hopDurationSec = settings.hopSizeSamples / settings.sampleRate;
  }

  pushFrame(frame: PitchFrameForSegmentation) {
    if (!frame.frameValid || frame.midiInt === null || frame.cents === null) {
      this.handleInvalid(frame);
      return;
    }

    if (this.active === null) {
      this.startNewNote(frame);
      return;
    }

    const pitchMatches =
      frame.midiInt === this.active.midiInt &&
      Math.abs(frame.cents - this.active.lastCents) <= this.settings.pitchCentsTolerance;

    if (!pitchMatches) {
      this.closeActiveNote();
      this.startNewNote(frame);
      return;
    }

    this.addValidFrameToActive(frame);
  }

  private handleInvalid(frame: PitchFrameForSegmentation) {
    if (this.active === null) return;

    this.active.invalidRunSec += frame.hopDurationSec;
    if (this.active.invalidRunSec > this.settings.maxSilenceInsideNoteSec) {
      this.closeActiveNote();
    }
  }

  private startNewNote(frame: PitchFrameForSegmentation) {
    const midiInt = frame.midiInt!;
    const cents = frame.cents!;

    this.active = {
      midiInt,
      startTimeSec: frame.timeSec,
      endTimeSec: frame.timeSec + frame.hopDurationSec,
      lastValidTimeSec: frame.timeSec,
      voicedConfidenceSum: frame.confidence,
      voicedFrames: 1,
      voicedRmsDbSum: frame.rmsDb,
      voicedFramesForRms: 1,
      invalidRunSec: 0,
      pitchCentsSeries: [],
      firstCents: cents,
      firstCentsConfidence: frame.confidence,
      lastCents: cents,
      lastCentsConfidence: frame.confidence,
    };

    this.lastStoredCents = null;
    this.validFrameIndexInNote = 1;

    this.maybeStorePitchCents(frame);
  }

  private addValidFrameToActive(frame: PitchFrameForSegmentation) {
    if (!this.active) return;

    // Reset silence run.
    this.active.invalidRunSec = 0;

    this.active.lastValidTimeSec = frame.timeSec;
    this.active.endTimeSec = frame.timeSec + frame.hopDurationSec;
    this.active.lastCents = frame.cents!;
    this.active.lastCentsConfidence = frame.confidence;

    this.active.voicedConfidenceSum += frame.confidence;
    this.active.voicedFrames += 1;
    this.active.voicedRmsDbSum += frame.rmsDb;
    this.active.voicedFramesForRms += 1;

    this.validFrameIndexInNote += 1;
    this.maybeStorePitchCents(frame);
  }

  private maybeStorePitchCents(frame: PitchFrameForSegmentation) {
    if (!this.active || frame.cents === null) return;
    const cents = frame.cents;

    const series = this.active.pitchCentsSeries;
    if (series.length >= this.settings.maxBendPointsPerNote) return;

    const shouldDownsample =
      this.validFrameIndexInNote % Math.max(1, this.settings.bendDownsampleEveryFrames) === 0;

    const deltaEnough =
      this.lastStoredCents === null ||
      Math.abs(cents - this.lastStoredCents) >= this.settings.bendCentsChangeThreshold;

    if (shouldDownsample || deltaEnough) {
      const tWithin = frame.timeSec - this.active.startTimeSec;
      const point: PitchBendPoint = {
        tSecWithinNote: clamp(tWithin, 0, frame.timeSec - this.active.startTimeSec),
        cents,
        confidence: frame.confidence,
      };
      series.push(point);
      this.lastStoredCents = cents;
    }
  }

  private closeActiveNote() {
    if (!this.active) return;

    const durationSec = this.active.endTimeSec - this.active.startTimeSec;
    if (durationSec >= this.settings.minNoteDurationSec) {
      const confidence =
        this.active.voicedFrames > 0
          ? this.active.voicedConfidenceSum / this.active.voicedFrames
          : 0;
      const avgRmsDb =
        this.active.voicedFramesForRms > 0
          ? this.active.voicedRmsDbSum / this.active.voicedFramesForRms
          : -Infinity;

      // Ensure automation has at least start and end points so pitch-bend holds correctly
      // through any post-quantization duration extensions (gap filling).
      const eps = 1e-6;
      const voicedSeries = this.active.pitchCentsSeries
        .map((p) => ({ ...p }))
        .filter((p) => p.tSecWithinNote >= -eps && p.tSecWithinNote <= durationSec + eps);

      const hasStart = voicedSeries.some((p) => Math.abs(p.tSecWithinNote - 0) < 1e-4);
      const hasEnd = voicedSeries.some((p) => Math.abs(p.tSecWithinNote - durationSec) < 1e-4);

      if (!hasStart) {
        voicedSeries.push({
          tSecWithinNote: 0,
          cents: this.active.firstCents,
          confidence: this.active.firstCentsConfidence,
        });
      }
      if (!hasEnd) {
        voicedSeries.push({
          tSecWithinNote: durationSec,
          cents: this.active.lastCents,
          confidence: this.active.lastCentsConfidence,
        });
      }

      voicedSeries.sort((a, b) => a.tSecWithinNote - b.tSecWithinNote);

      const velocity127 = velocityFromRmsDb(avgRmsDb);

      const segment: DetectedNoteSegment = {
        midiInt: clamp(this.active.midiInt, 0, 127),
        startTimeSec: this.active.startTimeSec,
        endTimeSec: this.active.endTimeSec,
        confidence: clamp(confidence, 0, 1),
        velocity127,
        pitchCentsSeries: voicedSeries,
        firstCents: this.active.firstCents,
        lastCents: this.active.lastCents,
      };

      this.segments.push(segment);
    }

    this.active = null;
    this.lastStoredCents = null;
    this.validFrameIndexInNote = 0;
  }

  /**
   * Finalize all pending notes and apply gap-filling merges.
   */
  flush(): DetectedNoteSegment[] {
    if (this.active) this.closeActiveNote();

    // Ensure time order.
    const sorted = [...this.segments].sort((a, b) => a.startTimeSec - b.startTimeSec);

    // Gap filling: merge same-pitch consecutive notes if the gap is small.
    const merged: DetectedNoteSegment[] = [];
    for (const seg of sorted) {
      const prev = merged[merged.length - 1];
      if (!prev) {
        merged.push(seg);
        continue;
      }

      const samePitch = seg.midiInt === prev.midiInt;
      const gapSec = seg.startTimeSec - prev.endTimeSec;
      if (samePitch && gapSec >= 0 && gapSec <= this.settings.gapFillSec) {
        const newStart = prev.startTimeSec;
        const newEnd = seg.endTimeSec;
        const mergedDurationSec = newEnd - newStart;

        const prevVoicedDur = prev.endTimeSec - prev.startTimeSec;
        const segVoicedDur = seg.endTimeSec - seg.startTimeSec;
        const totalVoiced = prevVoicedDur + segVoicedDur;

        const confidence =
          totalVoiced > 0
            ? (prev.confidence * prevVoicedDur + seg.confidence * segVoicedDur) / totalVoiced
            : (prev.confidence + seg.confidence) / 2;

        const velocity127 = Math.max(prev.velocity127, seg.velocity127);

        const mergedPitchSeries: PitchBendPoint[] = [...prev.pitchCentsSeries];
        const shift = prevVoicedDur + gapSec; // how much to move seg's relative timestamps
        for (const p of seg.pitchCentsSeries) {
          mergedPitchSeries.push({
            ...p,
            tSecWithinNote: p.tSecWithinNote + shift,
          });
        }

        // Ensure at least start/end points exist in bend automation.
        const firstCents = prev.firstCents;
        const lastCents = seg.lastCents;

        // Sort by time and clamp.
        mergedPitchSeries.sort((a, b) => a.tSecWithinNote - b.tSecWithinNote);
        const deduped: PitchBendPoint[] = [];
        for (const p of mergedPitchSeries) {
          if (deduped.length === 0) {
            deduped.push(p);
            continue;
          }
          const last = deduped[deduped.length - 1];
          if (Math.abs(p.tSecWithinNote - last.tSecWithinNote) < 1e-6) {
            deduped[deduped.length - 1] = p;
          } else {
            deduped.push(p);
          }
        }

        merged[merged.length - 1] = {
          midiInt: prev.midiInt,
          startTimeSec: newStart,
          endTimeSec: newEnd,
          confidence: clamp(confidence, 0, 1),
          velocity127,
          pitchCentsSeries: deduped,
          firstCents,
          lastCents,
        };

        // Silence extension has no pitch data; pitch bends will hold last observed cents until
        // the next voiced point (handled during MIDI export).
        // eslint-disable-next-line no-continue
        continue;
      }

      merged.push(seg);
    }

    return merged.map((s) => {
      const dur = s.endTimeSec - s.startTimeSec;

      const filtered = s.pitchCentsSeries
        .filter((p) => p.tSecWithinNote >= 0 && p.tSecWithinNote <= dur + 1e-6)
        .sort((a, b) => a.tSecWithinNote - b.tSecWithinNote);

      if (filtered.length <= this.settings.maxBendPointsPerNote) {
        return { ...s, pitchCentsSeries: filtered };
      }

      const max = this.settings.maxBendPointsPerNote;
      const out: typeof filtered = [filtered[0], filtered[filtered.length - 1]];
      const inner = filtered.slice(1, -1);
      const stride = Math.ceil(inner.length / Math.max(1, max - 2));
      for (let i = 0; i < inner.length; i += stride) {
        out.push(inner[i]);
      }
      out.sort((a, b) => a.tSecWithinNote - b.tSecWithinNote);
      return { ...s, pitchCentsSeries: out };
    });
  }
}

