import MidiWriter from "midi-writer-js";
import type {
  DetectedNoteSegment,
  VoiceToNotesMidiExportOptions,
} from "./types";
import { Note } from "tonal";
import { clamp, centsToPitchBendNormalized } from "./pitchUtils";

const TICKS_PER_BEAT = 128;
const TIME_SIGNATURE_NUMERATOR = 4;
const TIME_SIGNATURE_DENOMINATOR = 4;
const MIDICLOCKS_PER_TICK = 24;
const NOTES_PER_MIDICLOCK = 8;

function beatFromSec(sec: number, bpm: number) {
  return (sec * bpm) / 60;
}

function beatsToTicks(beats: number) {
  return Math.round(beats * TICKS_PER_BEAT);
}

function quantStepBeats(quantization: "8" | "16") {
  // 1/8 => eighth note grid => 0.5 beat. 1/16 => sixteenth note grid => 0.25 beat.
  return quantization === "8" ? 0.5 : 0.25;
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function velocity127ToMidiWriterVelocity(velocity127: number) {
  const v = clamp(Math.round(velocity127), 0, 127);
  // midi-writer expects 1..100.
  return clamp(Math.round((v / 127) * 99) + 1, 1, 100);
}

function uniqueSortedByTick(points: Array<{ tick: number; bend: number }>) {
  const sorted = [...points].sort((a, b) => a.tick - b.tick);
  const out: Array<{ tick: number; bend: number }> = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && last.tick === p.tick) {
      last.bend = p.bend; // keep latest bend for the same tick
    } else {
      out.push(p);
    }
  }
  return out;
}

/**
 * Builds a monophonic MIDI melody track from detected note segments.
 * Notes are quantized to the requested grid; pitch bend is scheduled by splitting
 * each quantized note into bend-controlled segments.
 */
export function generateMidiFileFromSegments(
  segments: DetectedNoteSegment[],
  options: VoiceToNotesMidiExportOptions
): Uint8Array {
  const sorted = [...segments].sort((a, b) => a.startTimeSec - b.startTimeSec);

  const bpm = clamp(options.bpm, 30, 300);
  const quantization = options.quantization;
  const stepBeats = quantStepBeats(quantization);

  const track = new MidiWriter.Track();
  track.setTempo(bpm);
  track.setTimeSignature(
    TIME_SIGNATURE_NUMERATOR,
    TIME_SIGNATURE_DENOMINATOR,
    MIDICLOCKS_PER_TICK,
    NOTES_PER_MIDICLOCK
  );

  // A sane default instrument (acoustic grand piano).
  track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));
  track.addTrackName("Voice-to-Notes Melody");

  let prevEndTick = 0;

  for (const seg of sorted) {
    const rawDurationSec = seg.endTimeSec - seg.startTimeSec;
    if (rawDurationSec <= 0) continue;

    const startBeat = beatFromSec(seg.startTimeSec, bpm);
    const endBeat = beatFromSec(seg.endTimeSec, bpm);
    const rawDurBeats = Math.max(0.0001, endBeat - startBeat);

    // Quantize to the chosen grid.
    let quantStartBeat = roundToStep(startBeat, stepBeats);
    let quantDurBeats = roundToStep(rawDurBeats, stepBeats);
    quantDurBeats = Math.max(stepBeats, quantDurBeats);

    // Prevent negative/overlapping time: keep notes sequential.
    const quantStartTick = Math.max(
      0,
      Math.round(quantStartBeat * TICKS_PER_BEAT)
    );
    const quantEndTick = quantStartTick + beatsToTicks(quantDurBeats);

    const safeStartTick = Math.max(quantStartTick, prevEndTick);
    const safeDurationTicks = Math.max(1, quantEndTick - safeStartTick);

    // If the quantized duration became too small, skip.
    if (safeDurationTicks <= 0) continue;

    const notePitch = Note.fromMidi(seg.midiInt);
    if (!notePitch) continue;

    // Build pitch bend points inside the *quantized* note duration.
    const durationTicks = safeDurationTicks;
    const firstCents = seg.pitchCentsSeries.length ? seg.pitchCentsSeries[0].cents : seg.firstCents;
    const lastCents = seg.pitchCentsSeries.length
      ? seg.pitchCentsSeries[seg.pitchCentsSeries.length - 1].cents
      : seg.lastCents;

    const bendPointsBase: Array<{ tick: number; bend: number }> = [];

    // Always include start/end so the bend holds through gaps.
    bendPointsBase.push({
      tick: 0,
      bend: centsToPitchBendNormalized(firstCents, options.pitchBendRangeSemis),
    });
    bendPointsBase.push({
      tick: durationTicks,
      bend: centsToPitchBendNormalized(lastCents, options.pitchBendRangeSemis),
    });

    for (const p of seg.pitchCentsSeries) {
      const ratio = clamp(p.tSecWithinNote / rawDurationSec, 0, 1);
      const tick = Math.round(ratio * durationTicks);
      bendPointsBase.push({
        tick,
        bend: centsToPitchBendNormalized(p.cents, options.pitchBendRangeSemis),
      });
    }

    const bendPoints = uniqueSortedByTick(bendPointsBase).filter(
      (p) => p.tick >= 0 && p.tick <= durationTicks
    );

    // Optional: reduce dense bend points.
    const MAX_BEND_POINTS = 24;
    let finalBendPoints = bendPoints;
    if (bendPoints.length > MAX_BEND_POINTS) {
      const keep: typeof bendPoints = [];
      for (let i = 0; i < bendPoints.length; i += 1) {
        const p = bendPoints[i];
        if (i === 0 || i === bendPoints.length - 1) keep.push(p);
      }
      const inner = bendPoints.slice(1, -1);
      const stride = Math.ceil(inner.length / (MAX_BEND_POINTS - 2));
      for (let i = 0; i < inner.length; i += stride) {
        keep.push(inner[i]);
      }
      keep.sort((a, b) => a.tick - b.tick);
      finalBendPoints = keep;
    }

    const bendVelocityAtStart = finalBendPoints[0]?.bend ?? 0;
    const gapTicks = Math.max(0, safeStartTick - prevEndTick);

    // Schedule pitch bend and (optionally) expression at the note start.
    track.addEvent(
      new MidiWriter.PitchBendEvent({
        bend: clamp(bendVelocityAtStart, -1, 1),
        delta: gapTicks,
      })
    );

    if (options.includeExpressionCC7) {
      track.addEvent(
        new MidiWriter.ControllerChangeEvent({
          controllerNumber: 7,
          controllerValue: clamp(Math.round(seg.velocity127), 0, 127),
          channel: options.channel,
          delta: 0,
        })
      );
    }

    const velocity = velocity127ToMidiWriterVelocity(seg.velocity127);

    for (let i = 0; i < finalBendPoints.length - 1; i += 1) {
      const thisPoint = finalBendPoints[i];
      const nextPoint = finalBendPoints[i + 1];
      const segTicks = nextPoint.tick - thisPoint.tick;
      if (segTicks <= 0) continue;

      track.addEvent(
        new MidiWriter.NoteEvent({
          pitch: [notePitch],
          duration: `T${segTicks}`,
          velocity,
          channel: options.channel,
        })
      );

      if (i < finalBendPoints.length - 2) {
        track.addEvent(
          new MidiWriter.PitchBendEvent({
            bend: clamp(nextPoint.bend, -1, 1),
            delta: 0,
          })
        );
      }
    }

    prevEndTick = safeStartTick + durationTicks;
  }

  const writer = new MidiWriter.Writer(track);
  return writer.buildFile();
}

