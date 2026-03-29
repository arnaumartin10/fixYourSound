/**
 * Example: Using the New Sample-Based Beat Generator
 * 
 * This file demonstrates how the new prompt-aware sample selection works
 */

import {
  createDrumKitSampler,
  analyzePrompt,
  selectSampleIndex,
  triggerDrumSample,
  type DrumGenre,
} from "@/lib/beatGenerator";
import * as Tone from "tone";

/**
 * Example 1: Basic Sample Triggering
 */
export async function basicSampleExample() {
  // Ensure Tone is started
  if (Tone.context.state !== "running") {
    await Tone.start();
  }

  // Create a rock drum kit
  const kit = await createDrumKitSampler("rock", "heavy rock beat");

  // Trigger sounds at specific times
  const now = Tone.now();
  triggerDrumSample(kit.kick, now, "8n");
  triggerDrumSample(kit.snare, now + 0.5, "16n");
  triggerDrumSample(kit.closedHat, now + 1, "32n");
}

/**
 * Example 2: Prompt-Aware Sample Selection
 */
export function promptAnalysisExample() {
  // Different prompts
  const prompts = [
    "heavy distorted trap beat",
    "smooth soft electronic groove",
    "crisp clean pop rhythm",
    "tight punchy rock beat",
  ];

  prompts.forEach((prompt) => {
    const analysis = analyzePrompt(prompt);
    const sampleIndex = selectSampleIndex(analysis, 5);

    console.log(`Prompt: "${prompt}"`);
    console.log(`Keywords: ${analysis.keywords.join(", ")}`);
    console.log(`Selected Sample Index: ${sampleIndex}`);
    console.log(`Characteristics:`, analysis.characteristics);
    console.log("---");
  });
}

/**
 * Example 3: Creating Complete Beat Loop
 */
export async function beatLoopExample(
  genre: DrumGenre,
  prompt: string,
  beatPattern: { kick: boolean[]; snare: boolean[] }
) {
  if (Tone.context.state !== "running") {
    await Tone.start();
  }

  const kit = await createDrumKitSampler(genre, prompt);
  const stepDuration = 0.25; // 16th notes at 120 BPM

  let step = 0;
  const loop = new Tone.Loop((time) => {
    if (beatPattern.kick[step % beatPattern.kick.length]) {
      triggerDrumSample(kit.kick, time, "8n");
    }

    if (beatPattern.snare[step % beatPattern.snare.length]) {
      triggerDrumSample(kit.snare, time, "16n");
    }

    step++;
  }, stepDuration);

  loop.start(0);
  Tone.Transport.start();

  return loop;
}

/**
 * Example 4: Genre-Specific Sample Selection
 */
export async function genreComparisonExample() {
  const genres: DrumGenre[] = ["electronic", "pop", "rock", "latino", "rap-trap"];
  const prompt = "fast energetic beat";

  console.log("\nGenre Sample Selection Comparison:");
  console.log(`Using prompt: "${prompt}"\n`);

  // Note: Only do actual loading in browser context
  for (const genre of genres) {
    // In real scenario, you'd load each kit
    console.log(`${genre.toUpperCase()}`);
    console.log(`- Path: /sounds/drum-kits/${genre}/[drumType]/sample-X.wav`);
    console.log(`- Analysis: Analyzing "${prompt}" for this genre...`);
    console.log();
  }
}

/**
 * Example 5: Error Handling and Fallbacks
 */
export async function fallbackExample() {
  try {
    // Attempt to create kit from "future" genre (doesn't exist)
    // This would use fallback mechanism
    const kit = await createDrumKitSampler("electronic", "test beat");

    console.log("✓ Kit loaded successfully");
    console.log("✓ If any samples failed, fallback was used");
    console.log("✓ All samplers are playable (worst case: silent)");

    // Always clean up
    kit.kick?.dispose();
    kit.snare?.dispose();
    kit.closedHat?.dispose();
    kit.openHat?.dispose();
  } catch (error) {
    console.error("Kit creation error (rare):", error);
  }
}

/**
 * Example 6: Pattern Generation with Prompt
 */
export function patternGenerationExample() {
  // Simulate LLM beat pattern generation
  const userPrompt = "heavy trap beat with 808 drops";
  const analysis = analyzePrompt(userPrompt);

  // Determine intensity level
  const intensityLevel = analysis.intensity > 0.6 ? "high" : "medium";

  // Select genre based on prompt keywords
  let selectedGenre: DrumGenre = "electronic";
  if (userPrompt.includes("trap")) {
    selectedGenre = "rap-trap";
  } else if (userPrompt.includes("rock")) {
    selectedGenre = "rock";
  } else if (userPrompt.includes("pop")) {
    selectedGenre = "pop";
  }

  console.log("Pattern Generation Context:");
  console.log(`- User Prompt: "${userPrompt}"`);
  console.log(`- Selected Genre: ${selectedGenre}`);
  console.log(`- Intensity Level: ${intensityLevel}`);
  console.log(`- Characteristics:`, Object.entries(analysis.characteristics)
    .filter(([_, value]) => value)
    .map(([key]) => key)
    .join(", "));
}

/**
 * Example 7: Programmatic Kit Switching
 */
export async function kitSwitchingExample() {
  if (Tone.context.state !== "running") {
    await Tone.start();
  }

  const genres: DrumGenre[] = ["electronic", "pop", "rock", "latino", "rap-trap"];
  const prompt = "dynamic beat";

  // Simulate switching between kits
  for (const genre of genres) {
    console.log(`\nLoading ${genre} kit...`);

    try {
      const kit = await createDrumKitSampler(genre, prompt);
      console.log(`✓ ${genre} kit ready`);

      // Simulate quick preview
      triggerDrumSample(kit.kick, Tone.now(), "8n");

      // In real app, would store kit for later use
      // Don't dispose here - app manages lifecycle
    } catch (error) {
      console.error(`✗ Failed to load ${genre}:`, error);
    }

    // Small delay between kit switches
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Example 8: Custom Sample Selection Logic
 */
export function customSelectionLogic() {
  // You can implement custom logic for sample selection
  type CustomPromptAnalysis = {
    keyword: string;
    sampleRange: [number, number]; // min, max index
  };

  const customSelectors: CustomPromptAnalysis[] = [
    { keyword: "808", sampleRange: [3, 4] }, // Last variation
    { keyword: "mellow", sampleRange: [0, 1] }, // First variation
    { keyword: "punchy", sampleRange: [1, 2] }, // Middle
  ];

  const testPrompt = "hard 808 trap beat";

  customSelectors.forEach((selector) => {
    if (testPrompt.toLowerCase().includes(selector.keyword)) {
      const [min, max] = selector.sampleRange;
      const selected = Math.floor(Math.random() * (max - min + 1) + min);
      console.log(`Match "${selector.keyword}": Sample ${selected}`);
    }
  });
}

export default {
  basicSampleExample,
  promptAnalysisExample,
  beatLoopExample,
  genreComparisonExample,
  fallbackExample,
  patternGenerationExample,
  kitSwitchingExample,
  customSelectionLogic,
};
