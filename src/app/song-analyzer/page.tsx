import type { Metadata } from "next";
import SongAnalyzer from "@/components/SongAnalyzer";

export const metadata: Metadata = {
  title: "Song Analyzer — FixYourSound",
  description:
    "Instantly detect the BPM, Key, and Loudness of any audio file. Use Tap Tempo to find your rhythm and get AI-powered producer tips tailored to your track.",
};

export default function SongAnalyzerPage() {
  return <SongAnalyzer />;
}
