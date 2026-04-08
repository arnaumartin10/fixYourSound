"use client";

import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import { STAGES } from "./types";

interface StageNavProps {
  currentStage: number;
  completedStages: Set<number>;
  onStageClick: (stage: number) => void;
}

export function StageNav({ currentStage, completedStages, onStageClick }: StageNavProps) {
  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute top-5 left-0 right-0 h-px bg-white/5 hidden md:block" />

      <div className="flex items-start justify-between gap-2 relative z-10">
        {STAGES.map((stage, idx) => {
          const isCompleted = completedStages.has(idx);
          const isCurrent = currentStage === idx;
          const isLocked = idx > currentStage && !completedStages.has(idx);
          const isClickable = isCompleted || isCurrent;

          return (
            <button
              key={idx}
              onClick={() => isClickable && onStageClick(idx)}
              disabled={!isClickable}
              className="flex flex-col items-center gap-2 flex-1 group"
            >
              {/* Circle */}
              <div className="relative">
                <motion.div
                  animate={{
                    scale: isCurrent ? 1.15 : 1,
                    boxShadow: isCurrent
                      ? "0 0 20px rgba(0,245,212,0.5)"
                      : isCompleted
                      ? "0 0 10px rgba(0,245,212,0.2)"
                      : "none",
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all border-2 ${
                    isCurrent
                      ? "bg-[#00f5d4] border-[#00f5d4] text-black"
                      : isCompleted
                      ? "bg-[#00f5d4]/20 border-[#00f5d4]/60 text-[#00f5d4]"
                      : "bg-white/5 border-white/10 text-white/30"
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <Check size={16} />
                  ) : isLocked ? (
                    <Lock size={12} />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </motion.div>

                {isCurrent && (
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-[#00f5d4]/30"
                  />
                )}
              </div>

              {/* Label */}
              <div className="text-center">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider leading-tight block ${
                    isCurrent
                      ? "text-[#00f5d4]"
                      : isCompleted
                      ? "text-white/60"
                      : "text-white/20"
                  }`}
                >
                  <span className="hidden md:block">{stage.label}</span>
                  <span className="md:hidden">{stage.short}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
