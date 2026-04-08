"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { Sparkles, Music2, GraduationCap } from "lucide-react";
import { SongBuilder } from "./components/SongBuilder";

function BuildASongContent() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header section */}
      <div className="relative pt-28 pb-12 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,245,212,0.06)_0%,transparent_70%)]" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-[#9d4edd]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9d4edd]/10 rounded-full border border-[#9d4edd]/20 text-[10px] font-black uppercase tracking-widest text-[#9d4edd] mb-6"
          >
            <GraduationCap size={10} />
            AI-Guided Studio Experience
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-none">
              LET&apos;S BUILD<br />
              <span className="text-[#00f5d4] drop-shadow-[0_0_40px_rgba(0,245,212,0.4)]">A SONG.</span>
            </h1>
            <p className="text-lg text-white/50 max-w-2xl leading-relaxed">
              A guided, step-by-step journey where your AI teacher{" "}
              <span className="text-[#9d4edd] font-bold">Maestro</span> explains music production
              as you build a complete 8-bar loop — from genre to final sound design.
            </p>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-wrap gap-3 mt-8"
          >
            {[
              { icon: Music2, label: "5 Interactive Stages" },
              { icon: GraduationCap, label: "AI Teacher Explanations" },
              { icon: Sparkles, label: "Genre-Aware Suggestions" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs font-bold text-white/60">
                <Icon size={12} className="text-[#00f5d4]" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#00f5d4]/20 to-transparent" />

      {/* Main wizard */}
      <div className="container mx-auto max-w-6xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6 md:p-10 shadow-2xl"
        >
          <SongBuilder />
        </motion.div>
      </div>
    </div>
  );
}

export default function BuildASongPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-[#00f5d4]/20 border-t-[#00f5d4] rounded-full animate-spin" />
            <p className="text-white/30 text-sm font-bold">Loading Studio…</p>
          </div>
        </div>
      }
    >
      <BuildASongContent />
    </Suspense>
  );
}
