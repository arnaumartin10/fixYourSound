"use client";

import { motion } from "framer-motion";
import { Play, Pause, Volume2, Copy, Zap, Flame, Grid3x3, TrendingUp, TrendingDown, Music, PanelsTopLeft, Shield, Wind, Sliders, Volume, ArrowUp } from "lucide-react";
import { useState } from "react";

interface GlossaryCardProps {
  id: string;
  title: string;
  definition: string;
  category: string;
  icon: string;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
}

export function GlossaryCard({
  id,
  title,
  definition,
  category,
  icon,
  isPlaying,
  onPlay,
  onStop,
  isLoading = false,
  isDisabled = false,
}: GlossaryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const iconComponents: Record<string, React.ReactNode> = {
    Volume2: <Volume2 className="w-6 h-6" />,
    Copy: <Copy className="w-6 h-6" />,
    Zap: <Zap className="w-6 h-6" />,
    Flame: <Flame className="w-6 h-6" />,
    Grid3x3: <Grid3x3 className="w-6 h-6" />,
    TrendingUp: <TrendingUp className="w-6 h-6" />,
    TrendingDown: <TrendingDown className="w-6 h-6" />,
    Music: <Music className="w-6 h-6" />,
    PanelsTopLeft: <PanelsTopLeft className="w-6 h-6" />,
    Shield: <Shield className="w-6 h-6" />,
    Wind: <Wind className="w-6 h-6" />,
    Sliders: <Sliders className="w-6 h-6" />,
    Volume: <Volume className="w-6 h-6" />,
    ArrowUp: <ArrowUp className="w-6 h-6" />,
  };

  const categoryColors: Record<string, string> = {
    Spatial: "bg-white/5 text-white/40",
    Temporal: "bg-white/5 text-white/40",
    Dynamics: "bg-white/5 text-white/40",
    Harmonic: "bg-white/5 text-white/40",
    Spectral: "bg-white/5 text-white/40",
    Modulation: "bg-white/5 text-white/40",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group cursor-pointer"
    >
      {/* Glow Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-r from-[#00f5d4] to-[#0084ff] opacity-0 group-hover:opacity-5 blur-2xl transition-opacity duration-500 rounded-2xl ${isDisabled ? "opacity-0" : ""}`}
      />

      {/* Card Container */}
      <div
        className={`relative bg-[#0a0a0a] border border-white/5 group-hover:border-white/10 rounded-2xl p-6 transition-all duration-300 h-full flex flex-col gap-4 ${
          isDisabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-black text-white text-lg leading-tight">{title}</h3>
            <p className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg w-fit mt-2 ${categoryColors[category] || "bg-white/10 text-white/40"}`}>
              {category}
            </p>
          </div>

          <div className="text-[#00f5d4] opacity-60 group-hover:opacity-100 transition-opacity">
            {iconComponents[icon] || <Volume2 className="w-6 h-6" />}
          </div>
        </div>

        {/* Definition */}
        <p className="text-sm text-white/60 leading-relaxed flex-1">{definition}</p>

        {/* Play Button */}
        <button
          onClick={isPlaying ? onStop : onPlay}
          disabled={isDisabled || isLoading}
          className={`w-full py-2.5 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
            isPlaying
              ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
              : "bg-[#00f5d4]/10 hover:bg-[#00f5d4]/20 text-[#00f5d4] border border-[#00f5d4]/20 group-hover:border-[#00f5d4]/50"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              />
              Loading...
            </>
          ) : isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              Stop Effect
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Hear Effect
            </>
          )}
        </button>

        {/* Info */}
        {isPlaying && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-white/40 text-center"
          >
            Now playing {title}...
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
