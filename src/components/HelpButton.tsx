"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, Lightbulb, BookOpen, ArrowRight, ChevronRight } from "lucide-react";

interface HelpContent {
  what: string;
  why: string;
  how: string;
  tips: string[];
  productionTip: string;
}

interface HelpButtonProps {
  toolName: string;
  content: HelpContent;
}

export function HelpButton({ toolName, content }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#00f5d4] rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(0,245,212,0.4)] hover:scale-110 transition-transform"
        title="Get help with this tool"
      >
        <HelpCircle size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a0a] border-l border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00f5d4]/20 rounded-xl flex items-center justify-center text-[#00f5d4]">
                      <HelpCircle size={20} />
                    </div>
                    <h2 className="text-2xl font-black text-white">{toolName}</h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* What */}
                <div className="mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#00f5d4]/20 rounded-lg flex items-center justify-center text-[#00f5d4] text-xs">?</span>
                    What is this?
                  </h3>
                  <p className="text-white/70 leading-relaxed">{content.what}</p>
                </div>

                {/* Why */}
                <div className="mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#9d4edd]/20 rounded-lg flex items-center justify-center text-[#9d4edd] text-xs">!</span>
                    Why use it?
                  </h3>
                  <p className="text-white/70 leading-relaxed">{content.why}</p>
                </div>

                {/* How */}
                <div className="mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center text-white text-xs">→</span>
                    How to use
                  </h3>
                  <p className="text-white/70 leading-relaxed">{content.how}</p>
                </div>

                {/* Tips */}
                <div className="mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                    <Lightbulb size={16} className="text-[#00f5d4]" />
                    Tips for better results
                  </h3>
                  <ul className="space-y-3">
                    {content.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-white/60">
                        <ChevronRight size={16} className="text-[#00f5d4] mt-1 flex-shrink-0" />
                        <span className="text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Production Tip */}
                <div className="bg-gradient-to-r from-[#00f5d4]/10 to-[#9d4edd]/10 rounded-2xl border border-white/10 p-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                    <ArrowRight size={16} className="text-[#9d4edd]" />
                    Applying to your DAW
                  </h3>
                  <p className="text-white/70 leading-relaxed text-sm">{content.productionTip}</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}