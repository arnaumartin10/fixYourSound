"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { StageNav } from "./StageNav";
import { TeacherBox } from "./TeacherBox";
import { Stage1_Genre } from "./Stage1_Genre";
import { Stage2_Rhythm } from "./Stage2_Rhythm";
import { Stage3_MelodyBass } from "./Stage3_MelodyBass";
import { Stage4_MiniDAW } from "./Stage4_MiniDAW";
import { Stage5_SoundDesign } from "./Stage5_SoundDesign";
import { FinalPlayback } from "./FinalPlayback";
import { INITIAL_SONG_STATE, STAGES, SongState } from "./types";
import { Sparkles } from "lucide-react";

const STAGE_SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

function SongBuilderContent() {
  const searchParams = useSearchParams();
  const presetId = searchParams.get("presetId");
  
  const [state, setState] = useState<SongState>(INITIAL_SONG_STATE);
  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState(1);
  const [showFinal, setShowFinal] = useState(false);
  const [isLoading, setIsLoading] = useState(!!presetId);

  useEffect(() => {
    if (presetId) {
      async function loadPreset() {
        try {
          const res = await fetch(`/api/presets?id=${presetId}`);
          const data = await res.json();
          // Assuming /api/presets returns the specific preset if id is provided
          // or we can use the existing /api/presets and find it.
          // Better yet, let's assume we have a way to fetch a single preset.
          const preset = data.presets?.find((p: any) => p.id === presetId);
          if (preset?.data) {
            const songData = JSON.parse(preset.data);
            setState({ ...INITIAL_SONG_STATE, ...songData });
            setShowFinal(true);
          }
        } catch (error) {
          console.error("Failed to load preset:", error);
        } finally {
          setIsLoading(false);
        }
      }
      loadPreset();
    }
  }, [presetId]);

  const updateState = (updates: Partial<SongState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goToStage = (next: number) => {
    setDirection(next > currentStage ? 1 : -1);
    setCompletedStages(prev => new Set([...prev, currentStage]));
    setCurrentStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const advanceStage = () => {
    if (currentStage < STAGES.length - 1) {
      goToStage(currentStage + 1);
    } else {
      setCompletedStages(prev => new Set([...prev, currentStage]));
      setShowFinal(true);
    }
  };

  const teacherContext = {
    genre: state.genre,
    key: state.key,
    chords: state.selectedChordOption?.chords.map(c => c.chord).join(" - "),
    beat: state.selectedBeat ? `${state.selectedBeat.tempo} BPM ${state.selectedBeat.kitType ?? ""}` : undefined,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00f5d4]/20 border-t-[#00f5d4] rounded-full animate-spin" />
          <p className="text-white/40 font-black uppercase tracking-widest text-xs">Loading Song...</p>
        </div>
      </div>
    );
  }

  if (showFinal) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00f5d4]/10 rounded-full border border-[#00f5d4]/20 text-[10px] font-black uppercase tracking-widest text-[#00f5d4] mb-4">
            <Sparkles size={10} />
            Song Complete!
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Your Song is Built 🎉</h2>
          <p className="text-white/40 mt-2">Listen to your creation and save it to your profile.</p>
        </motion.div>
        <FinalPlayback state={state} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StageNav
        currentStage={currentStage}
        completedStages={completedStages}
        onStageClick={(s) => {
          if (s !== currentStage) goToStage(s);
        }}
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="relative overflow-hidden">
          <div className="mb-6">
            <motion.div
              key={`header-${currentStage}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#00f5d4] text-black font-black text-sm">
                {currentStage + 1}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter">
                  {STAGES[currentStage].label}
                </h2>
                <p className="text-xs text-white/30 font-medium">
                  Stage {currentStage + 1} of {STAGES.length}
                </p>
              </div>
            </motion.div>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`stage-${currentStage}`}
              custom={direction}
              variants={STAGE_SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {currentStage === 0 && (
                <Stage1_Genre state={state} onUpdate={updateState} onNext={advanceStage} />
              )}
              {currentStage === 1 && (
                <Stage2_Rhythm state={state} onUpdate={updateState} onNext={advanceStage} />
              )}
              {currentStage === 2 && (
                <Stage3_MelodyBass state={state} onUpdate={updateState} onNext={advanceStage} />
              )}
              {currentStage === 3 && (
                <Stage4_MiniDAW state={state} onNext={advanceStage} />
              )}
              {currentStage === 4 && (
                <Stage5_SoundDesign state={state} onUpdate={updateState} onNext={advanceStage} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="lg:sticky lg:top-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={`teacher-${currentStage}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <TeacherBox stage={currentStage} context={teacherContext} />
            </motion.div>
          </AnimatePresence>

          {completedStages.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-white/3 rounded-2xl border border-white/5 space-y-2"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20 block">Your Choices So Far</span>
              {state.selectedChordOption && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00f5d4] rounded-full" />
                  <span className="text-xs text-white/50">
                    <span className="font-bold text-[#00f5d4]">Chords:</span>{" "}
                    {state.selectedChordOption.chords.map(c => c.chord).join(" - ")}
                  </span>
                </div>
              )}
              {state.selectedBeat && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#ff6b35] rounded-full" />
                  <span className="text-xs text-white/50">
                    <span className="font-bold text-[#ff6b35]">Beat:</span>{" "}
                    {state.selectedBeat.tempo} BPM · {state.selectedBeat.kitType ?? state.selectedBeat.drumKit}
                  </span>
                </div>
              )}
              {state.selectedMelody && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#9d4edd] rounded-full" />
                  <span className="text-xs text-white/50">
                    <span className="font-bold text-[#9d4edd]">Melody:</span>{" "}
                    {state.selectedMelody.lead.length} notes in {state.key}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SongBuilder() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00f5d4]/20 border-t-[#00f5d4] rounded-full animate-spin" />
        </div>
      </div>
    }>
      <SongBuilderContent />
    </Suspense>
  );
}
