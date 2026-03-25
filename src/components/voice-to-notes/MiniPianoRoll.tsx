"use client";

import { useMemo, useState } from "react";
import type { DetectedNoteSegment, VoiceToNotesQuantization } from "@/lib/voiceToNotes/types";
import { Note } from "tonal";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function quantStepBeats(quantization: VoiceToNotesQuantization) {
  return quantization === "8" ? 0.5 : 0.25;
}

function beatFromSec(sec: number, bpm: number) {
  return (sec * bpm) / 60;
}

export function MiniPianoRoll({
  segments,
  bpm,
  quantization,
}: {
  segments: DetectedNoteSegment[];
  bpm: number;
  quantization: VoiceToNotesQuantization;
}) {
  const [hovered, setHovered] = useState<DetectedNoteSegment | null>(null);

  const preview = useMemo(() => {
    const sorted = [...segments].sort((a, b) => a.startTimeSec - b.startTimeSec);
    const stepBeats = quantStepBeats(quantization);

    const reduced = sorted.reduce(
      (acc, seg) => {
        const startBeat = beatFromSec(seg.startTimeSec, bpm);
        const endBeat = beatFromSec(seg.endTimeSec, bpm);
        const rawDur = Math.max(0.001, endBeat - startBeat);

        const qStartRaw = roundToStep(startBeat, stepBeats);
        const qDurRaw = roundToStep(rawDur, stepBeats);
        const qDur = Math.max(stepBeats, qDurRaw);

        // Sequentialize (avoid overlaps) in preview.
        const qStart = Math.max(qStartRaw, acc.prevEndBeat);
        const qEnd = qStart + qDur;

        return {
          prevEndBeat: qEnd,
          notes: [
            ...acc.notes,
            {
              seg,
              qStartBeat: qStart,
              qDurBeat: qEnd - qStart,
              qEndBeat: qEnd,
            },
          ],
        };
      },
      { prevEndBeat: 0, notes: [] as Array<{ seg: DetectedNoteSegment; qStartBeat: number; qDurBeat: number; qEndBeat: number }> }
    );

    const notes = reduced.notes.filter((n) => n.qDurBeat > 0);

    const minMidi = notes.length ? Math.min(...notes.map((n) => n.seg.midiInt)) : 48;
    const maxMidi = notes.length ? Math.max(...notes.map((n) => n.seg.midiInt)) : 72;
    const pad = 2;
    const topMidi = clamp(maxMidi + pad, 0, 127);
    const bottomMidi = clamp(minMidi - pad, 0, 127);

    const maxEndBeat = notes.length ? Math.max(...notes.map((n) => n.qEndBeat)) : stepBeats * 8;

    return {
      notes,
      topMidi,
      bottomMidi,
      maxEndBeat,
    };
  }, [segments, bpm, quantization]);

  const rowHeight = 10;
  const pxPerBeat = 90;
  const widthPx = Math.max(520, preview.maxEndBeat * pxPerBeat);
  const rowCount = preview.topMidi - preview.bottomMidi + 1;
  const heightPx = rowCount * rowHeight + 24;

  return (
    <section className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#00f5d4]">
          Mini Piano Roll
        </h3>
        {hovered ? (
          <div className="text-xs text-white/70 font-medium">
            {Note.fromMidi(hovered.midiInt)}{" "}
            <span className="text-white/30">
              • {Math.max(0, hovered.endTimeSec - hovered.startTimeSec).toFixed(2)}s •{" "}
              {Math.round(hovered.confidence * 100)}%
            </span>
          </div>
        ) : (
          <div className="text-xs text-white/30">Hover notes</div>
        )}
      </div>

      <div className="overflow-auto">
        <div className="relative" style={{ width: widthPx, height: heightPx }}>
          {/* Background grid (subdivision) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent ${
                pxPerBeat * quantStepBeats(quantization)
              }px)`,
              pointerEvents: "none",
            }}
          />

          {/* Semitone rows */}
          {Array.from({ length: rowCount }).map((_, i) => {
            const midi = preview.topMidi - i;
            return (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={midi}
                className="absolute left-0 right-0"
                style={{
                  top: 12 + i * rowHeight,
                  height: rowHeight,
                  background: midi % 12 === 0 || midi % 12 === 5 || midi % 12 === 7 ? "rgba(255,255,255,0.02)" : "transparent",
                  borderTop: "1px solid rgba(255,255,255,0.02)",
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {/* Notes */}
          {preview.notes.map((n, idx) => {
            const left = n.qStartBeat * pxPerBeat;
            const width = Math.max(10, n.qDurBeat * pxPerBeat);
            const top = 12 + (preview.topMidi - n.seg.midiInt) * rowHeight;

            return (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={`${n.seg.midiInt}-${n.seg.startTimeSec}-${idx}`}
                className="absolute rounded-lg border border-[#00f5d4]/30 bg-[#00f5d4]/15 hover:bg-[#00f5d4]/25 transition-colors cursor-pointer"
                style={{ left, top, width, height: rowHeight - 2 }}
                onMouseEnter={() => setHovered(n.seg)}
                onMouseLeave={() => setHovered(null)}
                role="button"
                tabIndex={0}
                aria-label={`Note ${Note.fromMidi(n.seg.midiInt)}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

