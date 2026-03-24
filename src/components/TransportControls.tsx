import { ChevronDown, Download, Pause, Play } from "lucide-react";
import { useState } from "react";

interface TransportControlsProps {
  isPlaying: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  isBouncing: boolean;
  hasPrompt: boolean;
  playbackVersion: "dry" | "processed" | null;
  onPlayOriginal: () => Promise<void>;
  onPlayProcessed: () => Promise<void>;
  onExport: (format: "wav" | "mp3") => Promise<void>;
}

export function TransportControls({
  isPlaying,
  isLoaded,
  isLoading,
  isBouncing,
  hasPrompt,
  playbackVersion,
  onPlayOriginal,
  onPlayProcessed,
  onExport,
}: TransportControlsProps) {
  const [showExportOptions, setShowExportOptions] = useState(false);
  const originalDisabled = !isLoaded || isLoading || isBouncing;
  const processedDisabled = !isLoaded || isLoading || !hasPrompt || isBouncing;
  const isOriginalPlaying = isPlaying && playbackVersion === "dry";
  const isProcessedPlaying = isPlaying && playbackVersion === "processed";

  return (
    <section className="relative grid gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={() => void onPlayOriginal()}
        disabled={originalDisabled}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300/40 bg-slate-500/15 px-4 py-3 text-sm text-slate-100 hover:bg-slate-400/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        {isOriginalPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {isOriginalPlaying ? "Pause Original" : "Play Original"}
      </button>
      <button
        type="button"
        onClick={() => void onPlayProcessed()}
        disabled={processedDisabled}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        {isProcessedPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {isProcessedPlaying ? "Pause Processed" : "Play Processed"}
      </button>

      <div className="relative flex">
        <button
          type="button"
          onClick={() => setShowExportOptions(!showExportOptions)}
          disabled={processedDisabled}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-l-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBouncing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isBouncing ? "Bouncing..." : "Download"}
        </button>
        <button
          type="button"
          onClick={() => setShowExportOptions(!showExportOptions)}
          disabled={processedDisabled}
          className="inline-flex items-center justify-center rounded-r-lg border-y border-r border-emerald-400/40 bg-emerald-500/15 px-2 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showExportOptions ? "rotate-180" : ""}`} />
        </button>

        {showExportOptions && (
          <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-white/10 bg-slate-900 p-1 shadow-2xl animate-in fade-in slide-in-from-top-1">
            <button
              onClick={() => {
                void onExport("wav");
                setShowExportOptions(false);
              }}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-200 hover:bg-emerald-500/20 rounded-md transition-colors"
            >
              WAV (High Quality)
            </button>
            <button
              onClick={() => {
                void onExport("mp3");
                setShowExportOptions(false);
              }}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-200 hover:bg-emerald-500/20 rounded-md transition-colors"
            >
              MP3 (Compressed)
            </button>
          </div>
        )}
      </div>

      {(isLoading || isBouncing) ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-slate-900/70 text-xs text-slate-100 backdrop-blur-sm">
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-cyan-300" />
            {isBouncing ? "Bouncing audio..." : "Loading Audio..."}
          </span>
        </div>
      ) : null}
    </section>
  );
}
