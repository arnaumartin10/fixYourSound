"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Wand2, 
  Music, 
  ArrowRight,
  Sparkles,
  Search,
  Piano,
  Layers,
  Mic2,
  Wand,
  Drum,
  BookOpen,
  Lightbulb,
  ArrowDown,
  Zap,
  CheckCircle,
  Play,
  LucideIcon,
  ChevronRight,
  HelpCircle,
  Info,
  MessageSquare,
  Headphones,
  GitBranch,
  ChevronDown
} from "lucide-react";
import { useState } from "react";

const tools = [
  { 
    name: "AI Synth", 
    href: "/ai-synth", 
    icon: Wand,
    description: "Sound design guidance"
  },
  { 
    name: "Chord Architect", 
    href: "/chord-architect", 
    icon: Layers,
    description: "Advanced harmonic structures"
  },
  { 
    name: "Voice to Notes", 
    href: "/voice-to-notes", 
    icon: Mic2,
    description: "Converting hums to MIDI"
  },
  { 
    name: "Prompting Effects", 
    href: "/prompting-effects", 
    icon: Sparkles,
    description: "Creative audio processing"
  },
  { 
    name: "Melody Generator", 
    href: "/melody-generator", 
    icon: Music,
    description: "Melodic foundations"
  },
  { 
    name: "Beat Generator", 
    href: "/beat-generator", 
    icon: Drum,
    description: "Rhythmic patterns"
  },
];

const audiences = [
  { 
    title: "Young Producers", 
    desc: "Starting your journey in music production",
    image: "/pictures/young_producer.jpg"
  },
  { 
    title: "Music-Curious Individuals", 
    desc: "Exploring sound and creativity",
    image: "/pictures/music_curious.jpg"
  },
  { 
    title: "Beginners", 
    desc: "Learning the fundamentals of production",
    image: "/pictures/beginners.jpg"
  },
  { 
    title: "Expert Producers", 
    desc: "Seeking fresh inspiration and ideas",
    image: "/pictures/expert_producer.jpg"
  },
];

