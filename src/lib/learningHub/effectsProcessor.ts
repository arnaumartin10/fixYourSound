import * as Tone from "tone";

export interface GlossaryEffect {
  id: string;
  title: string;
  simpleDefinition: string;
  category: string;
  icon: string;
  createEffect: () => Tone.ToneAudioNode;
  bypassable: boolean;
}

export interface EffectChain {
  effects: Map<string, Tone.ToneAudioNode>;
  mixer: Tone.CrossFade;
  masterGain: Tone.Gain;
  limiter: Tone.Limiter;
  dryAnalyser: Tone.Analyser;
  processedAnalyser: Tone.Analyser;
  dispose: () => void;
}

/**
 * Create a unified effect chain for the learning hub glossary
 */
export function createEffectChain(): EffectChain {
  const dryAnalyser = new Tone.Analyser("waveform");
  dryAnalyser.size = 2048;
  
  const processedAnalyser = new Tone.Analyser("waveform");
  processedAnalyser.size = 2048;

  const mixer = new Tone.CrossFade(0);
  const masterGain = new Tone.Gain(1);
  const limiter = new Tone.Limiter(-3);

  const chain = new Map<string, Tone.ToneAudioNode>();

  return {
    effects: chain,
    mixer,
    masterGain,
    limiter,
    dryAnalyser,
    processedAnalyser,
    dispose: () => {
      mixer.dispose();
      masterGain.dispose();
      limiter.dispose();
      dryAnalyser.dispose();
      processedAnalyser.dispose();
      chain.forEach((effect) => {
        if (effect && typeof effect.dispose === "function") {
          effect.dispose();
        }
      });
      chain.clear();
    },
  };
}

/**
 * 1. REVERB - Spatial depth/Rooms
 */
export const createReverbEffect = (): GlossaryEffect => {
  return {
    id: "reverb",
    title: "REVERB",
    simpleDefinition: "Spatial depth and room ambience",
    category: "Spatial",
    icon: "Volume2",
    bypassable: true,
    createEffect: () =>
      new Tone.Reverb({
        decay: 3,
        preDelay: 0.005,
      }),
  };
};

/**
 * 2. DELAY - Echoes/Repetitions
 */
export const createDelayEffect = (): GlossaryEffect => {
  return {
    id: "delay",
    title: "DELAY",
    simpleDefinition: "Echoes and repetitions with feedback",
    category: "Temporal",
    icon: "Copy",
    bypassable: true,
    createEffect: () => new Tone.Delay("0.375"),
  };
};

/**
 * 3. COMPRESSION - Dynamic control/Punch
 */
export const createCompressionEffect = (): GlossaryEffect => {
  return {
    id: "compression",
    title: "COMPRESSION",
    simpleDefinition: "Dynamic control and punch",
    category: "Dynamics",
    icon: "Zap",
    bypassable: true,
    createEffect: () =>
      new Tone.Compressor({
        threshold: -20,
        ratio: 4,
        attack: 0.003,
        release: 0.25,
      }),
  };
};

/**
 * 4. SATURATION - Harmonic warmth/Grit
 */
export const createSaturationEffect = (): GlossaryEffect => {
  return {
    id: "saturation",
    title: "SATURATION",
    simpleDefinition: "Harmonic warmth and analog grit",
    category: "Harmonic",
    icon: "Flame",
    bypassable: true,
    createEffect: () =>
      new Tone.Distortion({
        distortion: 0.3,
      }),
  };
};

/**
 * 5. BITCRUSHING - Lo-fi/Digital distortion
 */
export const createBitcrusherEffect = (): GlossaryEffect => {
  return {
    id: "bitcrusher",
    title: "BITCRUSHING",
    simpleDefinition: "Lo-fi and digital distortion",
    category: "Harmonic",
    icon: "Grid3x3",
    bypassable: true,
    createEffect: () => new Tone.BitCrusher(8),
  };
};

/**
 * 6. HIGH-PASS FILTER (HPF) - Removing bass/Mud
 */
export const createHighPassFilterEffect = (): GlossaryEffect => {
  return {
    id: "highpass",
    title: "HIGH-PASS FILTER",
    simpleDefinition: "Remove bass and mud",
    category: "Spectral",
    icon: "TrendingUp",
    bypassable: true,
    createEffect: () =>
      new Tone.Filter({
        frequency: 500,
        type: "highpass",
        rolloff: -24,
      }),
  };
};

/**
 * 7. LOW-PASS FILTER (LPF) - Underwater sound/Muffling
 */
export const createLowPassFilterEffect = (): GlossaryEffect => {
  return {
    id: "lowpass",
    title: "LOW-PASS FILTER",
    simpleDefinition: "Create underwater/muffled sound",
    category: "Spectral",
    icon: "TrendingDown",
    bypassable: true,
    createEffect: () =>
      new Tone.Filter({
        frequency: 1000,
        type: "lowpass",
        rolloff: -24,
      }),
  };
};

/**
 * 8. CHORUS - Thickening/Detuning
 */
export const createChorusEffect = (): GlossaryEffect => {
  return {
    id: "chorus",
    title: "CHORUS",
    simpleDefinition: "Thickening and subtle detuning",
    category: "Modulation",
    icon: "Music",
    bypassable: true,
    createEffect: () =>
      new Tone.Chorus({
        frequency: 1.5,
        delayTime: 2.5,
        depth: 0.7,
      }),
  };
};

