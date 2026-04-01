"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import * as Tone from "tone";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Keyboard, Usb, Volume2, VolumeX, Waves, Sliders, Lightbulb, ChevronUp, ChevronDown, Square, Guitar, Music, Mic, Save } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { SavePresetModal } from "@/components/SavePresetModal";
import { getPresetById } from "@/actions/presetActions";
import { HelpButton } from "@/components/HelpButton";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface SynthParams {
  oscillator: "sine" | "square" | "sawtooth" | "triangle";
  subOscillator: boolean; subOctave: number;
  attack: number; decay: number; sustain: number; release: number;
  filterCutoff: number; filterQ: number;
  lfoRate: number; lfoDepth: number; lfoTarget: "pitch" | "filter";
  reverb: number; delay: number; delayTime: number;
  pitchEnvelope: { depth: number; attack: number };
  explanation: string; tips: string[]; isBass?: boolean;
}

interface GuitarParams {
  ampModel: string;
  amp: {
    gain: number;
    bass: number;
    middle: number;
    treble: number;
    presence: number;
    master: number;
  };
  distortion: number; chorus: number; chorusRate: number;
  delayTime: number; delayFeedback: number; delayMix: number;
  reverb: number; reverbDecay: number; compressor: number;
  filterFreq: number; filterQ: number;
  explanation: string; tips: string[];
}

// ─── KEY MAP ─────────────────────────────────────────────────────────────────

const KEY_MAP: Record<string, { note: string; octaveOffset: number }> = {
  a: { note: "C", octaveOffset: 0 }, w: { note: "C#", octaveOffset: 0 },
  s: { note: "D", octaveOffset: 0 }, e: { note: "D#", octaveOffset: 0 },
  d: { note: "E", octaveOffset: 0 }, f: { note: "F", octaveOffset: 0 },
  t: { note: "F#", octaveOffset: 0 }, g: { note: "G", octaveOffset: 0 },
  y: { note: "G#", octaveOffset: 0 }, h: { note: "A", octaveOffset: 0 },
  u: { note: "A#", octaveOffset: 0 }, j: { note: "B", octaveOffset: 0 },
  k: { note: "C", octaveOffset: 1 }, o: { note: "C#", octaveOffset: 1 },
  p: { note: "D#", octaveOffset: 1 },
};
const KEYBOARD_KEYS = Object.keys(KEY_MAP);

const WHITE_KEYS = [
  { key: "a", note: "C" }, { key: "s", note: "D" }, { key: "d", note: "E" },
  { key: "f", note: "F" }, { key: "g", note: "G" }, { key: "h", note: "A" },
  { key: "j", note: "B" }, { key: "k", note: "C", octaveOffset: 1 },
];
const BLACK_KEYS = [
  { key: "w", note: "C#", idx: 0 }, { key: "e", note: "D#", idx: 1 },
  { key: "t", note: "F#", idx: 3 }, { key: "y", note: "G#", idx: 4 },
  { key: "u", note: "A#", idx: 5 }, { key: "o", note: "C#", idx: 6 },
  { key: "p", note: "D#", idx: 7 },
];

// ─── ROTARY KNOB ─────────────────────────────────────────────────────────────

function RotaryKnob({ value, label, unit = "", min = 0, max = 1, color = "#00f5d4", onChange }: {
  value: number; label: string; unit?: string; min?: number; max?: number;
  color?: string; onChange?: (v: number) => void;
}) {
  // Guard against NaN (e.g. 0/0 when min===max)
  const rawNorm = (value - min) / (max - min);
  const norm = isFinite(rawNorm) ? Math.max(0, Math.min(1, rawNorm)) : 0;
  const startAngle = -135; const sweep = 270;
  const angle = startAngle + norm * sweep;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const CX = 40; const CY = 40; const r = 30;
  const arcX = (deg: number) => CX + r * Math.cos(toRad(deg));
  const arcY = (deg: number) => CY + r * Math.sin(toRad(deg));

  const arcPath = (() => {
    const end = startAngle + norm * sweep;
    if (norm === 0) return "";
    const la = norm * sweep > 180 ? 1 : 0;
    return `M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${la} 1 ${arcX(end)} ${arcY(end)}`;
  })();

  const rawDotX = arcX(angle); const rawDotY = arcY(angle);
  const dotX = isFinite(rawDotX) ? rawDotX : CX;
  const dotY = isFinite(rawDotY) ? rawDotY : CY;

  const dragRef = useRef<{ startY: number; startVal: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!onChange) return;
    dragRef.current = { startY: e.clientY, startVal: norm };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = (dragRef.current.startY - me.clientY) / 150;
      const newNorm = Math.max(0, Math.min(1, dragRef.current.startVal + delta));
      onChange(min + newNorm * (max - min));
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const safeVal = typeof value === "number" && isFinite(value) ? value : 0;
  const dispVal = safeVal < 1 ? safeVal.toFixed(2) : safeVal < 100 ? safeVal.toFixed(1) : Math.round(safeVal).toString();

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg width="80" height="80" className={`cursor-${onChange ? "ns-resize" : "default"}`} onMouseDown={onMouseDown}>
        <circle cx={CX} cy={CY} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="rgba(0,0,0,0.4)" />
        {norm > 0 && <path d={arcPath} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" style={{ transition: "d 0.3s ease" }} />}
        <circle cx={dotX} cy={dotY} r="4" fill={color} style={{ transition: "cx 0.3s ease, cy 0.3s ease" }} />
        <circle cx={CX} cy={CY} r="10" fill="rgba(30,30,30,0.9)" />
      </svg>
      <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{label}</span>
      <span className="text-xs font-bold" style={{ color }}>{dispVal}{unit}</span>
    </div>
  );
}

// ─── PIANO ───────────────────────────────────────────────────────────────────

