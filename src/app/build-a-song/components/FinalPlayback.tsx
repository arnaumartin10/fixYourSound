"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Save, CheckCircle, Music2, Volume2, VolumeX, ChevronDown, Sparkles } from "lucide-react";
import { SongState, MelodyNote } from "./types";
import { SavePresetModal } from "@/components/SavePresetModal";
import { useCompletion } from "@ai-sdk/react";

interface Props {
  state: SongState;
}

const TRACK_CONFIG = [
  { key: "lead", label: "Lead Synth", color: "#00f5d4" },
  { key: "chords", label: "Chords", color: "#ffd166" },
  { key: "bass", label: "Bassline", color: "#9d4edd" },
  { key: "drums", label: "Rhythm", color: "#ff6b35" },
];

function noteToMidi(pitch: string): number {
  const match = pitch.match(/^([A-G]#?b?)(-?\d+)$/);
  if (!match) return 60;
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const [, name, octStr] = match;
  const oct = parseInt(octStr, 10);
  const pc = NOTE_NAMES.indexOf(name);
  return (oct + 1) * 12 + (pc >= 0 ? pc : 0);
}

// Subcomponent for the streaming Maestro Insight
function TrackInsightStream({ trackKey, state }: { trackKey: string; state: SongState }) {
  const { completion, complete, isLoading } = useCompletion({
    api: "/api/build-song/inspector-insight",
  });

  useEffect(() => {
    let params: any = null;
    if (trackKey === "lead") params = state.selectedSounds.lead?.params;
    else if (trackKey === "chords") params = state.selectedSounds.chords?.params;
    else if (trackKey === "bass") params = state.selectedSounds.bass?.params;

    complete("", {
      body: {
        track: trackKey,
        genre: state.genre,
        chords: state.selectedChordOption?.chords,
        melody: trackKey === "lead" ? state.selectedMelody?.lead : state.selectedMelody?.bassline,
        beat: state.selectedBeat,
        params,
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey]);

  return (
    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#9d4edd]/10 to-[#00f5d4]/10 border border-[#9d4edd]/20 flex gap-4">
      <div className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-[#9d4edd]/40 flex items-center justify-center flex-shrink-0">
        <Sparkles size={16} className="text-[#9d4edd]" />
      </div>
      <div>
        <h5 className="text-xs font-black text-white/50 uppercase tracking-widest mb-1">Maestro's Insight</h5>
        <p className="text-sm text-white/90 leading-relaxed min-h-[40px]">
          {completion || "Analyzing your choices..."}
          {isLoading && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              className="inline-block w-0.5 h-3.5 bg-[#9d4edd] ml-1 align-middle"
            />
          )}
        </p>
      </div>
    </div>
  );
}

export function FinalPlayback({ state }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBar, setCurrentBar] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const [solos, setSolos] = useState<Record<string, boolean>>({});
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  const stopRef = useRef<(() => void) | null>(null);
  
  // Audio Nodes caching for real-time muting
  const nodesRef = useRef<{
    lead: any; bass: any; chords: any; kick: any; snare: any; hat: any;
  } | null>(null);

  const bpm = state.selectedBeat?.tempo ?? state.selectedMelody?.bpm ?? 120;
  const maxTime = 8; // 8 bars

  // Helper for tracking MIDI bounds for UI
  const extractMidiVals = (notes: MelodyNote[]) => notes.map(n => noteToMidi(n.pitch));

  // Compute Volume / Muting logic dynamically
  useEffect(() => {
    if (!nodesRef.current) return;
    const updateVol = (key: string, baseVol: number, node: any) => {
      if (!node) return;
      const isMuted = mutes[key];
      const anySolo = Object.values(solos).some(Boolean);
      const isSoloed = solos[key];
      
      let finalVol = -Infinity;
      if (!isMuted) {
        if (!anySolo || isSoloed) {
          finalVol = baseVol;
        }
      }
      node.volume.value = finalVol;
    };

    updateVol("lead", 0, nodesRef.current.lead);
    updateVol("bass", -4, nodesRef.current.bass);
    updateVol("chords", -8, nodesRef.current.chords);
    updateVol("drums", 0, nodesRef.current.kick);
    updateVol("drums", -6, nodesRef.current.snare);
    updateVol("drums", -10, nodesRef.current.hat);
  }, [solos, mutes]);

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      stopRef.current?.();
      setIsPlaying(false);
      setCurrentBar(0);
      return;
    }
    setIsPlaying(true);
    setCurrentBar(0);

    try {
      const Tone = await import("tone");
      await Tone.start();
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();
      transport.bpm.value = bpm;

      // Helper to apply AI-generated params to Tone.js synth
      const applySynthParams = (synth: any, preset: any) => {
        if (!preset?.params) return;
        const p = preset.params;
        synth.set({
          oscillator: { type: p.oscillator || (preset.role === "bass" ? "sawtooth" : "triangle") },
          envelope: {
            attack: p.attack || 0.05,
            decay: p.decay || 0.2,
            sustain: p.sustain || 0.5,
            release: p.release || 0.8
          }
        });
      };

      // Ensure nodes map exists
      if (!nodesRef.current) {
        nodesRef.current = {
          lead: new Tone.Synth().toDestination(),
          bass: new Tone.Synth().toDestination(),
          chords: new Tone.PolySynth(Tone.Synth).toDestination(),
          kick: new Tone.MembraneSynth().toDestination(),
          snare: new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 } }).toDestination(),
          hat: new Tone.MetalSynth().toDestination(),
        };
      }

      // Sync parameters from global state
      applySynthParams(nodesRef.current.lead, state.selectedSounds.lead);
      applySynthParams(nodesRef.current.bass, state.selectedSounds.bass);
      applySynthParams(nodesRef.current.chords, state.selectedSounds.chords);

      // Force initial volume application
      setSolos(s => ({...s}));

      const { lead, bass, chords: chordSynth, kick, snare, hat } = nodesRef.current;
      const beatsPerSec = 60 / bpm;
      const secPerBar = 4 * beatsPerSec;

      // Lead & Bass
      if (state.selectedMelody) {
        for (let rep = 0; rep < 4; rep++) {
          const repOffset = rep * 2 * secPerBar;
          for (const note of state.selectedMelody.lead) {
            transport.schedule((time) => lead.triggerAttackRelease(note.pitch, note.duration * beatsPerSec, time), repOffset + note.startTime * beatsPerSec);
          }
          for (const note of state.selectedMelody.bassline) {
            transport.schedule((time) => bass.triggerAttackRelease(note.pitch, note.duration * beatsPerSec, time), repOffset + note.startTime * beatsPerSec);
          }
        }
      }

      // Chords
      if (state.selectedChordOption) {
        for (let rep = 0; rep < 4; rep++) {
          const repOffset = rep * 2 * secPerBar;
          state.selectedChordOption.chords.forEach((c, ci) => {
            const { Chord } = require("tonal");
            const notes = Chord.get(c.chord).notes.slice(0, 4).map((n: string) => `${n}4`);
            if (notes.length) transport.schedule((time) => chordSynth.triggerAttackRelease(notes, "2n", time), repOffset + ci * (2 * beatsPerSec));
          });
        }
      }

      // Drums
      if (state.selectedBeat) {
        for (let bar = 0; bar < 8; bar++) {
          for (let step = 0; step < 16; step++) {
            const t = bar * secPerBar + step * (secPerBar / 16);
            const drumTrackLen: number = state.selectedBeat.tracks[0]?.steps.length ?? 16;
            const si = step % drumTrackLen;
            for (const track of state.selectedBeat.tracks) {
              if (track.steps[si]) {
                if (track.instrument === "Kick") transport.schedule((time) => kick.triggerAttackRelease("C1", "8n", time), t);
                else if (track.instrument === "Snare") transport.schedule((time) => snare.triggerAttackRelease("8n", time), t);
                else if (track.instrument === "ClosedHat") transport.schedule((time) => hat.triggerAttackRelease("16n", time), t);
              }
            }
          }
        }
      }

      const barInterval = setInterval(() => setCurrentBar(b => (b >= 7 ? 0 : b + 1)), secPerBar * 1000);
      const totalDur = 8 * secPerBar * 1000;
      
      const endTimeout = setTimeout(() => {
        transport.stop(); transport.cancel();
        setIsPlaying(false); setCurrentBar(0); clearInterval(barInterval);
      }, totalDur + 200);

      transport.start();

      stopRef.current = () => {
        transport.stop(); transport.cancel();
        clearInterval(barInterval); clearTimeout(endTimeout);
      };
    } catch (e) {
      console.error("Playback error", e);
      setIsPlaying(false);
    }
  }, [isPlaying, bpm, state]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRef.current?.();
      if (nodesRef.current) {
        Object.values(nodesRef.current).forEach(n => { try { n.dispose() } catch {} });
      }
    };
  }, []);

  const getSongData = () => ({
    genre: state.genre, key: state.key, tempo: bpm,
    selectedChordOption: state.selectedChordOption, selectedBeat: state.selectedBeat,
    selectedMelody: state.selectedMelody, selectedSounds: state.selectedSounds,
    createdAt: new Date().toISOString(),
  });

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-br from-[#0d1a14] to-[#0a0a0a] rounded-3xl border border-[#00f5d4]/20 p-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#00f5d4]/20 rounded-2xl flex items-center justify-center text-[#00f5d4] shadow-[0_0_20px_rgba(0,245,212,0.3)]">
            <Music2 size={32} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-tighter">Your Song is Ready!</h3>
            <p className="text-white/40">{state.genre || "Original Composition"} · {bpm} BPM · {state.key}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <motion.button
            onClick={handlePlay}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={isPlaying ? { boxShadow: ["0 0 20px rgba(0,245,212,0.4)", "0 0 40px rgba(0,245,212,0.7)"] } : {}}
            transition={{ duration: 1, repeat: isPlaying ? Infinity : 0 }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all ${
              isPlaying ? "bg-white/10 text-[#00f5d4] border border-[#00f5d4]/50" : "bg-[#00f5d4] text-black"
            }`}
          >
            {isPlaying ? <Square size={18} /> : <Play size={18} />}
            {isPlaying ? "Stop" : "Play Full Song"}
          </motion.button>
          <button onClick={() => setShowSaveModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[#9d4edd] bg-[#9d4edd]/20 hover:bg-[#9d4edd]/30">
             {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
             {isSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* DAW Timeline */}
      <div className="bg-[#060606] rounded-3xl border border-white/5 p-4 md:p-6 overflow-hidden">
        {/* Timeline Header */}
        <div className="flex px-[100px] mb-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex-1 border-l border-white/10 pl-2 text-[10px] font-black text-white/30">
              Bar {i + 1}
            </div>
          ))}
        </div>

        {/* Tracks */}
        <div className="space-y-3 relative">
          {isPlaying && (
            <motion.div
              animate={{ left: `calc(100px + ${(currentBar / 8) * (100 - (10000/window.innerWidth))}%)` /* roughly */ }}
              transition={{ duration: (60 / bpm) * 4, ease: "linear" }}
              className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-20 shadow-[0_0_10px_white]"
              style={{ left: "100px" }}
            />
          )}

          {TRACK_CONFIG.map(track => {
            const isExpanded = expandedTrack === track.key;
            
            // Collect note data for the mini-blocks
            let miniNotes: Array<{x: number, w: number, y: number, h: number}> = [];
            if (track.key === "lead" && state.selectedMelody) {
              const vals = extractMidiVals(state.selectedMelody.lead);
              const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1, range = max - min;
              miniNotes = state.selectedMelody.lead.map(n => ({
                x: (n.startTime / maxTime) * 100, w: Math.max((n.duration / maxTime) * 100, 1),
                y: ((max - noteToMidi(n.pitch)) / range) * 100, h: (1/range)*100
              }));
            } else if (track.key === "bass" && state.selectedMelody) {
              const vals = extractMidiVals(state.selectedMelody.bassline);
              const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1, range = max - min;
              miniNotes = state.selectedMelody.bassline.map(n => ({
                x: (n.startTime / maxTime) * 100, w: Math.max((n.duration / maxTime) * 100, 1),
                y: ((max - noteToMidi(n.pitch)) / range) * 100, h: (1/range)*100
              }));
            }
            // Chords dots
            const chordsList = state.selectedChordOption?.chords ?? [];
            const chordDots = chordsList.map((c, i) => ({
              x: (i / chordsList.length) * 100, w: (1 / chordsList.length) * 100,
              label: c.chord
            }));

            return (
              <div key={track.key} className="flex flex-col gap-2 relative z-10">
                <div className="flex items-stretch h-16 gap-3 group">
                  {/* Track Header controls */}
                  <div 
                    className={`w-[100px] flex-shrink-0 rounded-l-xl p-2 flex flex-col justify-between transition-colors border-l-4 cursor-pointer hover:bg-white/5 ${isExpanded ? "bg-white/10" : "bg-white/3"}`}
                    style={{ borderLeftColor: track.color }}
                    onClick={() => setExpandedTrack(isExpanded ? null : track.key)}
                  >
                    <div className="text-[11px] font-black tracking-wider text-white/80">{track.label}</div>
                    
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => setSolos(s => ({...s, [track.key]: !s[track.key]}))}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${solos[track.key] ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50" : "bg-white/10 text-white/40"}`}
                      >S</button>
                      <button 
                        onClick={() => setMutes(m => ({...m, [track.key]: !m[track.key]}))}
                        className={`w-6 h-6 rounded flex items-center justify-center ${mutes[track.key] ? "bg-red-500/20 text-red-500 border border-red-500/50" : "bg-white/10 text-white/40"}`}
                      >
                        {mutes[track.key] ? <VolumeX size={12}/> : <Volume2 size={12}/>}
                      </button>
                    </div>
                  </div>

                  {/* Track Grid Blocks */}
                  <div 
                    className="flex-1 relative bg-white/3 rounded-r-xl overflow-hidden cursor-pointer hover:bg-white/5 transition-colors border border-white/5"
                    onClick={() => setExpandedTrack(isExpanded ? null : track.key)}
                  >
                    {/* Vertical dividers inner */}
                    {Array.from({length: 8}).map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 w-px bg-white/5" style={{ left: `${(i/8)*100}%` }} />
                    ))}

                    {/* MIDI rendering mini */}
                    {(track.key === "lead" || track.key === "bass") && miniNotes.map((n, i) => (
                      <div key={i} className="absolute rounded-[2px]" style={{ left: `${n.x}%`, width: `${n.w}%`, top: `${n.y}%`, height: `${Math.max(n.h, 15)}%`, backgroundColor: track.color }} />
                    ))}
                    
                    {track.key === "chords" && chordDots.map((c, i) => (
                      <div key={i} className="absolute top-2 bottom-2 rounded-md flex items-center justify-center" style={{ left: `${c.x}%`, width: `${c.w - 0.5}%`, backgroundColor: `${track.color}40`, border: `1px solid ${track.color}80` }}>
                        <span className="text-[10px] font-black text-black mix-blend-lighten opacity-80">{c.label}</span>
                      </div>
                    ))}

                    {track.key === "drums" && state.selectedBeat?.tracks.map((dt, ti) => (
                      dt.steps.map((on, si) => on ? (
                        <div key={`${ti}-${si}`} className="absolute top-1/4 rounded-[2px]" style={{ left: `${(si/16)*100}%`, width: `${(1/16)*100 - 0.5}%`, height: "50%", backgroundColor: ti===0 ? "#ff6b35" : "#ff9f1c", opacity: 0.8 }} />
                      ) : null)
                    ))}
                  </div>
                </div>

                {/* EXPANDED INSPECTOR PANEL */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pl-[112px]"
                    >
                      <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-5 mt-1 mb-4 shadow-xl">
                        
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-sm font-black text-white/50 tracking-widest uppercase">Track Inspector</h4>
                          <span className="text-xs px-2 py-1 rounded bg-white/5 text-white/40 font-bold border border-white/10">{track.label} parameters</span>
                        </div>

                        {/* AI Sound Design Config shown if applicable */}
                        {(track.key === "lead" || track.key === "bass" || track.key === "chords") && state.selectedSounds[track.key] && (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 relative z-10">
                            {Object.entries((state.selectedSounds[track.key] as any).params ?? {}).slice(0,4).map(([k,v]) => (
                               <div key={k} className="bg-white/5 rounded-lg p-3 border border-white/5">
                                 <div className="text-[9px] uppercase tracking-widest text-[#00f5d4]/70 mb-1">{k}</div>
                                 <div className="text-xs font-bold text-white truncate">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                               </div>
                            ))}
                          </div>
                        )}

                        <TrackInsightStream trackKey={track.key} state={state} />

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {showSaveModal && (
        <SavePresetModal
          category="SONG"
          getData={getSongData}
          isOpen={showSaveModal}
          onClose={() => { setShowSaveModal(false); setIsSaved(true); }}
          hideTriggerButton={true}
        />
      )}
    </div>
  );
}
