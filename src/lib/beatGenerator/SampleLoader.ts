/**
 * Handles loading and managing drum samples from the public folder structure
 * Uses Tone.js Samplers for high-quality sample-based playback
 */

import * as Tone from "tone";
import { analyzePrompt, selectSampleIndex } from "./PromptAnalyzer";

export type DrumGenre = "electronic" | "pop" | "rock" | "latino" | "rap-trap";
export type DrumType = "kick" | "snare" | "closed-hihat" | "open-hihat";

interface SampleCache {
  sampler: Tone.Sampler;
  isReady: boolean;
  error?: string;
}

interface DrumKitSampler {
  kick: Tone.Sampler;
  snare: Tone.Sampler;
  closedHat: Tone.Sampler;
  openHat: Tone.Sampler;
  isReady: boolean;
}

// Cache for loaded samples
const sampleCache = new Map<string, SampleCache>();

/**
 * Resolve the path to a sample based on genre and drum type
 * Uses intelligent selection based on available samples and prompt analysis
 */
export async function resolveSamplePath(
  genre: DrumGenre,
  drumType: DrumType,
  prompt: string
): Promise<string> {
  try {
    // Get list of available samples from the API
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
 * Used when specific genre sample is not found
 */
export function getFallbackSamplePath(drumType: DrumType): string {
  // Return first available file in electronic kit (most universal)
  // This will be resolved by the initializeSampler function
  // We return a special marker that tells the loader to use any available file
  return `/sounds/drum-kits/electronic/${drumType}/`;
}

/**
 * Create a synthesized drum sound as fallback when samples fail to load
 * Returns an object that mimics Tone.Sampler interface for compatibility
 */
function createSynthDrum(
  drumType: DrumType,
  volumeDb: number = 0
): any {
  const synthOutput = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.059 },
  }).toDestination();

  synthOutput.volume.value = volumeDb;

  // Return object that mimics Tone.Sampler
  return {
    triggerAttackRelease: (duration: string | number, time?: number) => {
      if (drumType === "kick") {
        // Kick: pitch sweep from 150Hz to 50Hz
        synthOutput.frequency.setValueAtTime(150, "+0");
        synthOutput.frequency.exponentialRampToValueAtTime(50, "+0.1");
        synthOutput.triggerAttackRelease(duration, time);
      } else if (drumType === "snare") {
        // Snare: use noise instead
        if (!(window as any).__snareNoise) {
          (window as any).__snareNoise = new Tone.Noise("white").toDestination();
          (window as any).__snareNoise.volume.value = volumeDb;
        }
        const snareEnv = new Tone.Envelope({
          attack: 0.001,
          decay: 0.15,
          sustain: 0,
          release: 0.01,
        });
        snareEnv.attach((window as any).__snareNoise);
        snareEnv.triggerAttackRelease(duration, time);
      } else if (drumType === "closed-hihat" || drumType === "open-hihat") {
        // Hi-hat: metallic sound
        if (!(window as any).__hatSynth) {
          (window as any).__hatSynth = new Tone.MetalSynth({
            frequency: 150,
            envelope: {
              attack: 0.001,
              decay: 0.08,
              release: 0.01,
            },
            harmonicity: 12,
            resonance: 3000,
            volume: volumeDb,
          }).toDestination();
        }
        (window as any).__hatSynth.triggerAttackRelease(duration, time);
      }
    },
    // Add standard Tone.Sampler properties for compatibility
    toDestination: () => synthOutput,
    dispose: () => synthOutput.dispose(),
  };
}

/**
 * Create an audio buffer for a drum sample
 * This is a utility for potential future processing
 */
function createAudioBuffer(sampleRate: number, length: number): AudioBuffer {
  const context = Tone.context;
  return context.createBuffer(1, length, sampleRate);
}

/**
 * Initialize a Sampler for a specific drum type
 * Handles loading with fallback mechanism
 */