function PianoKeyboard({ activeKeys, onPlay, onRelease, getNote }: {
  activeKeys: Set<string>; onPlay: (k: string) => void; onRelease: (k: string) => void;
  getNote: (k: string) => string;
}) {
  const wkw = 100 / 8;
  return (
    <div className="relative select-none h-[160px]">
      <div className="absolute inset-0 flex">
        {WHITE_KEYS.map((wk) => {
          const active = activeKeys.has(wk.key);
          return (
            <div key={wk.key} className="relative flex-1">
              <button
                onMouseDown={() => onPlay(wk.key)} onMouseUp={() => onRelease(wk.key)} onMouseLeave={() => onRelease(wk.key)}
                onTouchStart={(e) => { e.preventDefault(); onPlay(wk.key); }} onTouchEnd={(e) => { e.preventDefault(); onRelease(wk.key); }}
                className={`absolute inset-0 w-full rounded-b-2xl transition-all duration-75 flex flex-col items-center justify-end pb-2 ${active ? "bg-[#00f5d4] shadow-[inset_0_-4px_0_rgba(0,0,0,0.2),0_0_20px_rgba(0,245,212,0.4)]" : "bg-gradient-to-b from-gray-100 via-white to-gray-200 shadow-[inset_0_-4px_0_rgba(0,0,0,0.1)] hover:from-white"}`}
              >
                <span className={`text-[11px] font-bold mb-1 ${active ? "text-black/60" : "text-gray-400"}`}>{wk.key.toUpperCase()}</span>
                {active && <span className="text-[9px] font-bold text-black/50">{getNote(wk.key)}</span>}
              </button>
            </div>
          );
        })}
      </div>
      <div className="absolute top-0 left-0 right-0 h-[60%] pointer-events-none">
        {BLACK_KEYS.map((bk) => {
          const active = activeKeys.has(bk.key);
          const left = bk.idx * wkw + wkw * 0.65 - (wkw * 0.6) / 2;
          return (
            <button key={bk.key}
              onMouseDown={() => onPlay(bk.key)} onMouseUp={() => onRelease(bk.key)} onMouseLeave={() => onRelease(bk.key)}
              onTouchStart={(e) => { e.preventDefault(); onPlay(bk.key); }} onTouchEnd={(e) => { e.preventDefault(); onRelease(bk.key); }}
              className={`absolute h-full rounded-b-xl transition-all duration-75 flex flex-col items-center justify-end pb-1 pointer-events-auto ${active ? "bg-[#00f5d4] shadow-[0_0_15px_rgba(0,245,212,0.5)]" : "bg-gradient-to-b from-gray-900 to-gray-950 shadow-[0_4px_0_#111,0_6px_10px_rgba(0,0,0,0.5)] hover:from-gray-800"}`}
              style={{ width: `${wkw * 0.6}%`, left: `${left}%`, zIndex: 10 }}
            >
              <span className={`text-[9px] font-bold ${active ? "text-black/60" : "text-white/50"}`}>{bk.key.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function AISynthPageContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"synth" | "guitar">("synth");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [synthParams, setSynthParams] = useState<SynthParams | null>(null);
  const [guitarParams, setGuitarParams] = useState<GuitarParams | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [midiConnected, setMidiConnected] = useState(false);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [showEdu, setShowEdu] = useState(true);
  const [synthInit, setSynthInit] = useState(false);
  const [guitarInit, setGuitarInit] = useState(false);
  const [currentOctave, setCurrentOctave] = useState(3);
  const [octaveShift, setOctaveShift] = useState(0);
  const [palmMute, setPalmMute] = useState(false);
  const [liveAudio, setLiveAudio] = useState(false);
  const [presetLoaded, setPresetLoaded] = useState(false);

  // Active note tracking — key => note name
  const activeNotesRef = useRef<Map<string, string>>(new Map());
  const strumRef = useRef<{ time: number, count: number }>({ time: 0, count: 0 });

  // Synth nodes
  const synthRef = useRef<{
    synth: Tone.PolySynth | null; filter: Tone.Filter | null;
    reverb: Tone.Reverb | null; delay: Tone.FeedbackDelay | null;
    lfo: Tone.LFO | null; lfoGain: Tone.Gain | null;
    subOsc: Tone.Oscillator | null; subGain: Tone.Gain | null;
  }>({ synth: null, filter: null, reverb: null, delay: null, lfo: null, lfoGain: null, subOsc: null, subGain: null });

  // Guitar nodes
  const guitarRef = useRef<{
    sampler: Tone.Sampler | null;
    liveMic: Tone.UserMedia | null;
    eq: Tone.EQ3 | null;
    amp: {
      preGain: Tone.Gain;
      lowShelf: Tone.Filter;
      peaking: Tone.Filter;
      highShelf: Tone.Filter;
      presence: Tone.Filter;
      postGain: Tone.Gain;
    } | null;
    cab: Tone.Filter | null;
    dist: Tone.Distortion | null;
    chorus: Tone.Chorus | null;
    delay: Tone.FeedbackDelay | null;
    reverb: Tone.Reverb | null;
    comp: Tone.Compressor | null;
    wah: Tone.Filter | null;
  }>({ sampler: null, liveMic: null, eq: null, amp: null, cab: null, dist: null, chorus: null, delay: null, reverb: null, comp: null, wah: null });

  const getFullNote = useCallback((key: string): string => {
    const cfg = KEY_MAP[key]; if (!cfg) return "C4";
    return `${cfg.note}${currentOctave + cfg.octaveOffset + octaveShift}`;
  }, [currentOctave, octaveShift]);

  // ── Init Synth ──────────────────────────────────────────────────────────────
  const initSynth = useCallback(async () => {
    if (synthInit && synthRef.current.synth) return;
    await Tone.start();
    const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).toDestination();
    const delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0, wet: 0 });
    const filter = new Tone.Filter({ frequency: 2000, type: "lowpass", Q: 1 });
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
    });
    const lfo = new Tone.LFO(5, -1000, 1000);
    const lfoGain = new Tone.Gain(0);
    lfo.connect(lfoGain);
    const subOsc = new Tone.Oscillator("C2", "sine");
    const subGain = new Tone.Gain(0);
    synth.chain(filter, delay, reverb);
    lfoGain.connect(filter.frequency);
    synth.volume.value = 0;
    lfo.start();
    subOsc.connect(subGain);
    subGain.connect(filter);
    synthRef.current = { synth, filter, reverb, delay, lfo, lfoGain, subOsc, subGain };
    setSynthInit(true);
  }, [synthInit]);

  // ── Init Guitar ─────────────────────────────────────────────────────────────
  const initGuitar = useCallback(async () => {
    if (guitarInit && guitarRef.current.sampler) return;
    await Tone.start();
    
    // Pedalboard & FX
    const comp = new Tone.Compressor({ threshold: -24, ratio: 4 });
    const dist = new Tone.Distortion(0.3);
    const mod = new Tone.Chorus(1.5, 2, 0.2).start();
    const delay = new Tone.FeedbackDelay({ delayTime: 0.35, feedback: 0.3, wet: 0.0 });
    const rev = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).toDestination();
    const wah = new Tone.Filter({ frequency: 4500, type: "lowpass", Q: 1 });

    const eq = new Tone.EQ3({ low: 4, mid: 2, high: 0 });
    
    // Live Guitar Input (connected to the same EQ start point)
    const liveMic = new Tone.UserMedia();
    liveMic.connect(eq);

    // Amplifier Section (3-band EQ + master gain)
    const preGain = new Tone.Gain(1);
    const lowShelf = new Tone.Filter({ frequency: 150, type: "lowshelf", gain: 0 });
    const peaking = new Tone.Filter({ frequency: 800, type: "peaking", gain: 0, Q: 1 });
    const highShelf = new Tone.Filter({ frequency: 3000, type: "highshelf", gain: 0 });
    const presence = new Tone.Filter({ frequency: 6000, type: "peaking", gain: 0, Q: 1.5 });
    const postGain = new Tone.Gain(1);
    
    // Cabinet (lowpass)
    const cab = new Tone.Filter({ frequency: 4000, type: "lowpass", rolloff: -24 });

    // Single-file local Tone.Sampler
    const sampler = new Tone.Sampler({
      urls: {
        "C3": "/guitar/C3.mp3",
      },
      release: 1.5,
      attack: 0.01,
      baseUrl: ""
    });

    // Sampler -> EQ3 -> Comp -> Distortion -> Mod -> Delay -> Amp -> Cab -> Wah -> Reverb -> Out
    sampler.chain(
      eq,
      comp,
      dist,
      mod,
      delay,
      preGain, lowShelf, peaking, highShelf, presence, postGain,
      cab,
      wah,
      rev
    );
    sampler.volume.value = 0;
    
    guitarRef.current = { 
      sampler, 
      liveMic,
      eq,
      amp: { preGain, lowShelf, peaking, highShelf, presence, postGain },
      cab, dist, chorus: mod, delay, reverb: rev, comp, wah 
    };
    setGuitarInit(true);
  }, [guitarInit]);

  // ── Update synth params ──────────────────────────────────────────────────────
  const updateSynthParams = useCallback((p: SynthParams) => {
    const { synth, filter, delay, lfo, lfoGain, subOsc, subGain, reverb } = synthRef.current;
    if (!synth) return;
    const n = (v: unknown, fallback = 0) => { const num = Number(v); return isFinite(num) ? num : fallback; };
    synth.set({ oscillator: { type: p.oscillator }, envelope: { attack: n(p.attack, 0.01), decay: n(p.decay, 0.2), sustain: n(p.sustain, 0.5), release: n(p.release, 0.3) } });
    if (filter) { filter.frequency.value = n(p.filterCutoff, 2000); filter.Q.value = n(p.filterQ, 1); }
    if (lfo && lfoGain) { lfo.frequency.value = n(p.lfoRate, 5); lfoGain.gain.value = n(p.lfoDepth, 0); }
    if (delay) { delay.wet.value = n(p.delay, 0); delay.delayTime.value = n(p.delayTime, 0.25); }
    if (reverb) reverb.wet.value = n(p.reverb, 0.3);
    setOctaveShift(p.isBass && p.oscillator === "sine" ? -2 : 0);
    if (subOsc && subGain) {
      const targetGain = p.subOscillator ? 0.6 : 0;
      subGain.gain.value = targetGain;
      
      // IMPORTANT FIX: Start/stop the subOsc based on whether it's being used
      if (p.subOscillator && subOsc.state !== "started") {
        try { subOsc.start(); } catch (e) { /* Already started or error */ }
      } else if (!p.subOscillator && subOsc.state === "started") {
        try { subOsc.stop(); } catch (e) { /* Already stopped or error */ }
      }
      
      if (p.subOscillator) subOsc.frequency.value = Tone.Frequency("C3").transpose(n(p.subOctave, -12)).toFrequency();
    }
  }, []);

  // ── Update guitar params ─────────────────────────────────────────────────────
  const updateGuitarParams = useCallback((p: GuitarParams) => {
    const { sampler, amp, dist, chorus, delay, reverb, comp, wah } = guitarRef.current;
    if (!sampler) return;
    const n = (v: unknown, fallback = 0) => { const num = Number(v); return isFinite(num) ? num : fallback; };
    
    // Amp
    if (amp) {
      if (p.ampModel === "clean") {
        amp.preGain.gain.value = 1 + n(p.amp?.gain, 0.3);
        amp.lowShelf.gain.value = (n(p.amp?.bass, 0.5) - 0.5) * 10;
        amp.peaking.gain.value = (n(p.amp?.middle, 0.5) - 0.5) * 10;
        amp.highShelf.gain.value = (n(p.amp?.treble, 0.6) - 0.5) * 10;
        amp.presence.gain.value = (n(p.amp?.presence, 0.5) - 0.5) * 12;
      } else if (p.ampModel === "crunch") {
        amp.preGain.gain.value = 2 + n(p.amp?.gain, 0.5) * 2;
        amp.lowShelf.gain.value = (n(p.amp?.bass, 0.4) - 0.5) * 12;
        amp.peaking.gain.value = (n(p.amp?.middle, 0.7) - 0.5) * 15; // Mid boost
        amp.highShelf.gain.value = (n(p.amp?.treble, 0.5) - 0.5) * 10;
        amp.presence.gain.value = (n(p.amp?.presence, 0.4) - 0.5) * 10;
      } else {
        // High gain
        amp.preGain.gain.value = 3 + n(p.amp?.gain, 0.8) * 4;
        amp.lowShelf.gain.value = (n(p.amp?.bass, 0.7) - 0.5) * 15;
        amp.peaking.gain.value = (n(p.amp?.middle, 0.3) - 0.5) * 20; // Scooped mids
        amp.highShelf.gain.value = (n(p.amp?.treble, 0.7) - 0.5) * 12;
        amp.presence.gain.value = (n(p.amp?.presence, 0.7) - 0.5) * 12;
      }
      amp.postGain.gain.value = n(p.amp?.master, 0.7);
    }

    // Pedalboard
    if (dist) dist.distortion = n(p.distortion, 0);
    if (chorus) {
      if (typeof p.chorus === "number" && isFinite(p.chorus)) chorus.depth = p.chorus;
      if (typeof p.chorusRate === "number" && isFinite(p.chorusRate)) (chorus as Tone.Chorus).frequency.value = p.chorusRate;
    }
    if (delay) { delay.delayTime.value = n(p.delayTime, 0.35); delay.feedback.value = n(p.delayFeedback, 0.3); delay.wet.value = n(p.delayMix, 0.2); }
    if (reverb) { reverb.wet.value = n(p.reverb, 0.4); try { reverb.decay = n(p.reverbDecay, 2.5); } catch {} }
    if (comp) comp.ratio.value = 1 + n(p.compressor, 0) * 19;
    if (wah) { wah.frequency.value = n(p.filterFreq, 4500); wah.Q.value = n(p.filterQ, 1); }
  }, []);

  // ── Force Audio Reset ────────────────────────────────────────────────────────
  const forceAudioReset = useCallback(async () => {
    if (Tone.context.state === "suspended") {
      try {
        await Tone.context.resume();
      } catch {}
    }
    if (Tone.context.state !== "running") {
      const oldContext = Tone.context.rawContext as AudioContext;
      if (oldContext.state !== "closed") {
        try { await oldContext.close(); } catch {}
      }
      Tone.context.dispose();
      Tone.setContext(new Tone.Context());
      await Tone.start();
      await Tone.context.resume();
      setSynthInit(false);
      setGuitarInit(false);
      synthRef.current = { synth: null, filter: null, reverb: null, delay: null, lfo: null, lfoGain: null, subOsc: null, subGain: null };
      guitarRef.current = { sampler: null, liveMic: null, eq: null, amp: null, cab: null, dist: null, chorus: null, delay: null, reverb: null, comp: null, wah: null };
    }
  }, []);

  // ── Note play/release ────────────────────────────────────────────────────────
  const playNote = useCallback(async (key: string) => {
    if (activeNotesRef.current.has(key)) return;
    
    if (Tone.context.state !== "running") {
      await Tone.start();
      await Tone.context.resume();
    }
    
    const note = getFullNote(key);
    if (mode === "synth") {
      if (!synthInit) { await initSynth(); }
      try { synthRef.current.synth?.triggerAttack(note); } catch {}
    } else {
      if (!guitarInit) { await initGuitar(); }
      try { 
        if (!liveAudio) {
          const now = Tone.now();
          if (now - strumRef.current.time > 0.1) strumRef.current.count = 0;
          const delay = strumRef.current.count * 0.03;
          strumRef.current.time = now;
          strumRef.current.count++;
          
          const velocity = 0.8 + Math.random() * 0.2;
          guitarRef.current.sampler?.triggerAttack(note, now + delay, velocity); 
        }
      } catch {}
    }
    activeNotesRef.current.set(key, note);
    setActiveKeys((prev) => new Set([...prev, key]));
  }, [mode, synthInit, guitarInit, getFullNote, initSynth, initGuitar, liveAudio]);

  const releaseNote = useCallback((key: string) => {
    if (!activeNotesRef.current.has(key)) return;
    const note = activeNotesRef.current.get(key)!;
    if (mode === "synth") {
      try { synthRef.current.synth?.triggerRelease(note); } catch {}
    } else {
      if (palmMute) {
        try { guitarRef.current.sampler?.triggerRelease(note); } catch {}
      }
    }
    activeNotesRef.current.delete(key);
    setActiveKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
  }, [mode, palmMute]);

  const stopAllNotes = useCallback(() => {
    try { synthRef.current.synth?.releaseAll(); } catch {}
    
    // CRITICAL FIX: Stop the sub-oscillator if it's playing
    try {
      if (synthRef.current.subOsc?.state === "started") {
        synthRef.current.subOsc.stop();
      }
    } catch {}
    
    // Ensure all gains are set to 0 to eliminate any residual audio
    try { synthRef.current.subGain?.gain.setValueAtTime(0, Tone.now()); } catch {}
    try { synthRef.current.lfoGain?.gain.setValueAtTime(0, Tone.now()); } catch {}
    
    activeNotesRef.current.clear();
    setActiveKeys(new Set());
  }, []);

  // ── Keyboard events ──────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat || (e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
    const key = e.key.toLowerCase();
    if (KEYBOARD_KEYS.includes(key)) { e.preventDefault(); playNote(key); }
  }, [playNote]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (KEYBOARD_KEYS.includes(key)) { e.preventDefault(); releaseNote(key); }
  }, [releaseNote]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", stopAllNotes);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); window.removeEventListener("blur", stopAllNotes); };
  }, [handleKeyDown, handleKeyUp, stopAllNotes]);

  // ── MIDI ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess().then((access) => {
      Array.from(access.inputs.values()).forEach((input) => {
        if (!input) return;
        input.onmidimessage = (event) => {
          if (!event.data || event.data.length < 3) return;
          const [status, note, vel] = Array.from(event.data);
          const noteName = Tone.Frequency(note, "midi").toNote();
          if (status === 144 && vel > 0) { synthRef.current.synth?.triggerAttack(noteName); }
          else if (status === 128 || (status === 144 && vel === 0)) { synthRef.current.synth?.triggerRelease(noteName); }
        };
      });
      setMidiConnected(Array.from(access.inputs.values()).length > 0);
    }, () => setMidiConnected(false));
  }, []);

  useEffect(() => {
    if (synthRef.current.synth) synthRef.current.synth.volume.value = isMuted ? -Infinity : 0;
    if (guitarRef.current.sampler) guitarRef.current.sampler.volume.value = isMuted ? -Infinity : 0;
  }, [isMuted]);

  // ── Load Preset from URL ───────────────────────────────────────────────────
  useEffect(() => {
    const loadPreset = async () => {
      const presetId = searchParams.get("presetId");
      if (!presetId || presetLoaded) return;

      try {
        const preset = await getPresetById(presetId);
        if (!preset) return;

        const data = JSON.parse(preset.data);
        
        if (preset.category === "GUITAR") {
          setMode("guitar");
          setGuitarParams(data);
          setTimeout(() => updateGuitarParams(data), 100);
        } else if (preset.category === "SYNTH") {
          setMode("synth");
          setSynthParams(data);
          setTimeout(() => updateSynthParams(data), 100);
        }
        setPresetLoaded(true);
      } catch (err) {
        console.error("Failed to load preset:", err);
      }
    };

    loadPreset();
  }, [searchParams]);

  // ── Live Guitar Input ────────────────────────────────────────────────────────
  const toggleLiveAudio = useCallback(async () => {
    if (!guitarInit) await initGuitar();
    
    const { liveMic } = guitarRef.current;
    if (!liveMic) return;

    if (liveAudio) {
      liveMic.close();
      setLiveAudio(false);
    } else {
      try {
        await liveMic.open();
        setLiveAudio(true);
      } catch (err) {
        console.error("Microphone access denied or error:", err);
        alert("Microphone access is required for Live Guitar Input.");
      }
    }
  }, [guitarInit, liveAudio, initGuitar]);

  // ── AI Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (mode === "synth") await initSynth(); else await initGuitar();
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai-synth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode }),
      });
      const data = await res.json();
      if (mode === "synth") {
        const isBass = /808|bass|sub/i.test(prompt);
        const p = { ...data, isBass };
        setSynthParams(p); updateSynthParams(p);
      } else {
        setGuitarParams(data); updateGuitarParams(data);
      }
      setShowEdu(true);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleSynthKnob = (key: keyof SynthParams, value: number) => {
    if (!synthParams) return;
    const p = { ...synthParams, [key]: value };
    setSynthParams(p); updateSynthParams(p);
  };

  const handleGuitarKnob = (key: keyof GuitarParams, value: number) => {
    if (!guitarParams) return;
    const p = { ...guitarParams, [key]: value };
    setGuitarParams(p); updateGuitarParams(p);
  };

  const activeParams = mode === "synth" ? synthParams : guitarParams;
  const presets = mode === "synth"
    ? ["80s Synthwave", "808 Bass", "Ambient Pad", "Sci-Fi Laser", "Ethereal Keys"]
    : ["Kurt Cobain Nevermind", "David Gilmour Comfortably Numb", "Jimi Hendrix Voodoo Child", "Clean Country Picking", "Metal Chug"];

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black text-white mb-4 tracking-tighter">AI Sound Studio</h1>
        <p className="text-white/50 text-lg max-w-2xl mx-auto">Describe any tone — AI crafts the perfect patch</p>
      </div>

      {/* Mode Switcher & Controls */}
      <div className="flex justify-center mb-10 gap-4">
        <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
          {(["synth", "guitar"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setPrompt(""); stopAllNotes(); }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 ${mode === m ? "bg-[#00f5d4] text-black shadow-[0_0_20px_rgba(0,245,212,0.3)]" : "text-white/50 hover:text-white"}`}>
              {m === "synth" ? <Music size={16} /> : <Guitar size={16} />}
              {m === "synth" ? "Synth Mode" : "Guitar Mode"}
            </button>
          ))}
        </div>
        
        <button onClick={forceAudioReset}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
          title="Force reset AudioContext if audio is stuck">
          <VolumeX size={16} />
          Force Audio Reset
        </button>
        
        {mode === "guitar" && (
          <div className="flex gap-2">
            <button onClick={() => setPalmMute(!palmMute)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 border ${
                palmMute ? "bg-red-500/20 text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-white/5 text-white/50 border-white/10 hover:text-white"
              }`}>
              Palm Mute {palmMute ? "ON" : "OFF"}
            </button>
            
            <button 
              onClick={toggleLiveAudio}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 border relative group ${
                liveAudio ? "bg-[#00f5d4]/20 text-[#00f5d4] border-[#00f5d4]/50 shadow-[0_0_15px_rgba(0,245,212,0.2)]" : "bg-white/5 text-white/50 border-white/10 hover:text-white"
              }`}>
              <Mic size={16} />
              Live Guitar {liveAudio ? "ON" : "OFF"}
              
              {/* Tooltip */}
              <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] py-1 px-3 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-red-500">
                ⚠️ Use headphones to prevent feedback loops!
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          {/* AI Prompt */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d4]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="text-[#00f5d4]" size={24} />
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  {mode === "synth" ? "AI Sound Designer" : "AI Tone Matcher"}
                </h2>
              </div>
              <div className="flex gap-4">
                <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  placeholder={mode === "synth" ? "e.g., '80s Stranger Things synth'" : "e.g., 'Kurt Cobain Nevermind tone'"}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00f5d4]/50 transition-colors text-lg" />
                <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()}
                  className="px-8 py-4 bg-[#00f5d4] text-black rounded-2xl font-black flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                  {isLoading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" /> : <><Send size={18} />{mode === "synth" ? "Generate" : "Match Tone"}</>}
                </button>
                {activeParams && (
                  <SavePresetModal 
                    category={mode === "synth" ? "SYNTH" : "GUITAR"} 
                    getData={() => mode === "synth" ? synthParams : guitarParams}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {presets.map((p) => (
                  <button key={p} onClick={() => setPrompt(p)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white hover:border-[#00f5d4]/30 transition-colors">{p}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── SYNTH PARAMS ── */}
          <AnimatePresence mode="wait">
            {mode === "synth" && synthParams && (
              <motion.div key="synth-params" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8 space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Sliders className="text-[#9d4edd]" size={22} /><h2 className="text-xl font-black text-white uppercase tracking-tight">Synth Engine</h2></div>
                  <button onClick={stopAllNotes} className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-1.5"><Square size={12} />Stop All</button>
                </div>

                {/* Oscillator */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Oscillator</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {(["sine", "square", "sawtooth", "triangle"] as const).map((t) => (
                      <button key={t} onClick={() => handleSynthKnob("oscillator" as any, t as any)}
                        className={`p-3 rounded-xl border text-sm font-bold transition-all capitalize ${synthParams.oscillator === t ? "bg-[#00f5d4] border-[#00f5d4] text-black" : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"}`}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* ADSR Knobs */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6">Envelope (ADSR)</h3>
                  <div className="flex justify-around">
                    <RotaryKnob label="Attack" value={synthParams.attack} min={0.001} max={2} unit="s" onChange={(v) => handleSynthKnob("attack", v)} />
                    <RotaryKnob label="Decay" value={synthParams.decay} min={0.001} max={2} unit="s" onChange={(v) => handleSynthKnob("decay", v)} />
                    <RotaryKnob label="Sustain" value={synthParams.sustain} min={0} max={1} onChange={(v) => handleSynthKnob("sustain", v)} />
                    <RotaryKnob label="Release" value={synthParams.release} min={0.01} max={4} unit="s" onChange={(v) => handleSynthKnob("release", v)} />
                  </div>
                </div>

                {/* Filter Knobs */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6">Filter</h3>
                  <div className="flex justify-around">
                    <RotaryKnob label="Cutoff" value={synthParams.filterCutoff} min={20} max={20000} unit="Hz" color="#9d4edd" onChange={(v) => handleSynthKnob("filterCutoff", v)} />
                    <RotaryKnob label="Resonance" value={synthParams.filterQ} min={0} max={20} color="#9d4edd" onChange={(v) => handleSynthKnob("filterQ", v)} />
                  </div>
                </div>

                {/* LFO knobs */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6">LFO</h3>
                  <div className="flex justify-around items-start">
                    <RotaryKnob label="Rate" value={synthParams.lfoRate} min={0.1} max={30} unit="Hz" color="#f59e0b" onChange={(v) => handleSynthKnob("lfoRate", v)} />
                    <RotaryKnob label="Depth" value={synthParams.lfoDepth} min={0} max={1} color="#f59e0b" onChange={(v) => handleSynthKnob("lfoDepth", v)} />
                    <div className="flex flex-col items-center gap-2 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Target</span>
                      <div className="flex flex-col gap-2">
                        {(["pitch", "filter"] as const).map((t) => (
                          <button key={t} onClick={() => handleSynthKnob("lfoTarget" as any, t as any)}
                            className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all capitalize ${synthParams.lfoTarget === t ? "bg-[#f59e0b] border-[#f59e0b] text-black" : "bg-white/5 border-white/10 text-white/50"}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FX */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6">Effects Mix</h3>
                  <div className="flex justify-around">
                    <RotaryKnob label="Reverb" value={synthParams.reverb} min={0} max={1} color="#06b6d4" onChange={(v) => handleSynthKnob("reverb", v)} />
                    <RotaryKnob label="Delay" value={synthParams.delay} min={0} max={1} color="#06b6d4" onChange={(v) => handleSynthKnob("delay", v)} />
                    <RotaryKnob label="Dly Time" value={synthParams.delayTime} min={0.01} max={1} unit="s" color="#06b6d4" onChange={(v) => handleSynthKnob("delayTime", v)} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── GUITAR PEDALBOARD ── */}
            {mode === "guitar" && guitarParams && (
              <motion.div key="guitar-params" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                className="space-y-6 relative">
                
                {/* 1. AMPLIFIER SECTION */}
                <div className={`rounded-3xl border p-8 space-y-8 relative overflow-hidden transition-colors duration-500 shadow-2xl ${
                  guitarParams.ampModel === "clean" ? "bg-[#d4b483]/10 border-[#d4b483]/40" : // Vintage Tweed
                  guitarParams.ampModel === "crunch" ? "bg-zinc-800/80 border-zinc-500/50" : // British Classic
                  "bg-black border-red-900/50" // Modern High-Gain
                }`}>
                  {/* Vintage Tolex / Mesh Texture Overlay */}
                  <div className={`absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay ${
                    guitarParams.ampModel === "clean" ? "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuNSIgc3Ryb2tlLXdpZHRoPSIwLjUiLz4KPC9zdmc+')] bg-repeat" : 
                    guitarParams.ampModel === "crunch" ? "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC41Ii8+Cjwvc3ZnPg==')] bg-repeat" :
                    "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8cGF0aCBkPSJNMCA4TDggMFpNMCAwTDggOFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg==')] bg-repeat"
                  }`} />
                  
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3">
                      <Guitar className={
                        guitarParams.ampModel === "clean" ? "text-[#d4b483]" :
                        guitarParams.ampModel === "crunch" ? "text-zinc-300" :
                        "text-red-600"
                      } size={32} />
                      <div>
                        <h2 className={`text-2xl font-black uppercase tracking-tight ${
                          guitarParams.ampModel === "clean" ? "text-[#d4b483]" :
                          guitarParams.ampModel === "crunch" ? "text-amber-500" :
                          "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                        }`}>
                          {guitarParams.ampModel === "clean" ? "Tweed '59" :
                           guitarParams.ampModel === "crunch" ? "Brit JCM" :
                           "Dual Rectifier"}
                        </h2>
                        <p className="text-white/60 text-[10px] font-bold tracking-widest uppercase mt-1">
                          {guitarParams.ampModel === "clean" ? "Vintage High Headroom Amp" :
                           guitarParams.ampModel === "crunch" ? "Classic Mid-Gain Stack" :
                           "Modern High-Gain Lead"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Amp Knobs */}
                  <div className={`flex justify-around rounded-2xl p-6 border relative z-10 shadow-inner ${
                    guitarParams.ampModel === "clean" ? "bg-black/20 border-[#d4b483]/20" :
                    guitarParams.ampModel === "crunch" ? "bg-amber-900/10 border-amber-500/20" :
                    "bg-red-950/10 border-red-900/40"
                  }`}>
                    <RotaryKnob label="Gain" value={guitarParams.amp.gain} min={0.1} max={1} color={guitarParams.ampModel === "highgain" ? "#ef4444" : "#f8fafc"} onChange={(v) => handleGuitarKnob("amp", { ...guitarParams.amp, gain: v } as any)} />
                    <RotaryKnob label="Bass" value={guitarParams.amp.bass} min={0} max={1} color="#f8fafc" onChange={(v) => handleGuitarKnob("amp", { ...guitarParams.amp, bass: v } as any)} />
                    <RotaryKnob label="Middle" value={guitarParams.amp.middle} min={0} max={1} color="#f8fafc" onChange={(v) => handleGuitarKnob("amp", { ...guitarParams.amp, middle: v } as any)} />
                    <RotaryKnob label="Treble" value={guitarParams.amp.treble} min={0} max={1} color="#f8fafc" onChange={(v) => handleGuitarKnob("amp", { ...guitarParams.amp, treble: v } as any)} />
                    <RotaryKnob label="Presence" value={guitarParams.amp.presence} min={0} max={1} color="#f8fafc" onChange={(v) => handleGuitarKnob("amp", { ...guitarParams.amp, presence: v } as any)} />
                    <div className="w-px h-16 bg-white/10 mx-2 self-center rotate-12"></div>
                    <RotaryKnob label="Master" value={guitarParams.amp.master} min={0.1} max={1} color="#ef4444" onChange={(v) => handleGuitarKnob("amp", { ...guitarParams.amp, master: v } as any)} />
                  </div>
                </div>

                {/* 2. PEDALBOARD GRID */}
                <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-8">
                  <h3 className="text-sm font-black text-white/50 uppercase tracking-widest mb-6">Stompboxes</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    {/* Compressor Pedal (Silver) */}
                    <div className={`p-5 rounded-2xl border-t-8 border-t-slate-300 bg-slate-900 border border-slate-700 relative shadow-2xl flex flex-col items-center justify-between min-h-[220px] transition-all duration-300 ${guitarParams.compressor > 0.05 ? "opacity-100" : "opacity-60"}`}>
                      <div className={`w-3 h-3 rounded-full mb-4 transition-all duration-300 ${guitarParams.compressor > 0.05 ? "bg-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]" : "bg-red-950"}`} />
                      <RotaryKnob label="Sustain" value={guitarParams.compressor} min={0} max={1} color="#cbd5e1" onChange={(v) => handleGuitarKnob("compressor", v)} />
                      <div className="mt-6 text-center w-full bg-black/30 py-2 rounded-lg">
                        <span className="block text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase">CS-3 Comp</span>
                      </div>
                    </div>

                    {/* Overdrive/Fuzz Pedal (Orange) */}
                    <div className={`p-5 rounded-2xl border-t-8 border-t-orange-500 bg-orange-950 border border-orange-800 relative shadow-2xl flex flex-col items-center justify-between min-h-[220px] transition-all duration-300 ${guitarParams.distortion > 0.05 ? "opacity-100" : "opacity-60"}`}>
                      <div className={`w-3 h-3 rounded-full mb-4 transition-all duration-300 ${guitarParams.distortion > 0.05 ? "bg-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]" : "bg-red-950"}`} />
                      <RotaryKnob label="Drive" value={guitarParams.distortion} min={0} max={1} color="#f97316" onChange={(v) => handleGuitarKnob("distortion", v)} />
                      <div className="mt-6 text-center w-full bg-black/30 py-2 rounded-lg">
                        <span className="block text-[10px] font-black text-orange-400 tracking-[0.2em] uppercase">DS-1 Drive</span>
                      </div>
                    </div>

                    {/* Chorus Pedal (Teal) */}
                    <div className={`p-5 rounded-2xl border-t-8 border-t-teal-400 bg-teal-950 border border-teal-800 relative shadow-2xl flex flex-col items-center justify-between min-h-[220px] gap-4 transition-all duration-300 ${guitarParams.chorus > 0.05 ? "opacity-100" : "opacity-60"}`}>
                      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${guitarParams.chorus > 0.05 ? "bg-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]" : "bg-red-950"}`} />
                      <div className="flex gap-4">
                        <RotaryKnob label="Depth" value={guitarParams.chorus} min={0} max={1} color="#2dd4bf" onChange={(v) => handleGuitarKnob("chorus", v)} />
                        <RotaryKnob label="Rate" value={guitarParams.chorusRate} min={0.1} max={8} unit="Hz" color="#2dd4bf" onChange={(v) => handleGuitarKnob("chorusRate", v)} />
                      </div>
                      <div className="mt-2 text-center w-full bg-black/30 py-2 rounded-lg">
                        <span className="block text-[10px] font-black text-teal-300 tracking-[0.2em] uppercase">CE-2 Chorus</span>
                      </div>
                    </div>

                    {/* Delay Pedal (Blue) */}
                    <div className={`p-5 rounded-2xl border-t-8 border-t-blue-500 bg-blue-950 border border-blue-800 relative shadow-2xl flex flex-col items-center justify-between min-h-[220px] gap-4 transition-all duration-300 ${guitarParams.delayMix > 0.05 ? "opacity-100" : "opacity-60"}`}>
                      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${guitarParams.delayMix > 0.05 ? "bg-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]" : "bg-red-950"}`} />
                      <div className="flex gap-4">
                        <RotaryKnob label="Time" value={guitarParams.delayTime} min={0.05} max={1} unit="s" color="#3b82f6" onChange={(v) => handleGuitarKnob("delayTime", v)} />
                        <RotaryKnob label="Mix" value={guitarParams.delayMix} min={0} max={1} color="#3b82f6" onChange={(v) => handleGuitarKnob("delayMix", v)} />
                      </div>
                      <div className="mt-2 text-center w-full bg-black/30 py-2 rounded-lg">
                        <span className="block text-[10px] font-black text-blue-400 tracking-[0.2em] uppercase">DD-3 Delay</span>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Effects (Wah + Reverb) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {/* Wah / Filter Pedal (Black) */}
                    <div className={`md:col-start-3 p-5 rounded-2xl border-t-8 border-t-zinc-600 bg-zinc-950 border border-zinc-800 relative shadow-2xl flex flex-col items-center justify-between min-h-[220px] transition-all duration-300`}>
                      <div className="w-3 h-3 rounded-full mb-4 bg-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]" />
                      <RotaryKnob label="Wah Freq" value={guitarParams.filterFreq} min={200} max={8000} unit="Hz" color="#e4e4e7" onChange={(v) => handleGuitarKnob("filterFreq", v)} />
                      <div className="mt-6 text-center w-full bg-black/30 py-2 rounded-lg">
                        <span className="block text-[10px] font-black text-zinc-300 tracking-[0.2em] uppercase">Cry Wah</span>
                      </div>
                    </div>

                    {/* Reverb Pedal (Purple) */}
                    <div className={`p-5 rounded-2xl border-t-8 border-t-purple-500 bg-purple-950 border border-purple-800 relative shadow-2xl flex flex-col items-center justify-between min-h-[220px] transition-all duration-300 ${guitarParams.reverb > 0.05 ? "opacity-100" : "opacity-60"}`}>
                      <div className={`w-3 h-3 rounded-full mb-4 transition-all duration-300 ${guitarParams.reverb > 0.05 ? "bg-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]" : "bg-red-950"}`} />
                      <RotaryKnob label="Reverb" value={guitarParams.reverb} min={0} max={1} color="#a855f7" onChange={(v) => handleGuitarKnob("reverb", v)} />
                      <div className="mt-6 text-center w-full bg-black/30 py-2 rounded-lg">
                        <span className="block text-[10px] font-black text-purple-400 tracking-[0.2em] uppercase">RV-5 Space</span>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Educational */}
          <AnimatePresence>
            {activeParams && showEdu && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-br from-[#9d4edd]/10 to-transparent rounded-3xl border border-[#9d4edd]/20 p-8">
                <button onClick={() => setShowEdu(false)} className="w-full flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3"><Lightbulb className="text-[#9d4edd]" size={24} /><h2 className="text-xl font-black text-white uppercase tracking-tight">AI Reasoning</h2></div>
                  <ChevronUp size={20} className="text-white/30" />
                </button>
                <p className="text-white/70 leading-relaxed mb-6">{(activeParams as any).explanation}</p>
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#9d4edd]">Tips</h3>
                  <ul className="space-y-1">
                    {(activeParams as any).tips?.map((tip: string, i: number) => (
                      <li key={i} className="text-sm text-white/50 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#9d4edd]" />{tip}</li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Piano */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Keyboard className="text-[#00f5d4]" size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{mode === "synth" ? "Piano" : "Strum"}</span>
              </div>
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                {isMuted ? <VolumeX size={18} className="text-white/50" /> : <Volume2 size={18} className="text-[#00f5d4]" />}
              </button>
            </div>
            <PianoKeyboard activeKeys={activeKeys} onPlay={playNote} onRelease={releaseNote} getNote={getFullNote} />
            <p className="text-[10px] text-white/30 mt-4 text-center">A–K (white) · W E T Y U O P (black)</p>
          </div>

          {/* Octave controls */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Octave &amp; Shift</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-white/30 block mb-2">Octave: <span className="text-[#00f5d4] font-bold">{currentOctave}</span></label>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentOctave((o) => Math.max(1, o - 1))} className="flex-1 p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center justify-center"><ChevronDown size={14} /></button>
                  <button onClick={() => setCurrentOctave((o) => Math.min(7, o + 1))} className="flex-1 p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center justify-center"><ChevronUp size={14} /></button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/30 block mb-2">Shift: <span className="text-[#00f5d4] font-bold">{octaveShift > 0 ? "+" : ""}{octaveShift}</span></label>
                <div className="flex gap-2">
                  <button onClick={() => setOctaveShift((s) => Math.max(-2, s - 1))} className="flex-1 p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors font-bold text-sm">-1</button>
                  <button onClick={() => setOctaveShift((s) => Math.min(2, s + 1))} className="flex-1 p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors font-bold text-sm">+1</button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Notes */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Waves className="text-[#00f5d4]" size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Active Notes</span>
            </div>
            <div className="min-h-[48px] flex flex-wrap gap-2">
              {activeKeys.size > 0
                ? Array.from(activeKeys).map((k) => <span key={k} className="px-3 py-1 bg-[#00f5d4]/20 text-[#00f5d4] rounded-lg text-sm font-bold">{getFullNote(k)}</span>)
                : <span className="text-xs text-white/30">Press keys to play</span>}
            </div>
          </div>

          {/* MIDI */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Usb className={midiConnected ? "text-[#00f5d4]" : "text-white/30"} size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">MIDI</span>
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded ${midiConnected ? "bg-[#00f5d4]/20 text-[#00f5d4]" : "bg-white/5 text-white/30"}`}>{midiConnected ? "Connected" : "No Device"}</span>
            </div>
            <p className="text-xs text-white/30">{midiConnected ? "Play using your MIDI controller" : "Connect a MIDI device to use it"}</p>
          </div>
        </div>
      </div>

      <HelpButton 
        toolName="AI Synth"
        content={{
          what: "AI Synth generates custom synthesizer and guitar patches based on your description. It creates playable sounds with adjustable parameters.",
          why: "Use it to quickly prototype sounds, learn sound design by seeing the AI's reasoning, or get inspired by describing tones you might not know how to create manually.",
          how: "1. Select Synth or Guitar mode\n2. Type a description like 'warm 80s pad' or 'crunchy guitar'\n3. Click Generate\n4. Play with keyboard or MIDI controller\n5. Adjust individual knobs to customize",
          tips: [
            "Be specific: 'warm analog bass' works better than 'good bass'",
            "Reference artists or genres: 'Gilmour solo tone' or 'vaporwave synth'",
            "Include adjectives: 'bright', 'dark', 'aggressive', 'mellow'",
            "Mention vibe: 'nostalgic', 'cinematic', 'driving'"
          ],
          productionTip: "The AI explains why certain settings were chosen. Use this to learn sound design fundamentals. Copy the settings to your favorite VST (Serum, Massive, Omnisphere, etc.) in your DAW."
        }}
      />
    </div>
  );
}

export default function AISynthPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-12"><div className="animate-pulse h-96 bg-white/5 rounded-3xl" /></div>}>
      <AISynthPageContent />
    </Suspense>
  );
}
