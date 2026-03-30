"use client";

import { Suspense } from "react";
import { VoiceToNotesPro } from "@/components/voice-to-notes/VoiceToNotesPro";

export const dynamic = 'force-dynamic';

function VoiceToNotesFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="h-96 animate-pulse bg-white/5 rounded-3xl" />
    </div>
  );
}

export default function VoiceToNotesPage() {
  return (
    <Suspense fallback={<VoiceToNotesFallback />}>
      <VoiceToNotesPro />
    </Suspense>
  );
}
