"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import * as Tone from "tone";
import { AudioUploadZone } from "@/components/learning-hub/AudioUploadZone";
import { BypassToggle } from "@/components/learning-hub/BypassToggle";
import { GlossaryCard } from "@/components/learning-hub/GlossaryCard";
import { MentorSearch } from "@/components/learning-hub/MentorSearch";
import { getAllGlossaryEffects } from "@/lib/learningHub/effectsProcessor";


interface PlayingPlayers {
  dry: Tone.Player;
  wet: Tone.Player;
  dryGain: Tone.Gain;
  wetGain: Tone.Gain;
  effect: Tone.ToneAudioNode;
}

export default function LearningHubPage() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isBypassed, setIsBypassed] = useState(true);
  const [playingEffect, setPlayingEffect] = useState<{ effectId: string; players: PlayingPlayers } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const playerRef = useRef<Tone.Player | null>(null);
  const effectChainRef = useRef<Map<string, Tone.ToneAudioNode>>(new Map());
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const mixerRef = useRef<Tone.CrossFade | null>(null);
  const limiterRef = useRef<Tone.Limiter | null>(null);
  const activePlayersRef = useRef<Set<string>>(new Set());
  const playingEffectRef = useRef<{ effectId: string; players: PlayingPlayers } | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    playingEffectRef.current = playingEffect;
  }, [playingEffect]);

  // Initialize Tone.js audio context
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Tone.start();
        setIsReady(true);

        // Setup global audio chain
        const masterGain = new Tone.Gain(0.8);
        // CrossFade: 0 = input A (dry), 1 = input B (wet)
        const mixer = new Tone.CrossFade(0);
        const limiter = new Tone.Limiter(-3);

        masterGainRef.current = masterGain;
        mixerRef.current = mixer;
        limiterRef.current = limiter;

        // Route to destination
        mixer.connect(masterGain);
        masterGain.connect(limiter);
        limiter.connect(Tone.Destination);
      } catch (error) {
        console.error("Failed to initialize Tone.js:", error);
      }
    };

    initAudio();

    return () => {
      // Cleanup
      if (playerRef.current) {
        playerRef.current.dispose();
      }
      effectChainRef.current.forEach((effect) => {
        if (effect && typeof effect.dispose === "function") {
          effect.dispose();
        }
      });
      masterGainRef.current?.dispose();
      mixerRef.current?.dispose();
      limiterRef.current?.dispose();
    };
  }, []);

  // Handle audio file selection
  const handleFileSelect = useCallback((file: File) => {
    setAudioFile(file);
  }, []);

  // Handle audio buffer loaded from file
  const handleAudioLoad = useCallback((buffer: AudioBuffer) => {
    setAudioBuffer(buffer);
    setIsLoading(false);
  }, []);

  // Create Tone buffer from AudioBuffer
  const createToneBuffer = useCallback(async (buffer: AudioBuffer): Promise<Tone.ToneAudioBuffer> => {
    const toneBuffer = new Tone.ToneAudioBuffer();
    toneBuffer.set(buffer);
    return toneBuffer;
  }, []);

  // Stop all currently playing effects
  const stopAllEffects = useCallback(() => {
    const current = playingEffectRef.current;
    if (current?.players) {
      try {
        const { dry, wet, dryGain, wetGain, effect } = current.players;
        
        if (dry && dry.state === "started") {
          try {
            dry.stop();
          } catch (e) {
            // Already stopped
          }
        }
        if (wet && wet.state === "started") {
          try {
            wet.stop();
          } catch (e) {
            // Already stopped
          }
        }
        
        // Dispose after a small delay to ensure stop completes
        setTimeout(() => {
          try {
            dry?.dispose();
            wet?.dispose();
            dryGain?.dispose();
            wetGain?.dispose();
            effect?.dispose();
          } catch (e) {
            // Already disposed
          }
        }, 50);
      } catch (e) {
        console.error("Error stopping effects:", e);
      }
    }
    
    activePlayersRef.current.clear();
    setPlayingEffect(null);
  }, []);

  // Play effect
  const playEffect = useCallback(
    async (effectId: string) => {
      if (!audioBuffer || !isReady || !mixerRef.current) {
        console.warn("Audio not ready or buffer missing");
        return;
      }

      setIsLoading(true);

      try {
        // Stop previous playback using ref (always gets current value)
        const currentPlaying = playingEffectRef.current;
        if (currentPlaying?.players) {
          try {
            const { dry, wet } = currentPlaying.players;
            if (dry?.state === "started") dry.stop();
            if (wet?.state === "started") wet.stop();
            
            setTimeout(() => {
              currentPlaying.players.dry?.dispose();
              currentPlaying.players.wet?.dispose();
              currentPlaying.players.dryGain?.dispose();
              currentPlaying.players.wetGain?.dispose();
              currentPlaying.players.effect?.dispose();
            }, 50);
          } catch (e) {
            console.error("Error cleaning previous effect:", e);
          }
        }
        activePlayersRef.current.clear();

        // Create tone buffer
        const toneBuffer = await createToneBuffer(audioBuffer);

        // Get effect
        const effect = getAllGlossaryEffects().find((e) => e.id === effectId);
        if (!effect) {
          console.warn(`Effect ${effectId} not found`);
          return;
        }

        // Create effect instance
        const effectNode = effect.createEffect();

        // Create DRY player (original audio - input A)
        const dryGain = new Tone.Gain(0.5);
        const dryPlayer = new Tone.Player(toneBuffer);
        dryPlayer.connect(dryGain);
        dryGain.connect(mixerRef.current.a);

        // Create WET player (processed audio - input B)
        const wetGain = new Tone.Gain(0.5);
        const wetPlayer = new Tone.Player(toneBuffer);
        if (effectNode) {
          wetPlayer.chain(effectNode, wetGain);
        } else {
          wetPlayer.connect(wetGain);
        }
        wetGain.connect(mixerRef.current.b);

        // Always show WET (effect) when playing
        mixerRef.current.fade.value = 1;

        // Play both players simultaneously with current time
        const now = Tone.now();
        dryPlayer.start(now);
        wetPlayer.start(now);

        const players: PlayingPlayers = { dry: dryPlayer, wet: wetPlayer, dryGain, wetGain, effect: effectNode };
        
        setPlayingEffect({ effectId, players });
        activePlayersRef.current.add(dryPlayer as any);
        activePlayersRef.current.add(wetPlayer as any);

        console.log(`Playing effect: ${effect.name}`);
      } catch (error) {
        console.error("Error playing effect:", error);
        setPlayingEffect(null);
      } finally {
        setIsLoading(false);
      }
    },
    [audioBuffer, isReady, createToneBuffer]
  );

  // Handle bypass toggle
  const handleBypassToggle = useCallback(
    (bypassed: boolean) => {
      setIsBypassed(bypassed);

      if (mixerRef.current) {
        if (bypassed) {
          // Switch to DRY
          mixerRef.current.fade.value = 0;
        } else {
          // Switch to WET
          mixerRef.current.fade.value = 1;
        }
      }
    },
    []
  );

  const glossaryEffects = getAllGlossaryEffects();

  // Organize effects by category
  const effectsByCategory = glossaryEffects.reduce(
    (acc, effect) => {
      const category = effect.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(effect);
      return acc;
    },
    {} as Record<string, typeof glossaryEffects>
  );

  const categories = ["Spatial", "Temporal", "Dynamics", "Harmonic", "Spectral", "Modulation"];

  return (
    <main className="min-h-screen bg-black pt-24 pb-20">
      <div className="container mx-auto px-6 max-w-7xl space-y-12">
        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-5xl md:text-6xl font-black text-white">
            Interactive Audio Lab
          </h1>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            Learn DSP concepts by ear. Upload your sound and apply professional effects to understand how they work in real-time.
          </p>
        </motion.section>

        {/* HEADPHONES NOTICE */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-[#00f5d4]/10 to-[#0084ff]/10 border border-[#00f5d4]/30 rounded-lg p-4 flex items-start gap-3"
        >
          <div className="text-[#00f5d4] text-xl mt-0.5">🎧</div>
          <div>
            <p className="font-black text-white text-sm">Use Headphones for Best Results</p>
            <p className="text-[10px] text-white/60 mt-1">Closed-back headphones are essential to hear the subtle differences in reverb, delay, compression, and EQ effects.</p>
          </div>
        </motion.div>

        {/* UPLOAD ZONE */}
        <section className="space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-[#00f5d4]" />
            <h2 className="text-[10px] font-black text-white/30 uppercase tracking-widest">
              Upload Your Sound
            </h2>
            <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-[#00f5d4]" />
          </div>
          <AudioUploadZone onAudioLoad={handleAudioLoad} onFileSelect={handleFileSelect} isLoading={isLoading} />
        </section>

        {/* BYPASS TOGGLE */}
        {audioBuffer && (
          <section>
            <BypassToggle isBypassed={isBypassed} onToggle={handleBypassToggle} isLoading={isLoading} />
          </section>
        )}

        {/* GLOSSARY CARDS */}
        {audioBuffer && (
          <section>
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-[#00f5d4]" />
              <h2 className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                Audio Effects Glossary
              </h2>
              <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-[#00f5d4]" />
            </div>

            <div className="space-y-12">
              {categories.map((category, categoryIdx) => {
                const effects = effectsByCategory[category] || [];
                if (effects.length === 0) return null;

                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + categoryIdx * 0.1 }}
                  >
                    {/* Category Header */}
                    <div className="mb-6">
                      <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                        {category} EFFECTS
                      </h3>
                      <div className="w-12 h-1 bg-gradient-to-r from-[#00f5d4] to-transparent rounded-full mt-2" />
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {effects.map((effect) => (
                        <GlossaryCard
                          key={effect.id}
                          id={effect.id}
                          title={effect.title}
                          definition={effect.simpleDefinition}
                          category={effect.category}
                          icon={effect.icon}
                          isPlaying={playingEffect?.effectId === effect.id}
                          onPlay={() => playEffect(effect.id)}
                          onStop={stopAllEffects}
                          isLoading={isLoading && playingEffect?.effectId === effect.id}
                          isDisabled={isLoading}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* MENTOR SEARCH */}
        {audioBuffer && (
          <section>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-[#00f5d4]" />
              <h2 className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                Ask Questions
              </h2>
              <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-[#00f5d4]" />
            </div>
            <MentorSearch isDisabled={isLoading} />
          </section>
        )}

        {/* EMPTY STATE */}
        {!audioBuffer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center py-16"
          >
            <p className="text-sm text-white/40 uppercase tracking-wide">
              Upload your audio file to begin
            </p>
          </motion.div>
        )}

        {/* FOOTER */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center pt-12 border-t border-white/5"
        >
          <p className="text-xs text-white/30 uppercase tracking-wide">
            Powered by Tone.js and Google Gemini
          </p>
        </motion.footer>
      </div>
    </main>
  );
}
