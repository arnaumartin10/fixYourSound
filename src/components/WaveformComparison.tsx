"use client";

interface WaveformComparisonProps {
  originalWaveform: Float32Array;
  processedWaveform: Float32Array;
  hasProcessedLayer: boolean;
}

export function WaveformComparison({
  originalWaveform,
  processedWaveform,
  hasProcessedLayer,
}: WaveformComparisonProps) {
  const renderBars = (data: Float32Array, colorClass: string) => (
    <div className="absolute inset-0 flex items-end gap-[1px] px-2 py-3">
      {Array.from(data).map((value, idx) => {
        const normalized = Math.max(0.04, Math.min(1, value));
        return (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={`${colorClass}-${idx}`}
            className={`w-full rounded-t ${colorClass}`}
            style={{ height: `${normalized * 100}%` }}
          />
        );
      })}
    </div>
  );

  return (
    <section className="relative h-36 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
      {renderBars(originalWaveform, "bg-slate-400/55")}
      {hasProcessedLayer && processedWaveform.length > 0 ? renderBars(processedWaveform, "bg-cyan-300/60") : null}
    </section>
  );
}