export default function HomePage() {
  const [studioExpanded, setStudioExpanded] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
            AI-Powered Music Assistant
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-10 tracking-[ -0.05em] leading-[0.85] text-white">
            MASTER THE ART<br />
            OF SOUND. <span className="text-[#00f5d4] drop-shadow-[0_0_40px_rgba(0,245,212,0.4)]">EMPOWERED</span><br />
            BY AI.
          </h1>
          
          <p className="text-xl md:text-2xl text-white/40 mb-16 max-w-3xl mx-auto leading-relaxed font-medium">
            FixYourSound is your AI mentor in the studio. We don&apos;t replace your creativity — we help you understand the &quot;why&quot; behind the sound.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <motion.button
              onClick={() => scrollToSection('what-is')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group inline-flex items-center gap-3 bg-white/5 hover:bg-[#00f5d4]/20 text-white hover:text-[#00f5d4] border border-white/10 hover:border-[#00f5d4]/50 px-10 py-5 rounded-2xl font-black text-xl transition-all"
            >
              <HelpCircle size={24} />
              What is FixYourSound?
            </motion.button>
            
            <motion.button
              onClick={() => scrollToSection('how-it-works')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group inline-flex items-center gap-3 bg-white/5 hover:bg-[#9d4edd]/20 text-white hover:text-[#9d4edd] border border-white/10 hover:border-[#9d4edd]/50 px-10 py-5 rounded-2xl font-black text-xl transition-all"
            >
              <Info size={24} />
              How it works
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/10"
        >
          <button 
            onClick={() => scrollToSection('what-is')}
            className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-2 hover:border-[#00f5d4]/50 transition-colors"
          >
            <motion.div 
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1.5 h-1.5 bg-[#00f5d4] rounded-full" 
            />
          </button>
        </motion.div>
      </section>

      {/* What is FixYourSound? */}
      <section id="what-is" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00f5d4]/5 to-transparent" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter">
              What is <span className="text-[#00f5d4]">FixYourSound?</span>
            </h2>
            <p className="text-xl text-white/50 max-w-3xl mx-auto leading-relaxed">
              An AI-powered mentor for your creative journey — not a replacement for your artistry.
            </p>
          </motion.div>

          {/* Philosophy Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-[#0a0a0a] rounded-3xl border border-[#00f5d4]/20 p-8 md:p-12 mb-16 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00f5d4]/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#00f5d4]/20 rounded-xl flex items-center justify-center text-[#00f5d4]">
                  <Lightbulb size={24} />
                </div>
                <h3 className="text-2xl font-black text-white">Our Philosophy</h3>
              </div>
              <p className="text-lg text-white/70 leading-relaxed mb-6">
                We believe AI should <span className="text-[#00f5d4] font-bold">empower</span> musicians, not replace them. 
                FixYourSound acts as your <span className="text-[#00f5d4] font-bold">mentor and collaborator</span>, 
                helping you understand the theory, techniques, and decisions behind professional production.
              </p>
              <p className="text-lg text-white/70 leading-relaxed">
                Whether you&apos;re a curious beginner or an experienced producer seeking fresh inspiration, 
                our AI guides you through the creative process — explaining the &quot;why&quot; so you can apply it with confidence in your DAW.
              </p>
            </div>
          </motion.div>

          {/* Target Audience - with images */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          >
            {audiences.map((audience, i) => (
              <div key={i} className="group bg-[#0a0a0a] rounded-3xl border border-white/10 overflow-hidden hover:border-[#00f5d4]/30 transition-all">
                <div className="relative h-40 w-full overflow-hidden">
                  <Image 
                    src={audience.image}
                    alt={audience.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                </div>
                <div className="p-6">
                  <h4 className="text-lg font-black text-white mb-2 group-hover:text-[#00f5d4] transition-colors">{audience.title}</h4>
                  <p className="text-sm text-white/50">{audience.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* The Three Pillars - Studio Suite */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-center mb-10">
              <h3 className="text-3xl font-black text-white mb-4">The Studio Suite</h3>
              <p className="text-white/50">Your complete toolkit for creative exploration</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Pillar 1: Song Analyzer */}
              <Link href="/song-analyzer" className="group bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 hover:border-[#00f5d4]/50 transition-all hover:shadow-[0_0_30px_rgba(0,245,212,0.1)] flex flex-col">
                <div className="w-14 h-14 bg-[#00f5d4]/10 rounded-2xl flex items-center justify-center text-[#00f5d4] mb-6 group-hover:bg-[#00f5d4]/20 transition-colors">
                  <Search size={28} />
                </div>
                <h4 className="text-xl font-black text-white mb-3 group-hover:text-[#00f5d4] transition-colors">Song Analyzer</h4>
                <p className="text-white/50 text-sm mb-auto">The starting point to understand the DNA of any track. Analyze BPM, Key, and Loudness.</p>
                <div className="mt-4 text-[#00f5d4] text-sm font-bold flex items-center gap-2">
                  Get Started <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Pillar 2: The Studio (expandable) */}
              <div className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 bg-[#9d4edd]/10 rounded-2xl flex items-center justify-center text-[#9d4edd]">
                    <Music size={28} />
                  </div>
                </div>
                <h4 className="text-xl font-black text-white mb-3">The Studio</h4>
                <p className="text-white/50 text-sm mb-4">The main engine. Creative tools for sound design, composition, and production.</p>
                
                <button 
                  onClick={() => setStudioExpanded(!studioExpanded)}
                  className="flex items-center justify-between text-sm font-bold text-white/60 hover:text-white transition-colors py-2 border-t border-white/10"
                >
                  <span>{studioExpanded ? 'Hide' : 'Show'} Tools ({tools.length})</span>
                  <ChevronDown className={`transition-transform ${studioExpanded ? 'rotate-180' : ''}`} size={16} />
                </button>

                <motion.div 
                  initial={false}
                  animate={{ height: studioExpanded ? 'auto' : 0, opacity: studioExpanded ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-2">
                    {tools.map((tool) => (
                      <Link 
                        key={tool.name} 
                        href={tool.href}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group/item"
                      >
                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/50 group-hover/item:bg-[#00f5d4]/10 group-hover/item:text-[#00f5d4] transition-colors">
                          <tool.icon size={16} />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-bold text-white group-hover/item:text-[#00f5d4] transition-colors">{tool.name}</span>
                          <span className="block text-xs text-white/30">{tool.description}</span>
                        </div>
                        <ArrowRight size={14} className="text-white/30 group-hover/item:text-[#00f5d4] transition-colors" />
                      </Link>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Pillar 3: Learning Hub */}
              <Link href="/learning-hub" className="group bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 hover:border-[#9d4edd]/50 transition-all hover:shadow-[0_0_30px_rgba(157,78,237,0.1)] flex flex-col">
                <div className="w-14 h-14 bg-[#9d4edd]/10 rounded-2xl flex items-center justify-center text-[#9d4edd] mb-6 group-hover:bg-[#9d4edd]/20 transition-colors">
                  <BookOpen size={28} />
                </div>
                <h4 className="text-xl font-black text-white mb-3 group-hover:text-[#9d4edd] transition-colors">Learning Hub</h4>
                <p className="text-white/50 text-sm mb-auto">The educational core to improve music theory and production skills.</p>
                <div className="mt-4 text-[#9d4edd] text-sm font-bold flex items-center gap-2">
                  Explore <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-32 px-6 relative overflow-hidden bg-[#0a0a0a]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#9d4edd]/5" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter">
              How it <span className="text-[#9d4edd]">works</span>
            </h2>
            <p className="text-xl text-white/50 max-w-3xl mx-auto leading-relaxed">
              The Prompt-Reasoning-Application loop that transforms your creative ideas into actionable knowledge.
            </p>
          </motion.div>

          {/* Workflow Steps - Fixed layout */}
          <div className="space-y-4 mb-16">
            {/* Step 1: Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-6"
            >
              <div className="flex-shrink-0 w-16 h-16 bg-[#00f5d4] rounded-2xl flex items-center justify-center text-black font-black text-2xl">1</div>
              <div className="flex-1 bg-[#0a0a0a] rounded-3xl border border-white/10 p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-[#00f5d4]/10 rounded-xl flex items-center justify-center text-[#00f5d4]">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-white">Input</h3>
                </div>
                <p className="text-white/60 leading-relaxed">
                  You provide a prompt describing what you want to achieve — like &quot;a warm, 80s synth pad&quot; or &quot;vintage guitar tone.&quot;
                </p>
              </div>
            </motion.div>

            {/* Arrow between steps */}
            <div className="flex justify-center">
              <ArrowDown className="text-[#00f5d4]" size={24} />
            </div>

            {/* Step 2: Insight */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex items-start gap-6"
            >
              <div className="flex-shrink-0 w-16 h-16 bg-[#9d4edd] rounded-2xl flex items-center justify-center text-white font-black text-2xl">2</div>
              <div className="flex-1 bg-[#0a0a0a] rounded-3xl border border-white/10 p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-[#9d4edd]/10 rounded-xl flex items-center justify-center text-[#9d4edd]">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-white">Insight</h3>
                </div>
                <p className="text-white/60 leading-relaxed">
                  The AI provides the solution + the <span className="text-[#9d4edd] font-bold">Reasoning</span> behind it. Understand exactly why certain settings work.
                </p>
              </div>
            </motion.div>

            {/* Arrow between steps */}
            <div className="flex justify-center">
              <ArrowDown className="text-[#9d4edd]" size={24} />
            </div>

            {/* Step 3: Application */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex items-start gap-6"
            >
              <div className="flex-shrink-0 w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black font-black text-2xl">3</div>
              <div className="flex-1 bg-[#0a0a0a] rounded-3xl border border-white/10 p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white">
                    <Headphones size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-white">Application</h3>
                </div>
                <p className="text-white/60 leading-relaxed">
                  Take that knowledge back to your DAW or physical instruments to replicate the result.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Example Case */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-[#00f5d4]/10 to-[#9d4edd]/10 rounded-3xl border border-white/10 p-8 md:p-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-[#00f5d4]" size={24} />
              <h3 className="text-2xl font-black text-white">Example: AI Synth</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-lg text-white/80 leading-relaxed mb-4">
                  Tell the AI you want a <span className="text-[#00f5d4] font-bold">&quot;warm, 80s pad,&quot;</span> get the exact knob settings, understand why those oscillators were chosen...
                </p>
                <p className="text-lg text-white/80 leading-relaxed">
                  ...then dial them into your favorite VST in your DAW. You&apos;re not just getting a preset — you&apos;re learning sound design.
                </p>
              </div>
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
                <div className="text-sm font-mono text-white/50 mb-2">Your Prompt:</div>
                <div className="bg-white/5 rounded-xl p-4 mb-4 text-white font-medium">&quot;warm, 80s synth pad&quot;</div>
                <div className="text-sm font-mono text-white/50 mb-2">AI Response:</div>
                <div className="bg-[#00f5d4]/10 rounded-xl p-4 text-[#00f5d4] text-sm">
                  <div className="font-bold mb-2">Oscillator: Triangle + Sub</div>
                  <div>Filter: Low-pass at 1200Hz, slight resonance</div>
                  <div>ADSR: Slow attack (0.5s), medium release (1.2s)</div>
                  <div className="mt-3 text-white/70 text-xs">
                    <span className="font-bold">Why:</span> Triangle provides warmth, sub adds body without harshness...
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
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