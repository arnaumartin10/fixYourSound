/**
 * Handles loading and managing drum samples from the public folder structure
 * Uses Tone.js Players for high-quality sample-based playback
 * Now supports random sample selection from configurable folder structure
 */

import * as Tone from "tone";

export type DrumGenre = "electronic" | "pop" | "rock" | "latino" | "rap-trap";
export type DrumType = "kick" | "snare" | "closed-hihat" | "open-hihat";

interface SampleCache {
  player: Tone.Sampler | SynthDrumFallback;
  isReady: boolean;
  error?: string;
}

interface DrumKitSampler {
  kick: Tone.Sampler | SynthDrumFallback;
  snare: Tone.Sampler | SynthDrumFallback;
  closedHat: Tone.Sampler | SynthDrumFallback;
  openHat: Tone.Sampler | SynthDrumFallback;
  isReady: boolean;
}

// Cache for loaded samples
const sampleCache = new Map<string, SampleCache>();

/**
 * Resolve the path to a sample based on genre and drum type
 * Fetches available samples from the API and randomly selects one
 * Falls back to electronic kit if primary genre fails
 */
export async function resolveSamplePath(
  genre: DrumGenre,
  drumType: DrumType
): Promise<string> {
  try {
    // Try primary genre first
    const response = await fetch(
      `/api/list-drum-samples?genre=${encodeURIComponent(genre)}&drumType=${encodeURIComponent(drumType)}`
    );

    if (response.ok) {
      const data = await response.json();
      const availableUrls: string[] = data.urls || [];

      if (availableUrls.length > 0) {
        // Randomly select one URL from the available samples
        const randomIndex = Math.floor(Math.random() * availableUrls.length);
        const selectedUrl = availableUrls[randomIndex];

        console.log("Loaded random sample:", selectedUrl);
        return selectedUrl;
      }
    }

    // Fallback to electronic kit if primary genre failed or is empty
    console.warn(`No samples found for ${genre}/${drumType}, trying electronic fallback...`);
    const fallbackResponse = await fetch(
      `/api/list-drum-samples?genre=electronic&drumType=${encodeURIComponent(drumType)}`
    );

    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      const fallbackUrls: string[] = fallbackData.urls || [];

      if (fallbackUrls.length > 0) {
        const randomIndex = Math.floor(Math.random() * fallbackUrls.length);
        const selectedUrl = fallbackUrls[randomIndex];

        console.log("Loaded fallback random sample:", selectedUrl);
        return selectedUrl;
      }
    }

    // If all else fails, return a placeholder that will trigger synth fallback
    console.warn(`No samples found for ${genre}/${drumType} or electronic fallback`);
    return "";
  } catch (error) {
    console.warn("Error resolving sample path:", error);
    return "";
  }
}

/**
 * Create a synthesized drum sound as fallback when samples fail to load
 */
class SynthDrumFallback {
  private synth: Tone.PolySynth;
  private noise: Tone.Noise | null = null;
  private metalSynth: Tone.MetalSynth | null = null;
  private drumType: DrumType;

  constructor(drumType: DrumType, volumeDb: number = 0) {
    this.drumType = drumType;

    // Create poly synth for melodic drums (kick)
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.059 },
    }).toDestination();

    this.synth.volume.value = volumeDb;

    if (drumType === "snare") {
      this.noise = new Tone.Noise("white").toDestination();
      this.noise.volume.value = volumeDb;
    } else if (drumType === "closed-hihat" || drumType === "open-hihat") {
      this.metalSynth = new Tone.MetalSynth({
        envelope: {
          attack: 0.001,
          decay: drumType === "open-hihat" ? 0.3 : 0.08,
          release: 0.01,
        },
        harmonicity: 12,
        resonance: 3000,
      }).toDestination();
      this.metalSynth.volume.value = volumeDb;
    }
  }

  triggerAttackRelease(note: string, duration: string | number, time?: number): void {
    const now = typeof time === "number" ? time : Tone.now();

    if (this.drumType === "kick") {
      // Kick drum: simple attack and release
      this.synth.triggerAttackRelease("C1", duration, now);
    } else if (this.drumType === "snare" && this.noise) {
      // Snare: noise burst
      this.noise.start(now);
      this.noise.stop(now + 0.15);
    } else if (
      (this.drumType === "closed-hihat" || this.drumType === "open-hihat") &&
      this.metalSynth
    ) {
      // Hi-hat: metallic click
      this.metalSynth.triggerAttackRelease(duration, now);
    }
  }

  toDestination(): this {
    return this;
  }

  dispose(): void {
    this.synth.dispose();
    if (this.noise) this.noise.dispose();
    if (this.metalSynth) this.metalSynth.dispose();
  }
}

