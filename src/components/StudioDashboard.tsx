"use client";

import { useEffect, useState } from "react";
import { useAudioEngine } from "@/context/AudioEngineContext";
import { useSearchParams } from "next/navigation";
import { FileDropzone } from "@/components/FileDropzone";
import { FrequencyVisualizer } from "@/components/FrequencyVisualizer";
import { TransportControls } from "@/components/TransportControls";
import { VibeCommandBar } from "@/components/VibeCommandBar";
import { WaveformComparison } from "@/components/WaveformComparison";
import { TransformationLogic } from "@/components/TransformationLogic";
import { SavePresetModal } from "@/components/SavePresetModal";
import { getPresetById } from "@/actions/presetActions";
import { Save, Sparkles, Wand2 } from "lucide-react";
import { HelpButton } from "@/components/HelpButton";

export function StudioDashboard() {
  const searchParams = useSearchParams();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const {
    isPlaying,
    isLoaded,
    isLoading,
    hasPrompt,
    playbackVersion,
    dryFftValues,
    processedFftValues,
    originalWaveform,
    processedWaveform,
    dspState,
    semanticTerms,
    lastCommand,
    explanation,
    isBouncing,
    loadAudio,
    playOriginal,
    playProcessed,
    applySemanticCommand,
    exportAudio,
  } = useAudioEngine();

  useEffect(() => {
    const loadPreset = async () => {
      const presetId = searchParams.get("presetId");
      if (!presetId || !isLoaded) return;

      try {
        const preset = await getPresetById(presetId);
        if (!preset) return;

        const data = JSON.parse(preset.data);
        if (data.semanticTerms && data.semanticTerms.length > 0) {
          for (const term of data.semanticTerms) {
            await applySemanticCommand(term);
          }
        }
      } catch (err) {
        console.error("Failed to load preset:", err);
      }
    };

    loadPreset();
  }, [searchParams, isLoaded, applySemanticCommand]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
      <header className="rounded-2xl border border-white/5 bg-[#0a0a0a]/60 p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white sm:text-4xl tracking-tighter">
              PROMPTING <span className="text-[#00f5d4] drop-shadow-[0_0_15px_rgba(0,245,212,0.3)]">EFFECTS</span>
            </h1>
            <p className="mt-2 text-sm text-white/40 font-medium max-w-lg leading-relaxed">
              Describe a vibe and watch our AI translate it into real-time Digital Signal Processing. Learn exactly which filters, compressors, and saturators are needed.
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-white/30">
                <span className="w-2 h-2 bg-[#00f5d4] rounded-full" />
                Step 1: Upload audio
              </span>
              <span className="flex items-center gap-1.5 text-white/30">
                <span className="w-2 h-2 bg-white/30 rounded-full" />
                Step 2: Describe your vibe
              </span>
              <span className="flex items-center gap-1.5 text-white/30">
                <span className="w-2 h-2 bg-white/30 rounded-full" />
                Step 3: Learn the &quot;why&quot;
              </span>
            </div>
          </div>
        </div>
      </header>

        <section className="space-y-4 rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          {isLoaded ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400">Time Domain (Waveform)</h3>
                <WaveformComparison
                  originalWaveform={originalWaveform}
                  processedWaveform={processedWaveform}
                  hasProcessedLayer={hasPrompt}
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400">Frequency Domain (Spectrum)</h3>
                <FrequencyVisualizer
                  dryFftValues={dryFftValues}
                  processedFftValues={processedFftValues}
                  hasPrompt={hasPrompt}
                  dspState={dspState}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-950/40 text-sm text-slate-300">
              Upload audio to begin visual comparison.
            </div>
          )}
        </section>
        <section className="space-y-4 rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <FileDropzone onFile={loadAudio} />
          {isLoaded ? (
            <>
              <TransportControls
                isPlaying={isPlaying}
                isLoaded={isLoaded}
                isLoading={isLoading}
                isBouncing={isBouncing}
                hasPrompt={hasPrompt}
                playbackVersion={playbackVersion}
                onPlayOriginal={playOriginal}
                onPlayProcessed={playProcessed}
                onExport={exportAudio}
              />
              <VibeCommandBar onApply={applySemanticCommand} />
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-white/30 italic">
                  Last prompt: <span className="text-[#00f5d4] not-italic font-bold">{lastCommand || "none yet"}</span>
                </p>
                {hasPrompt && (
                  <button 
                    onClick={() => setShowSaveModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00f5d4]/10 border border-[#00f5d4]/20 rounded-xl text-[#00f5d4] text-xs font-bold hover:bg-[#00f5d4]/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Save size={14} /> Save Preset
                  </button>
                )}
              </div>
              {isLoaded && <TransformationLogic />}
            </>
          ) : (
            <p className="text-xs text-slate-300">Prompt input unlocks after audio is loaded.</p>
          )}
        </section>
      
      {showSaveModal && (
        <SavePresetModal
          category="FX"
          getData={() => ({ semanticTerms, lastCommand, dspState })}
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          hideTriggerButton={true}
        />
      )}

      <HelpButton 
        toolName="Prompting Effects"
        content={{
          what: "Prompting Effects lets you transform any audio by describing the vibe you want. The AI applies real-time DSP chains to achieve effects like 'lo-fi', 'cinematic', 'underwater', etc.",
          why: "Use it to quickly apply professional processing, learn signal flow, or get creative inspiration. The AI explains each processing decision so you understand the theory.",
          how: "1. Upload an audio file (MP3, WAV)\n2. Wait for the waveform to load\n3. Type a vibe description like 'warm vintage' or 'crushing distortion'\n4. Click Apply to hear the result\n5. See the detailed explanation of what was done",
          tips: [
            "Use descriptive adjectives: 'warm', 'harsh', 'dark', 'bright'",
            "Reference genres: 'lo-fi hip hop', 'cinematic', 'underwater'",
            "Combine concepts: 'vintage vinyl with subtle saturation'",
            "Start subtle, then go more extreme to hear differences"
          ],
          productionTip: "The AI applies actual DSP (EQ, compression, distortion, reverb). Use these learnings to configure plugins in your DAW. Many effects can be approximated with stock plugins!"
        }}
      />
    </main>
  );
}