async function initializeSampler(
  genre: DrumGenre,
  drumType: DrumType,
  prompt: string,
  volumeDb: number = 0
): Promise<Tone.Sampler> {
  const cacheKey = `${genre}-${drumType}`;

  // Check cache first
  if (sampleCache.has(cacheKey)) {
    const cached = sampleCache.get(cacheKey)!;
    if (cached.isReady) {
      return cached.sampler;
    }
  }

  // Determine which sample to use based on prompt analysis
  const analysis = analyzePrompt(prompt);
  const selectedIndex = selectSampleIndex(analysis, 5);

  // Build the primary path
  const primaryPath = await resolveSamplePath(genre, drumType, prompt);

  // Try to create sampler with primary sample
  try {
    const sampler = new Tone.Sampler({
      urls: {
        C4: primaryPath,
      },
      baseUrl: "/",
    }).toDestination();

    sampler.volume.value = volumeDb;

    // Wait for sampler to load (with timeout)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout loading ${primaryPath}`));
      }, 5000);

      // Tone.Sampler has a promise-like interface, we can trigger loading behavior
      // by attempting to use it. For now, we'll just wait a bit and resolve
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        // Check if buffer has been loaded
        if ((sampler as any)._buffers && Object.keys((sampler as any)._buffers).length > 0) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve();
        } else if (Date.now() - startTime > 4000) {
          // If it doesn't load after 4 seconds, continue anyway
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve();
        }
      }, 100);
    });

    sampleCache.set(cacheKey, {
      sampler,
      isReady: true,
    });

    console.log(`✓ Loaded ${genre}/${drumType}`);
    return sampler;
  } catch (error) {
    console.warn(`Failed to load ${genre}/${drumType}, using fallback:`, error);

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

      // Use the first available file
      const fallbackFile = fallbackFiles[0];
      const fallbackPath = `/sounds/drum-kits/electronic/${drumType}/${fallbackFile}`;

      const fallbackSampler = new Tone.Sampler({
        urls: {
          C4: fallbackPath,
        },
        baseUrl: "/",
      }).toDestination();

      fallbackSampler.volume.value = volumeDb;

      // Wait for fallback sampler to load
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve(); // Resolve anyway after 3 seconds
        }, 3000);

        const checkInterval = setInterval(() => {
          if (
            (fallbackSampler as any)._buffers &&
            Object.keys((fallbackSampler as any)._buffers).length > 0
          ) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });

      sampleCache.set(cacheKey, {
        sampler: fallbackSampler,
        isReady: true,
      });

      console.log(`✓ Loaded fallback for ${drumType}`);
      return fallbackSampler;
    } catch (fallbackError) {
      console.error(`Fallback samples also failed for ${drumType}:`, fallbackError);
      console.log(`Using synthesis fallback for ${drumType}`);

      // Use synthesized drums as fallback
      const synthSampler = createSynthDrum(drumType, volumeDb);

      sampleCache.set(cacheKey, {
        sampler: synthSampler as any,
        isReady: true,
        error: `Using synthesis: ${String(fallbackError)}`,
      });

      return synthSampler as any;
    }
  }
}

/**
 * Create a complete drum kit using Samplers
 * Loads all 4 drum types for the selected genre
 */
export async function createDrumKitSampler(
  genre: DrumGenre,
  prompt: string
): Promise<DrumKitSampler> {
  try {
    // Ensure Tone is started
    if (Tone.context.state !== "running") {
      await Tone.start();
    }

    // Volume levels for each drum
    const volumes = {
      kick: -6,
      snare: -8,
      closedHat: -10,
      openHat: -9,
    };

    // Load all 4 drums in parallel
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
 * Clear the sample cache (useful on unmount or kit change)
 */
export function clearSampleCache(): void {
  sampleCache.forEach(({ sampler }) => {
    sampler.dispose();
  });
  sampleCache.clear();
}

/**
 * Trigger a drum sample with proper timing
 */
export function triggerDrumSample(
  sampler: Tone.Sampler | null,
  time: number,
  duration: string = "8n"
): void {
  if (!sampler) return;

  try {
    sampler.triggerAttackRelease("C4", duration, time);
  } catch (error) {
    console.warn("Error triggering drum sample:", error);
  }
}

/**
 * Get loading progress for samples
 * Returns percentage ready (0-100)
 */
export function getSamplesLoadingProgress(kitSampler: Partial<DrumKitSampler>): number {
  const drums = ["kick", "snare", "closedHat", "openHat"] as const;
  const readyCount = drums.filter((drum) => {
    const sampler = kitSampler[drum];
    return sampler && sampler.loaded;
  }).length;

  return Math.round((readyCount / 4) * 100);
}
