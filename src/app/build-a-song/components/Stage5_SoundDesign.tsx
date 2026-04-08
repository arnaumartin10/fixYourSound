"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Check, Wand2, Play } from "lucide-react";
import { SoundPreset, SelectedSounds, SongState } from "./types";

interface Props {
  state: SongState;
  onUpdate: (updates: Partial<SongState>) => void;
  onNext: () => void;
}

function guessMode(genre: string): "synth" | "guitar" {
  const lower = (genre ?? "").toLowerCase();
  if (lower.includes("rock") || lower.includes("metal") || lower.includes("blues") || lower.includes("country")) return "guitar";
  return "synth";
}

function buildSoundPrompt(role: "lead" | "chords" | "bass", genre: string, variant: number): string {
  const roleDesc = role === "lead" ? "lead synth/instrument" : role === "bass" ? "bass instrument" : "chord pad/rhythm instrument";
  const VARIANTS = [
    "classic and recognizable",
    "warm and lush",
    "bright and cutting",
    "experimental and unique",
  ];
  return `Genre: ${genre}. Create a ${roleDesc} sound that is ${VARIANTS[variant]} for this genre. Keep it production-ready and genre-appropriate.`;
}

interface SoundCardProps {
  preset: SoundPreset;
  isSelected: boolean;
  onSelect: () => void;
  roleColor: string;
}

function SoundCard({ preset, isSelected, onSelect, onPreview, roleColor }: SoundCardProps & { onPreview: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onSelect}
      className={`relative rounded-xl border p-4 cursor-pointer transition-all group ${
        isSelected
          ? `border-[${roleColor}] shadow-[0_0_15px_${roleColor}33]`
          : "border-white/10 hover:border-white/20 bg-white/3 hover:bg-white/5"
      }`}
      style={isSelected ? { backgroundColor: `${roleColor}15`, borderColor: roleColor } : {}}
    >
      {isSelected && (
        <div className="absolute top-2 right-4 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: roleColor }}>
          <Check size={10} className="text-black" />
        </div>
      )}
      
      <button
        onClick={(e) => { e.stopPropagation(); onPreview(); }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20"
      >
        <Play size={10} />
      </button>

      <p className="text-xs font-black text-white/80 mb-1">{preset.label}</p>
      <p className="text-[10px] text-white/40 leading-relaxed line-clamp-2">{preset.explanation}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-bold uppercase">
          {preset.mode}
        </span>
        <span className="text-[9px] text-white/20">
          {(preset.params as any).oscillator ?? ""}
        </span>
      </div>
    </motion.div>
  );
}


interface RoleSectionProps {
  role: "lead" | "chords" | "bass";
  label: string;
  color: string;
  presets: SoundPreset[];
  selected: SoundPreset | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onSelect: (preset: SoundPreset) => void;
}

