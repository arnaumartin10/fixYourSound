"use client";

import { motion } from "framer-motion";

interface BypassToggleProps {
  isBypassed: boolean;
  onToggle: (bypassed: boolean) => void;
  isLoading?: boolean;
}

export function BypassToggle({ isBypassed, onToggle, isLoading = false }: BypassToggleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex items-center justify-center gap-4 p-4 bg-[#0a0a0a] border border-white/5 rounded-xl backdrop-blur-sm"
    >
      <div className="flex-1">
        <p className="font-black text-white text-sm">GLOBAL BYPASS TOGGLE</p>
        <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest mt-1">Compare original vs processed audio</p>
      </div>

      <button
        onClick={() => onToggle(!isBypassed)}
        disabled={isLoading}
        className="relative w-16 h-8 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 rounded-full transition-all duration-300 flex items-center px-1 gap-1 group"
      >
        <motion.div
          animate={{
            x: isBypassed ? 0 : 28,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`w-6 h-6 rounded-full transition-colors duration-300 ${
            isBypassed ? "bg-white/30" : "bg-[#00f5d4]"
          }`}
        />
        <span
          className={`absolute text-xs font-bold transition-colors duration-300 ${
            isBypassed ? "left-1 text-white/40" : "right-1 text-black"
          }`}
        >
          {isBypassed ? "[DRY]" : "[WET]"}
        </span>
      </button>

      <div className="flex gap-2 text-xs">
        <span className={`px-2 py-1 rounded font-mono ${isBypassed ? "bg-white/10 text-white/40" : ""}`}>
          Original
        </span>
        <span className={`px-2 py-1 rounded font-mono ${!isBypassed ? "bg-[#00f5d4]/20 text-[#00f5d4]" : ""}`}>
          Processed
        </span>
      </div>
    </motion.div>
  );
}
