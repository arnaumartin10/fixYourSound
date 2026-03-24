import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AudioEngineProvider } from "@/context/AudioEngineContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FixYourSound",
  description: "Semantic DSP engine for audio enhancement",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AudioEngineProvider>{children}</AudioEngineProvider>
      </body>
    </html>
  );
}
