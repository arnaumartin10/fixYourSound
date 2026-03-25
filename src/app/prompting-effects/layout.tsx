"use client";

import { AudioEngineProvider } from "@/context/AudioEngineContext";

export default function AudioLayout({ children }: { children: React.ReactNode }) {
  return <AudioEngineProvider>{children}</AudioEngineProvider>;
}