/**
 * Create a synthesized drum sound as fallback
 */
function createSynthDrum(
  drumType: DrumType,
  volumeDb: number = 0
): SynthDrumFallback {
  return new SynthDrumFallback(drumType, volumeDb);
}

/**
 * Initialize a Sampler for a specific drum type
 * Uses Tone.Sampler for simple one-shot playback with proper re-triggering
 * Note: Ensure Tone.start() is called on user interaction before playback,
 * as beat generation can take >80 seconds and the AudioContext might suspend.
 */
async function initializeSampler(
  genre: DrumGenre,
  drumType: DrumType,
  volumeDb: number = 0
): Promise<Tone.Sampler | SynthDrumFallback> {
  const cacheKey = `${genre}-${drumType}`;

  // Check cache first
  if (sampleCache.has(cacheKey)) {
    const cached = sampleCache.get(cacheKey)!;
    if (cached.isReady) {
      return cached.player;
    }
  }

  // Build the primary path with random sample selection
  const primaryPath = await resolveSamplePath(genre, drumType);

  // If no samples found, skip to synth fallback
  if (!primaryPath) {
    console.warn(`No samples found for ${genre}/${drumType}, using synthesized fallback`);
    const synthSampler = createSynthDrum(drumType, volumeDb);
    sampleCache.set(cacheKey, {
      player: synthSampler as any,
      isReady: true,
      error: "No samples found, using synthesis",
    });
    return synthSampler;
  }

  // Try to create sampler with primary sample
  try {
    // Use Tone.Sampler which is designed for multiple triggers
    const sampler = new Tone.Sampler({
      urls: { C4: primaryPath },
      onload: () => {
        console.log(`✓ Sample loaded for ${genre}/${drumType}: ${primaryPath}`);
      },
    }).toDestination();

    sampler.volume.value = volumeDb;

    // Wait for sampler to load
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout loading ${primaryPath}`));
      }, 8000);

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const isLoaded = (sampler as any).loaded;
        
        if (isLoaded) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          console.log(`✓ Buffer ready for ${genre}/${drumType}`);
          resolve();
        } else if (Date.now() - startTime > 7000) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          console.warn(`⚠ Timeout loading ${genre}/${drumType}, continuing anyway`);
          resolve();
        }
      }, 300);
    });

    sampleCache.set(cacheKey, {
      player: sampler,
      isReady: true,
    });

    console.log(`✓ Loaded ${genre}/${drumType}`);
    return sampler;
  } catch (error) {
    console.warn(`Failed to load ${genre}/${drumType}, trying fallback:`, error);

    // Try fallback: electronic kit
    try {
      const fallbackResponse = await fetch(
        `/api/list-drum-samples?genre=electronic&drumType=${encodeURIComponent(drumType)}`
      );

      if (!fallbackResponse.ok) {
        throw new Error("Fallback endpoint not available");
      }

      const fallbackData = await fallbackResponse.json();
      const fallbackUrls: string[] = fallbackData.urls || [];

      if (fallbackUrls.length === 0) {
        throw new Error("No fallback files available");
      }

      // Randomly select from available fallback samples
      const randomIndex = Math.floor(Math.random() * fallbackUrls.length);
      const fallbackPath = fallbackUrls[randomIndex];

      console.log("Loaded fallback random sample:", fallbackPath);

      const fallbackSampler = new Tone.Sampler({
        urls: { C4: fallbackPath },
      }).toDestination();

      fallbackSampler.volume.value = volumeDb;

      // Wait for fallback sampler to load
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve();
        }, 5000);

        const checkInterval = setInterval(() => {
          const isLoaded = (fallbackSampler as any).loaded;
          
          if (isLoaded) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            console.log(`✓ Fallback buffer ready for ${genre}/${drumType}`);
            resolve();
          }
        }, 300);
      });

      sampleCache.set(cacheKey, {
        player: fallbackSampler,
        isReady: true,
        error: `Using fallback for ${genre}/${drumType}`,
      });

      console.log(`✓ Loaded fallback for ${genre}/${drumType}`);
      return fallbackSampler;
    } catch (fallbackError) {
      console.warn(`Failed fallback for ${genre}/${drumType}:`, fallbackError);
      const synthSampler = createSynthDrum(drumType, volumeDb);

      sampleCache.set(cacheKey, {
        player: synthSampler as any,
        isReady: true,
        error: `Using synthesis: ${String(fallbackError)}`,
      });

      return synthSampler;
    }
  }
}

/**
 * Create a complete drum kit using Players
 */
export async function createDrumKitSampler(
  genre: DrumGenre,
  prompt: string
): Promise<DrumKitSampler> {
  try {
    // AudioContext should already be started by the time this is called (from playBeat)
    // Just verify it's running
    if (Tone.context.state !== "running") {
      console.warn("AudioContext not running, attempting to start...");
      await Tone.start();
    }

    const volumes = {
      kick: -6,
      snare: -8,
      closedHat: -10,
      openHat: -9,
    };

    const [kick, snare, closedHat, openHat] = await Promise.all([
      initializeSampler(genre, "kick", volumes.kick),
      initializeSampler(genre, "snare", volumes.snare),
      initializeSampler(genre, "closed-hihat", volumes.closedHat),
      initializeSampler(genre, "open-hihat", volumes.openHat),
    ]);

    return {
      kick,
      snare,
      closedHat,
      openHat,
      isReady: true,
    };
  } catch (error) {
    console.error("Failed to create drum kit sampler:", error);
    throw error;
  }
}

/**
 * Clear the sample cache
 */
export function clearSampleCache(): void {
  sampleCache.forEach(({ player }) => {
    if (player instanceof Tone.Player) {
      player.dispose();
    } else if (player instanceof SynthDrumFallback) {
      player.dispose();
    }
  });
  sampleCache.clear();
}

/**
 * Trigger a drum sample with proper timing
 */
/**
 * Trigger a drum sample with proper timing
 * Uses Sampler's triggerAttackRelease for clean triggering
 */
export function triggerDrumSample(
  player: any,
  time: number,
  duration: string = "8n"
): void {
  if (!player) {
    console.warn("triggerDrumSample: player is null or undefined");
    return;
  }

  try {
    // Check if it's a SynthDrumFallback
    if (player instanceof SynthDrumFallback) {
      player.triggerAttackRelease("C4", duration, time);
      console.debug(`▶ Playing synth drum at ${time}`);
      return;
    }

    // For Tone.Samplers, use triggerAttackRelease
    if (player instanceof Tone.Sampler) {
      try {
        player.triggerAttackRelease("C4", duration, time);
        console.debug(`▶ Playing drum sample at ${time}`);
      } catch (err) {
        console.warn("Error triggering drum sample:", err);
      }
    }
  } catch (error) {
    console.warn("Error in triggerDrumSample:", error);
  }
}

/**
 * Get loading progress for samples
 */
export function getSamplesLoadingProgress(kitSampler: Partial<DrumKitSampler>): number {
  const drums = ["kick", "snare", "closedHat", "openHat"] as const;
  const readyCount = drums.filter((drum) => {
    const player = kitSampler[drum];
    return player !== undefined;
  }).length;

  return Math.round((readyCount / 4) * 100);
}
