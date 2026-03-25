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
      <div className="flex items-center gap-2 text-sm font-medium text-[#00f5d4]">
        <Beaker size={16} className="text-[#00f5d4] drop-shadow-[0_0_8px_rgba(0,245,212,0.4)]" />
        <h2 className="uppercase tracking-widest text-[10px] font-black">Engineering Log</h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {transformations
          .filter((t) => t.active)
          .map((t) => (
            <div key={t.label} className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2 text-[10px] border border-white/5 group transition-colors hover:border-[#00f5d4]/30">
              <span className="text-white/40 uppercase font-black tracking-tighter group-hover:text-white/60 transition-colors">{t.label}</span>
              <span className="font-mono text-[#00f5d4] font-bold group-hover:drop-shadow-[0_0_8px_rgba(0,245,212,0.4)] transition-all">{t.value}</span>
            </div>
          ))}
      </div>

      {explanation && (
        <div className="mt-2 flex gap-3 rounded-lg bg-[#9d4edd]/5 p-4 text-xs border border-[#9d4edd]/20 shadow-[inset_0_0_20px_rgba(157,78,237,0.05)]">
          <Zap size={14} className="mt-0.5 shrink-0 text-[#9d4edd] drop-shadow-[0_0_8px_#9d4edd]" />
          <p className="leading-relaxed">
            <span className="font-black uppercase tracking-tighter text-[#9d4edd] mr-1">Logic:</span> 
            <span className="text-white/70">{explanation}</span>
          </p>
        </div>
      )}
    </div>
  );
}
