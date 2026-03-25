"use client";

import { Note } from "tonal";
import type { DetectedNoteSegment } from "@/lib/voiceToNotes/types";

export function MelodySummaryTable({ segments }: { segments: DetectedNoteSegment[] }) {
  const sorted = [...segments].sort((a, b) => a.startTimeSec - b.startTimeSec);

  return (
    <section className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl">
      <h3 className="text-sm font-black uppercase tracking-widest text-[#9d4edd] mb-4">
        Melody Summary
      </h3>

      <div className="overflow-auto max-h-[420px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#0a0a0a]">
            <tr className="text-white/40 border-b border-white/10">
              <th className="py-2 text-left font-bold uppercase tracking-wider">Note</th>
              <th className="py-2 text-left font-bold uppercase tracking-wider">Time</th>
              <th className="py-2 text-left font-bold uppercase tracking-wider">Duration</th>
              <th className="py-2 text-left font-bold uppercase tracking-wider">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-white/30">
                  No notes detected yet.
                </td>
              </tr>
            ) : (
              sorted.map((seg, idx) => {
                const durationSec = Math.max(0, seg.endTimeSec - seg.startTimeSec);
                return (
                  <tr
                    key={`${seg.midiInt}-${seg.startTimeSec}-${idx}`}
                    className="border-b border-white/5"
                  >
                    <td className="py-3 text-white/85 font-medium">
                      <span className="text-[#00f5d4] font-black">
                        {Note.fromMidi(seg.midiInt)}
                      </span>
                    </td>
                    <td className="py-3 text-white/50">{seg.startTimeSec.toFixed(2)}s</td>
                    <td className="py-3 text-white/50">{durationSec.toFixed(2)}s</td>
                    <td className="py-3 text-white/50">{Math.round(seg.confidence * 100)}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