/**
 * 9. PHASER - Swirling/Spacey movement
 */
export const createPhaserEffect = (): GlossaryEffect => {
  return {
    id: "phaser",
    title: "PHASER",
    simpleDefinition: "Swirling and spacey movement",
    category: "Modulation",
    icon: "Zap",
    bypassable: true,
    createEffect: () =>
      new Tone.Phaser({
        frequency: 0.5,
        octaves: 3,
        stages: 10,
        Q: 30,
        baseFrequency: 200,
      }),
  };
};

/**
 * 10. PANNING - Stereo placement (Left/Right)
 */
export const createPanningEffect = (): GlossaryEffect => {
  return {
    id: "panning",
    title: "PANNING",
    simpleDefinition: "Stereo placement (Left/Right oscillation)",
    category: "Spatial",
    icon: "PanelsTopLeft",
    bypassable: true,
    createEffect: () => {
      const panner = new Tone.Panner({ pan: 0 });
      const pannerLfo = new Tone.LFO({
        frequency: 0.5,
        type: "sine",
        min: -1,
        max: 1,
      });

      pannerLfo.connect(panner.pan);
      pannerLfo.start();

      return panner;
    },
  };
};

/**
 * 11. LIMITER - Maximum loudness/Ceiling
 */
export const createLimiterEffect = (): GlossaryEffect => {
  return {
    id: "limiter",
    title: "LIMITER",
    simpleDefinition: "Hard ceiling on maximum loudness",
    category: "Dynamics",
    icon: "Shield",
    bypassable: true,
    createEffect: () =>
      new Tone.Limiter({
        threshold: -0.1,
      }),
  };
};

/**
 * 12. FLANGER - Jet plane/Metallic swoosh
 */
export const createFlangerEffect = (): GlossaryEffect => {
  return {
    id: "flanger",
    title: "FLANGER",
    simpleDefinition: "Jet-plane and metallic swoosh effect",
    category: "Modulation",
    icon: "Wind",
    bypassable: true,
    createEffect: () => {
      const flanger = new Tone.Delay("0.005");
      const flangerLfo = new Tone.LFO({
        frequency: 0.5,
        type: "triangle",
        min: 0.001,
        max: 0.01,
      });

      flangerLfo.connect(flanger.delayTime);
      flangerLfo.start();

      return flanger;
    },
  };
};

/**
 * 13. TREMOLO - Volume pulsing/Shaking
 */
export const createTremoloEffect = (): GlossaryEffect => {
  return {
    id: "tremolo",
    title: "TREMOLO",
    simpleDefinition: "Volume pulsing and shaking",
    category: "Modulation",
    icon: "Sliders",
    bypassable: true,
    createEffect: () =>
      new Tone.Tremolo({
        frequency: 5,
        depth: 0.7,
      }),
  };
};

/**
 * 14. STEREO WIDENING - Making it sound 'Big'
 */
export const createStereoWideningEffect = (): GlossaryEffect => {
  return {
    id: "stereowidth",
    title: "STEREO WIDENING",
    simpleDefinition: "Make audio sound 'big'",
    category: "Spatial",
    icon: "Volume",
    bypassable: true,
    createEffect: () => {
      const panner = new Tone.Panner({ pan: 0 });
      const pannerLfo = new Tone.LFO({
        frequency: 0.3,
        type: "sine",
        min: -0.5,
        max: 0.5,
      });

      pannerLfo.connect(panner.pan);
      pannerLfo.start();

      return panner;
    },
  };
};

/**
 * 15. PITCH SHIFTING - Transpose/Changing notes
 */
export const createPitchShiftingEffect = (): GlossaryEffect => {
  return {
    id: "pitchshift",
    title: "PITCH SHIFTING",
    simpleDefinition: "Transpose and change notes",
    category: "Spectral",
    icon: "ArrowUp",
    bypassable: true,
    createEffect: () =>
      new Tone.PitchShift({
        pitch: 12,
      }),
  };
};

/**
 * Get all 15 glossary effects
 */
export function getAllGlossaryEffects(): GlossaryEffect[] {
  return [
    createReverbEffect(),
    createDelayEffect(),
    createCompressionEffect(),
    createSaturationEffect(),
    createBitcrusherEffect(),
    createHighPassFilterEffect(),
    createLowPassFilterEffect(),
    createChorusEffect(),
    createPhaserEffect(),
    createPanningEffect(),
    createLimiterEffect(),
    createFlangerEffect(),
    createTremoloEffect(),
    createStereoWideningEffect(),
    createPitchShiftingEffect(),
  ];
}

/**
 * Apply a single effect to audio
 */
export function applyEffectToPlayer(
  player: Tone.Player,
  effect: Tone.ToneAudioNode,
  destination: Tone.ToneAudioNode,
  bypass: boolean = false
): void {
  if (bypass) {
    player.disconnect();
    player.connect(destination);
  } else {
    player.disconnect();
    player.chain(effect, destination);
  }
}

/**
 * Create a preset chain for demonstration
 */
export function createPresetChain(
  player: Tone.Player,
  effectId: string
): Tone.ToneAudioNode | null {
  const effect = getAllGlossaryEffects().find((e) => e.id === effectId);

  if (!effect) {
    return null;
  }

  return effect.createEffect();
}