function RoleSection({ role, label, color, presets, selected, isGenerating, onGenerate, onSelect, onPreview }: RoleSectionProps & { onPreview: (p: SoundPreset) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-black text-white/80 uppercase tracking-widest">{label}</span>
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all disabled:opacity-30"
        >
          {isGenerating ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Wand2 size={10} />
          )}
          {presets.length > 0 ? "Regenerate" : "Generate Sounds"}
        </button>
      </div>
      <AnimatePresence>
        {presets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid grid-cols-2 gap-2"
          >
            {presets.map((p, i) => (
              <SoundCard
                key={i}
                preset={p}
                isSelected={selected === p}
                roleColor={color}
                onSelect={() => onSelect(p)}
                onPreview={() => onPreview(p)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export function Stage5_SoundDesign({ state, onUpdate, onNext }: Props) {
  const [generating, setGenerating] = useState<{ lead: boolean; chords: boolean; bass: boolean }>({
    lead: false, chords: false, bass: false,
  });
  const mode = guessMode(state.genre);

  const playPreview = async (preset: SoundPreset) => {
    try {
      const Tone = await import("tone");
      await Tone.start();
      
      const p = preset.params as any;
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      
      // Basic param mapping for preview
      synth.set({
        oscillator: { type: p.oscillator || "sawtooth" },
        envelope: {
          attack: p.attack || 0.1,
          decay: p.decay || 0.2,
          sustain: p.sustain || 0.5,
          release: p.release || 1
        }
      });

      // Play a short arpeggio or chord
      const now = Tone.now();
      if (preset.role === "chords") {
        synth.triggerAttackRelease(["C4", "E4", "G4"], "2n", now);
      } else if (preset.role === "bass") {
        synth.triggerAttackRelease("C2", "2n", now);
      } else {
        synth.triggerAttackRelease("C4", "4n", now);
        synth.triggerAttackRelease("E4", "4n", now + 0.2);
        synth.triggerAttackRelease("G4", "2n", now + 0.4);
      }

      setTimeout(() => synth.dispose(), 3000);
    } catch (e) {
      console.error("Preview failed", e);
    }
  };

  const generateForRole = async (role: "lead" | "chords" | "bass") => {
    setGenerating(g => ({ ...g, [role]: true }));
    try {
      const response = await fetch("/api/ai-synth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildSoundPrompt(role, state.genre, 0), // Base prompt
          mode,
        }),
      });
      const data = await response.json();
      const roleLabels = ["Option A", "Option B", "Option C", "Option D"];
      const presets: SoundPreset[] = (data.options || []).map((r: any, i: number) => ({
        label: roleLabels[i] || `Variant ${i+1}`,
        role,
        params: r,
        explanation: r.explanation ?? "",
        mode,
      }));
      onUpdate({
        soundPresets: {
          ...state.soundPresets,
          [role]: presets,
        },
      });
    } catch (e) {
      console.error(`Error generating ${role} sounds`, e);
    } finally {
      setGenerating(g => ({ ...g, [role]: false }));
    }
  };


  const generateAll = async () => {
    await Promise.all(["lead", "chords", "bass"].map(r => generateForRole(r as "lead" | "chords" | "bass")));
  };

  const setSelectedSound = (role: "lead" | "chords" | "bass", preset: SoundPreset) => {
    onUpdate({ selectedSounds: { ...state.selectedSounds, [role]: preset } });
  };

  const hasAllSelected = state.selectedSounds.lead && state.selectedSounds.chords && state.selectedSounds.bass;

  return (
    <div className="space-y-6">
      {/* Mode badge */}
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider ${
          mode === "guitar"
            ? "bg-[#ff6b35]/10 border-[#ff6b35]/30 text-[#ff6b35]"
            : "bg-[#9d4edd]/10 border-[#9d4edd]/30 text-[#9d4edd]"
        }`}>
          {mode === "guitar" ? "🎸 Guitar Mode" : "🎹 Synth Mode"}
        </div>
        <span className="text-xs text-white/30">Auto-detected from your genre</span>
      </div>

      <button
        onClick={generateAll}
        disabled={Object.values(generating).some(Boolean)}
        className="flex items-center gap-3 bg-[#00f5d4] text-black px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.3)] disabled:opacity-40"
      >
        {Object.values(generating).some(Boolean) ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            Generating sounds…
          </>
        ) : (
          <>
            <Sparkles size={20} />
            Generate All Sound Presets
          </>
        )}
      </button>

      {/* Role sections */}
      <div className="space-y-6">
        <RoleSection
          role="lead"
          label="Lead Instrument"
          color="#00f5d4"
          presets={state.soundPresets.lead}
          selected={state.selectedSounds.lead}
          isGenerating={generating.lead}
          onGenerate={() => generateForRole("lead")}
          onSelect={p => setSelectedSound("lead", p)}
          onPreview={playPreview}
        />
        <div className="h-px bg-white/5" />
        <RoleSection
          role="chords"
          label="Chord Instrument"
          color="#ffd166"
          presets={state.soundPresets.chords}
          selected={state.selectedSounds.chords}
          isGenerating={generating.chords}
          onGenerate={() => generateForRole("chords")}
          onSelect={p => setSelectedSound("chords", p)}
          onPreview={playPreview}
        />
        <div className="h-px bg-white/5" />
        <RoleSection
          role="bass"
          label="Bass Instrument"
          color="#9d4edd"
          presets={state.soundPresets.bass}
          selected={state.selectedSounds.bass}
          isGenerating={generating.bass}
          onGenerate={() => generateForRole("bass")}
          onSelect={p => setSelectedSound("bass", p)}
          onPreview={playPreview}
        />

      </div>

      {hasAllSelected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={onNext}
            className="flex items-center gap-3 bg-gradient-to-r from-[#00f5d4] to-[#9d4edd] text-white px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(0,245,212,0.3)]"
          >
            <Sparkles size={20} />
            Finish &amp; Save My Song!
            <ChevronRight size={20} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
