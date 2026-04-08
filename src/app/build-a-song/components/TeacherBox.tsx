"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Sparkles, RefreshCw } from "lucide-react";
import { useCompletion } from "@ai-sdk/react";

interface TeacherBoxProps {
  stage: number;
  context?: {
    genre?: string;
    key?: string;
    chords?: string;
    beat?: string;
  };
}

const STAGE_TITLES = [
  "Let's talk about Chords & Genre!",
  "The backbone of rhythm 🥁",
  "Melody meets Bassline",
  "Welcome to your Mini-DAW!",
  "Sound is emotion — choose wisely",
];

export function TeacherBox({ stage, context }: TeacherBoxProps) {
  const prevStageRef = useRef<number>(-1);

  const { completion, complete, isLoading } = useCompletion({
    api: "/api/build-song/teacher",
  });

  const generateLesson = () => {
    complete(JSON.stringify({ stage, context }));
  };

  // Fetch when stage changes
  useEffect(() => {
    if (stage !== prevStageRef.current) {
      prevStageRef.current = stage;
      generateLesson();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl overflow-hidden border border-[#9d4edd]/30 bg-gradient-to-br from-[#0d0518] to-[#0a0a0a]"
    >
      {/* Glow BG */}
      <div className="absolute top-0 left-0 w-64 h-32 bg-[#9d4edd]/10 rounded-full blur-3xl -ml-16 -mt-8 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#9d4edd]/20 relative z-10">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <motion.div
            animate={{
              boxShadow: ["0 0 10px rgba(157,78,237,0.4)", "0 0 20px rgba(157,78,237,0.8)", "0 0 10px rgba(157,78,237,0.4)"],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9d4edd] to-[#00f5d4] flex items-center justify-center"
          >
            <GraduationCap size={18} className="text-white" />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#00f5d4] rounded-full border-2 border-[#0a0a0a]"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#9d4edd] uppercase tracking-widest">Maestro</span>
            <Sparkles size={10} className="text-[#9d4edd] animate-pulse" />
          </div>
          <p className="text-sm font-bold text-white/80 truncate">{STAGE_TITLES[stage] ?? STAGE_TITLES[0]}</p>
        </div>

        <button
          onClick={generateLesson}
          disabled={isLoading}
          title="Refresh explanation"
          className="p-2 rounded-xl bg-white/5 hover:bg-[#9d4edd]/20 border border-white/10 hover:border-[#9d4edd]/30 text-white/40 hover:text-[#9d4edd] transition-all disabled:opacity-30"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Lesson text */}
      <div className="px-5 py-4 min-h-[80px] relative z-10">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    className="w-2 h-2 bg-[#9d4edd]/60 rounded-full"
                  />
                ))}
              </div>
              <span className="text-xs text-white/30 font-medium">Maestro is thinking...</span>
            </motion.div>
          ) : (
            <motion.p
              key={`lesson-${stage}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-white/75 leading-relaxed font-medium"
            >
              {completion || "🎵 Welcome! Let's build your song together. Pick an option to begin. 🚀"}
              {isLoading && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                  className="inline-block w-0.5 h-4 bg-[#9d4edd] ml-0.5 align-middle"
                />
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
