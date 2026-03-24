"use client";

import { useAudioEngine } from "@/context/AudioEngineContext";
import { Activity, Beaker, Zap } from "lucide-react";

export function TransformationLogic() {
  const { dspState, explanation, lastCommand } = useAudioEngine();

  if (!lastCommand) return null;

  const transformations = [
    {
      label: "Lowpass Filter",
      value: `${Math.round(dspState.lowPass.frequency)}Hz`,
      active: dspState.lowPass.frequency < 19000,
    },
    {
      label: "Highpass Filter",
      value: `${Math.round(dspState.highPass.frequency)}Hz`,
      active: dspState.highPass.frequency > 40,
    },
    {
      label: "Distortion",
      value: `${(dspState.saturation.amount * 100).toFixed(1)}%`,
      active: dspState.saturation.amount > 0,
    },
    {
      label: "Bitcrusher",
      value: `${dspState.bitcrusher.bits} bits`,
      active: dspState.bitcrusher.bits < 16,
    },
    {
      label: "Reverb Mix",
      value: `${(dspState.reverb.wet * 100).toFixed(0)}%`,
      active: dspState.reverb.wet > 0,
    },
  ];

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-400">
        <Beaker size={16} />
        <h2>Engineering Log</h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {transformations
          .filter((t) => t.active)
          .map((t) => (
            <div key={t.label} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs border border-white/5">
              <span className="text-slate-400">{t.label}</span>
              <span className="font-mono text-white">{t.value}</span>
            </div>
          ))}
      </div>

      {explanation && (
        <div className="mt-2 flex gap-2 rounded-lg bg-cyan-500/10 p-3 text-xs text-cyan-100 border border-cyan-500/20">
          <Zap size={14} className="mt-0.5 shrink-0 text-cyan-400" />
          <p>
            <span className="font-semibold text-cyan-400">Reasoning:</span> {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
