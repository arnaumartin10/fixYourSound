"use client";

import React, { useState } from "react";
import { PianoVisualizer } from "@/components/PianoVisualizer";
import { GuitarVisualizer } from "@/components/GuitarVisualizer";
import { Chord, Note } from "tonal";
import { 
  Music, 
  Sparkles, 
  Send, 
  ChevronRight, 
  Layout, 
  Piano as PianoIcon, 
  Guitar as GuitarIcon 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { parseNotesFromChord } from "@/utils/chordParser";

const SCALES = [
  "C major", "G major", "D major", "A major", "E major", "B major", "F# major", "C# major",
  "F major", "Bb major", "Eb major", "Ab major", "Db major", "Gb major", "Cb major",
  "A minor", "E minor", "B minor", "F# minor", "C# minor", "G# minor", "D# minor", "A# minor",
  "D minor", "G minor", "C minor", "F minor", "Bb minor", "Eb minor", "Ab minor"
];

interface ProgressionChord {
  chord: string;
  explanation: string;
}

export default function ChordArchitectPage() {
  const [scale, setScale] = useState("C major");
  const [vibe, setVibe] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progression, setProgression] = useState<ProgressionChord[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [strummingIdea, setStrummingIdea] = useState("");

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-chords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scale, vibe }),
      });
      const data = await res.json();
      setProgression(data.progression);
      setStrummingIdea(data.strummingPatternIdea);
      setActiveIndex(0);
    } catch (error) {
      console.error("Failed to generate chords:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentChord = progression[activeIndex]?.chord || "";
  const currentNotes = parseNotesFromChord(currentChord);

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      <div className="grid lg:grid-cols-12 gap-10">
        
        {/* Left Sidebar: Controls & List */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-start/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter flex items-center gap-3">
              <Music className="text-brand-start" />
              Architect
            </h2>

            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Key & Scale</label>
                <select 
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-brand-start/50 transition-colors appearance-none"
                >
                  {SCALES.map(s => <option key={s} value={s} className="bg-[#0a0a0a]">{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Vibe Prompt</label>
                <textarea 
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  placeholder="e.g., 'Melancholic jazz in space' or 'High energy pop punk'"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-brand-start/50 transition-colors h-32 resize-none text-sm placeholder:text-white/20"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full group relative flex items-center justify-center gap-2 bg-gradient-to-r from-brand-start to-brand-end text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(255,107,53,0.3)] disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                ) : (
                  <>
                    Build Progression
                    <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated List */}
          <AnimatePresence mode="wait">
            {progression.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-start">Generated Sequence</h3>
                   <Sparkles size={14} className="text-brand-start animate-pulse" />
                </div>
                {progression.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 group relative overflow-hidden ${
                      activeIndex === idx 
                        ? "bg-brand-start border-brand-start text-black shadow-[0_0_20px_rgba(255,107,53,0.3)]" 
                        : "bg-white/5 border-white/5 text-white hover:border-brand-start/30"
                    }`}
                  >
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-2xl font-black tracking-tighter">{item.chord}</span>
                      <ChevronRight size={20} className={activeIndex === idx ? "text-black" : "text-white/20"} />
                    </div>
                    {activeIndex === idx && (
                       <motion.p layoutId="desc" className="text-xs mt-2 font-medium opacity-80 leading-relaxed max-w-[90%]">
                         {item.explanation}
                       </motion.p>
                    )}
                  </button>
                ))}

                {strummingIdea && (
                   <div className="mt-8 p-6 bg-brand-end/5 rounded-3xl border border-brand-end/20">
                     <span className="text-[10px] font-black uppercase tracking-widest text-brand-end mb-2 block">Performance Idea</span>
                    <p className="text-xs text-white/50 leading-relaxed font-medium italic">
                      &quot;{strummingIdea}&quot;
                    </p>
                   </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Right Area: Visualizers */}
        <main className="lg:col-span-8 space-y-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <PianoIcon size={20} className="text-brand-start" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Piano Voicing</h3>
            </div>
            <PianoVisualizer activeNotes={currentNotes} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <GuitarIcon size={20} className="text-brand-end" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Fretboard Position</h3>
            </div>
            <GuitarVisualizer chordName={currentChord} />
          </div>

          {/* Theory Insight */}
          {currentChord && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="mt-12 p-10 bg-black border border-white/5 rounded-[40px] relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-start/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="relative z-10">
                  <span className="text-brand-start font-black text-6xl tracking-tighter mb-4 block">{currentChord}</span>
                  <p className="text-lg text-white/60 font-medium leading-relaxed max-w-2xl">
                    Thinking in <span className="text-white font-bold">{scale}</span>, this chord functions as a 
                    pivotal harmonic anchor. The notes <span className="text-brand-start font-bold">{Chord.get(currentChord).notes.join(", ")}</span> 
                    create the characteristic tension requested by your vibe.
                  </p>
                </div>
             </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
