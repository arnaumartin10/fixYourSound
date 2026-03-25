"use client";

import { useMemo } from "react";
import type { DetectedNoteSegment } from "@/lib/voiceToNotes/types";
import { detectKeyFromSegments } from "@/lib/voiceToNotes/keyDetection";

export function KeyDetectionCard({ segments }: { segments: DetectedNoteSegment[] }) {
  const key = useMemo(() => detectKeyFromSegments(segments), [segments]);

  if (!key) {
    return (
      <section className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl">
        <div className="text-sm font-black uppercase tracking-widest text-white/40">
          Key Detection
        </div>
        <div className="mt-3 text-sm text-white/60">Not enough data yet.</div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#00f5d4]/10 blur-[60px] rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#9d4edd]/10 blur-[60px] rounded-full" />
      <div className="relative z-10">
        <div className="text-sm font-black uppercase tracking-widest text-white/40">
          Key Detection
        </div>
        <div className="mt-4 text-2xl font-black tracking-tighter text-white">
          Your melody seems to be in{" "}
          <span className="text-[#00f5d4]">{key.tonic} {key.mode === "minor" ? "Minor" : "Major"}</span>
        </div>
        <div className="mt-2 text-xs text-white/50 font-medium">
          Heuristic confidence: {Math.round(key.confidence * 100)}%
        </div>
      </div>
    </section>
  );
}

