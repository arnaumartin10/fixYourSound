/**
 * Beat Generator Audio Engine - Public API
 * 
 * This module provides the core functionality for sample-based drum playback
 * with intelligent prompt-aware sample selection.
 */

export {
  createDrumKitSampler,
  clearSampleCache,
  triggerDrumSample,
  getSamplesLoadingProgress,
  resolveSamplePath,
  getFallbackSamplePath,
  type DrumGenre,
  type DrumType,
} from "./SampleLoader";

export {
  analyzePrompt,
  selectSampleIndex,
  getSampleWeighting,
  type PromptAnalysisResult,
} from "./PromptAnalyzer";
