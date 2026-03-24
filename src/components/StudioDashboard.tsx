"use client";

import { useAudioEngine } from "@/context/AudioEngineContext";
import { FileDropzone } from "@/components/FileDropzone";
import { FrequencyVisualizer } from "@/components/FrequencyVisualizer";
import { TransportControls } from "@/components/TransportControls";
import { VibeCommandBar } from "@/components/VibeCommandBar";
import { WaveformComparison } from "@/components/WaveformComparison";
import { TransformationLogic } from "@/components/TransformationLogic";

export function StudioDashboard() {
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
      <header className="rounded-xl border border-white/15 bg-white/5 p-5 backdrop-blur-xl">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">FixYourSound</h1>
        <p className="mt-1 text-sm text-slate-300">
          Semantic DSP engine: write human language, hear real-time mastering changes.
        </p>
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
              <p className="text-xs text-slate-300">
                Last prompt: {lastCommand || "none yet"} | Active terms:{" "}
                {semanticTerms.length ? semanticTerms.join(", ") : "none"}
              </p>
              {isLoaded && <TransformationLogic />}
            </>
          ) : (
            <p className="text-xs text-slate-300">Prompt input unlocks after audio is loaded.</p>
          )}
        </section>
    </main>
  );
}
