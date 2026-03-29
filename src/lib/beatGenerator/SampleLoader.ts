/**
 * Handles loading and managing drum samples from the public folder structure
 * Uses Tone.js Players for high-quality sample-based playback
 */

import * as Tone from "tone";
import { analyzePrompt, selectSampleIndex } from "./PromptAnalyzer";

export type DrumGenre = "electronic" | "pop" | "rock" | "latino" | "rap-trap";
export type DrumType = "kick" | "snare" | "closed-hihat" | "open-hihat";

interface SampleCache {
  player: Tone.Player | SynthDrumFallback;
  isReady: boolean;
  error?: string;
}

interface DrumKitSampler {
  kick: Tone.Player | SynthDrumFallback;
  snare: Tone.Player | SynthDrumFallback;
  closedHat: Tone.Player | SynthDrumFallback;
  openHat: Tone.Player | SynthDrumFallback;
  isReady: boolean;
}

// Cache for loaded samples
const sampleCache = new Map<string, SampleCache>();

/**
 * Resolve the path to a sample based on genre and drum type
 */
export async function resolveSamplePath(
  genre: DrumGenre,
  drumType: DrumType,
  prompt: string
): Promise<string> {
  try {
    const response = await fetch(
      `/api/list-drum-samples?genre=${encodeURIComponent(genre)}&drumType=${encodeURIComponent(drumType)}`
    );

    if (!response.ok) {
      console.warn(`No samples found for ${genre}/${drumType}`);
      return getFallbackSamplePath(drumType);
    }

    const data = await response.json();
    const availableFiles: string[] = data.files || [];

    if (availableFiles.length === 0) {
      console.warn(`Empty directory: ${genre}/${drumType}`);
      return getFallbackSamplePath(drumType);
    }

    // Analyze prompt to select appropriate sample
    const analysis = analyzePrompt(prompt);
    const selectedIndex = selectSampleIndex(analysis, availableFiles.length);

    // Get the selected file
    const selectedFile = availableFiles[selectedIndex];
    const basePath = `/sounds/drum-kits/${data.genre}/${drumType}`;

    return `${basePath}/${selectedFile}`;
  } catch (error) {
    console.warn("Error resolving sample path:", error);
    return getFallbackSamplePath(drumType);
  }
}

/**
 * Get fallback sample path for a drum type
 */
export function getFallbackSamplePath(drumType: DrumType): string {
  return `/sounds/drum-kits/electronic/${drumType}/`;
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
 * Initialize a Player for a specific drum type
 * Uses Tone.Player for simple one-shot playback
 */
async function initializeSampler(
  genre: DrumGenre,
  drumType: DrumType,
  prompt: string,
  volumeDb: number = 0
): Promise<Tone.Player | SynthDrumFallback> {
  const cacheKey = `${genre}-${drumType}`;

  // Check cache first
  if (sampleCache.has(cacheKey)) {
    const cached = sampleCache.get(cacheKey)!;
    if (cached.isReady) {
      return cached.player;
    }
  }

  // Build the primary path
  const primaryPath = await resolveSamplePath(genre, drumType, prompt);

  // Try to create player with primary sample
  try {
    const player = new Tone.Player({
      url: primaryPath,
      onload: () => {
        console.log(`✓ Sample loaded for ${genre}/${drumType}: ${primaryPath}`);
      },
    }).toDestination();

    player.volume.value = volumeDb;

    // Wait for player to load
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout loading ${primaryPath}`));
      }, 8000);

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const isLoaded = (player as any).loaded;
        
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
      player,
      isReady: true,
    });

    console.log(`✓ Loaded ${genre}/${drumType}`);
    return player;
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
      const fallbackFiles: string[] = fallbackData.files || [];

      if (fallbackFiles.length === 0) {
        throw new Error("No fallback files available");
      }

      const fallbackFile = fallbackFiles[0];
      const fallbackPath = `/sounds/drum-kits/electronic/${drumType}/${fallbackFile}`;

      const fallbackPlayer = new Tone.Player({
        url: fallbackPath,
      }).toDestination();

      fallbackPlayer.volume.value = volumeDb;

      // Wait for fallback player to load
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve();
        }, 5000);

        const checkInterval = setInterval(() => {
          const isLoaded = (fallbackPlayer as any).loaded;
          
          if (isLoaded) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        }, 300);
      });

      sampleCache.set(cacheKey, {
        player: fallbackPlayer,
        isReady: true,
      });

      console.log(`✓ Loaded fallback for ${drumType}`);
      return fallbackPlayer;
    } catch (fallbackError) {
      console.error(`Fallback also failed for ${drumType}:`, fallbackError);
      console.log(`Using synthesis fallback for ${drumType}`);

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
      initializeSampler(genre, "kick", prompt, volumes.kick),
      initializeSampler(genre, "snare", prompt, volumes.snare),
      initializeSampler(genre, "closed-hihat", prompt, volumes.closedHat),
      initializeSampler(genre, "open-hihat", prompt, volumes.openHat),
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
 * Clones the player each time to allow repeated playback
 */
export function triggerDrumSample(
  player: any,
  time: number,
  duration: string = "8n"
): void {
  if (!player) return;

  try {
    // Check if it's a SynthDrumFallback
    if (player instanceof SynthDrumFallback) {
      player.triggerAttackRelease("C4", duration, time);
      return;
    }

    // For Tone.Players, clone and trigger each time
    if (player instanceof Tone.Player) {
      try {
        // Clone the player so we can play it again
        const clone = player.clone();
        
        // Schedule the clone to play at the specified time
        clone.start(time);
        
        // Clean up after playback completes
        const durationSecs = Tone.Time(duration).toSeconds();
        Tone.Transport.scheduleOnce(() => {
          clone.dispose();
        }, `+${durationSecs}`, time);
        
        console.debug(`▶ Playing drum sample at ${time}`);
      } catch (err) {
        console.debug("Error cloning/triggering drum sample:", err);
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
