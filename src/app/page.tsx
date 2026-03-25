"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Wand2, 
  Music, 
  ArrowRight,
  Sparkles,
  CircuitBoard,
  BrainCircuit,
  Mic
} from "lucide-react";

const Section = ({ 
  icon: Icon, 
  title, 
  description, 
  buttonText, 
  buttonHref, 
  reversed = false 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  buttonText: string; 
  buttonHref: string;
  reversed?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className={`flex flex-col md:flex-row items-center gap-16 py-32 border-b border-white/5 last:border-0 ${reversed ? 'md:flex-row-reverse' : ''}`}
  >
    <div className="flex-1 space-y-8">
      <div className="w-20 h-20 bg-[#00f5d4]/10 rounded-3xl flex items-center justify-center text-[#00f5d4] shadow-[0_0_30px_rgba(0,245,212,0.15)] border border-[#00f5d4]/20 animate-pulse">
        <Icon size={40} />
      </div>
      <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white leading-[0.9]">
        {title}
      </h2>
      <p className="text-xl text-white/40 leading-relaxed max-w-xl font-medium">
        {description}
      </p>
      <Link
        href={buttonHref}
        className="inline-flex items-center gap-2 bg-white/5 hover:bg-[#00f5d4] text-white hover:text-black border border-white/10 hover:border-[#00f5d4] px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 group shadow-2xl"
      >
        {buttonText}
        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
    
    <div className="flex-1 w-full aspect-square bg-[#0a0a0a] rounded-[3rem] border border-white/5 flex items-center justify-center relative overflow-hidden group shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d4]/10 to-[#9d4edd]/10 opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,245,212,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Abstract Design Elements */}
      <div className="relative z-10 p-12 w-full h-full flex flex-col items-center justify-center gap-8">
         <div className="w-full h-1 bg-white/5 relative overflow-hidden rounded-full">
            <motion.div 
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00f5d4] to-transparent w-1/2" 
            />
         </div>
         <div className="flex gap-4">
            <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
               <CircuitBoard className="text-white/20 group-hover:text-[#00f5d4] transition-colors" size={48} />
            </div>
            <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
               <BrainCircuit className="text-white/20 group-hover:text-[#9d4edd] transition-colors" size={48} />
            </div>
         </div>
         <div className="w-full h-1 bg-white/5 relative overflow-hidden rounded-full">
            <motion.div 
              animate={{ x: ["100%", "-100%"] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent w-1/2" 
            />
         </div>
      </div>
    </div>
  </motion.div>
);

export default function HomePage() {
  return (
    <div className="bg-black text-white min-h-screen selection:bg-[#00f5d4]/30">
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,245,212,0.08)_0%,transparent_70%)]" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10 max-w-5xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00f5d4]/10 rounded-full border border-[#00f5d4]/20 text-[10px] font-black uppercase tracking-widest text-[#00f5d4] mb-8">
            <Sparkles size={12} />
            Next Generation Composition
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-10 tracking-[ -0.05em] leading-[0.85] text-white">
            MASTER THE ART<br />
            OF SOUND. <span className="text-[#00f5d4] drop-shadow-[0_0_40px_rgba(0,245,212,0.4)]">EMPOWERED</span><br />
            BY AI.
          </h1>
          
          <p className="text-xl md:text-2xl text-white/40 mb-16 max-w-3xl mx-auto leading-relaxed font-medium">
            Fix Your Sound isn&apos;t about letting AI make music for you. It&apos;s about giving you the 
            <span className="text-white"> tools and knowledge</span> to create better, faster, and with deeper understanding.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
             <motion.div
               animate={{ y: [0, -5, 0] }}
               transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
             >
               <Link
                 href="/prompting-effects"
                 className="group relative inline-flex items-center gap-3 bg-[#00f5d4] text-black px-12 py-6 rounded-2xl font-black text-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(0,245,212,0.25)]"
               >
                 Explore DSP Engine
                 <ArrowRight size={28} className="group-hover:translate-x-1 transition-transform" />
               </Link>
             </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/10"
        >
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-2">
             <motion.div 
               animate={{ y: [0, 12, 0] }}
               transition={{ repeat: Infinity, duration: 2 }}
               className="w-1.5 h-1.5 bg-[#00f5d4] rounded-full" 
             />
          </div>
        </motion.div>
      </section>

      {/* Main Feature Sections */}
      <section className="container mx-auto px-6 max-w-7xl relative z-10">
        
        <Section 
          icon={Wand2}
          title="Prompting Audio Effects"
          description="Describe a vibe and watch our AI translate it into real-time Digital Signal Processing. Learn exactly which filters, compressors, and saturators are needed to achieve that professional 'underwater', 'lo-fi', or 'cinematic' sound."
          buttonText="Explore DSP Engine ->"
          buttonHref="/prompting-effects"
        />

        <Section 
          icon={Music}
          reversed
          title="Chord Architect"
          description="Bridge the gap between inspiration and theory. Tell us your track's mood and scale, and receive professional chord progressions. Visualize every note on a Piano Roll and Guitar Fretboard to master your composition."
          buttonText="Start Composing ->"
          buttonHref="/chord-architect"
        />

        <Section 
          icon={Mic}
          title="Voice to Notes"
          description="Sing or hum a melody and watch it transform into precise musical notes. Transcribe vocal performances, create MIDI files, and unlock the melody in your voice. Perfect for capturing inspiration in the moment."
          buttonText="Start Transcribing ->"
          buttonHref="/voice-to-notes"
        />

      </section>

      {/* Footer Manifesto */}
      <footer className="py-40 text-center relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,237,0.05)_0%,transparent_80%)]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="container mx-auto px-6 relative z-10 max-w-3xl"
        >
          <h3 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter text-white">Built for producers, by producers.</h3>
          <p className="text-xl text-white/30 font-medium leading-relaxed mb-12">
            Enhance your workflow, <span className="text-[#9d4edd] font-black">don&apos;t replace your ears.</span> 
            Our mission is to democratize complex audio engineering and music theory through intuitive, AI-assisted interfaces.
          </p>
          <div className="flex items-center justify-center gap-6 text-[#00f5d4]/50 text-sm font-black uppercase tracking-[0.3em]">
             <span>Vision</span>
             <div className="w-1 h-1 rounded-full bg-white/20" />
             <span>Knowledge</span>
             <div className="w-1 h-1 rounded-full bg-white/20" />
             <span>Sound</span>
          </div>
        </motion.div>
      </footer>
    </div>
  );
}
