/**
 * Analyzes user prompts to determine sample characteristics and keyword matching
 */

interface PromptAnalysisResult {
  keywords: string[];
  intensity: number;
  characteristics: {
    heavy: boolean;
    distorted: boolean;
    hard: boolean;
    soft: boolean;
    punchy: boolean;
    smooth: boolean;
    crisp: boolean;
    tight: boolean;
    loose: boolean;
  };
}

// Keywords that influence sample selection
const CHARACTERISTIC_KEYWORDS = {
  heavy: ["heavy", "thick", "powerful", "deep", "dense", "fat"],
  distorted: ["distorted", "gritty", "dirty", "grimy", "raw", "harsh"],
  hard: ["hard", "knockout", "bang", "crack", "sharp", "aggressive"],
  soft: ["soft", "smooth", "gentle", "warm", "mellow", "subtle"],
  punchy: ["punchy", "snappy", "tight", "quick", "percussive", "bright"],
  smooth: ["smooth", "flowing", "gliding", "creamy"],
  crisp: ["crisp", "clear", "clean", "bright", "articulate"],
  tight: ["tight", "locked", "strict", "rigid"],
  loose: ["loose", "swing", "groove", "relaxed", "laid-back"],
};

/**
 * Analyze the user's prompt to extract keywords and determine characteristics
 */
export function analyzePrompt(prompt: string): PromptAnalysisResult {
  const lowerPrompt = prompt.toLowerCase();
  const words = lowerPrompt.split(/\s+/);
  const keywords: string[] = [];
  const characteristics: PromptAnalysisResult["characteristics"] = {
    heavy: false,
    distorted: false,
    hard: false,
    soft: false,
    punchy: false,
    smooth: false,
    crisp: false,
    tight: false,
    loose: false,
  };

  // Extract keywords and match characteristics
  Object.entries(CHARACTERISTIC_KEYWORDS).forEach(([char, keywordList]) => {
    if (keywordList.some((kw) => lowerPrompt.includes(kw))) {
      characteristics[char as keyof typeof characteristics] = true;
      keywords.push(...keywordList.filter((kw) => lowerPrompt.includes(kw)));
    }
  });

  // Calculate intensity based on descriptive level
  let intensity = 0.5; // Default middle intensity
  if (characteristics.heavy || characteristics.hard) intensity += 0.2;
  if (characteristics.soft || characteristics.smooth) intensity -= 0.2;
  if (characteristics.punchy) intensity += 0.1;
  if (characteristics.loose) intensity -= 0.1;

  // Clamp between 0 and 1
  intensity = Math.max(0, Math.min(1, intensity));

  return {
    keywords: Array.from(new Set(keywords)),
    intensity,
    characteristics,
  };
}

/**
 * Get a weight/priority score for sample selection based on analyzed characteristics
 * Used to select which sample variation to prioritize
 */
export function getSampleWeighting(
  analysis: PromptAnalysisResult,
  sampleIndex: number,
  totalSamples: number
): number {
  let weight = 0.5; // Default neutral weight

  // Prefer harder/more aggressive samples if these characteristics are present
  if (analysis.characteristics.heavy || analysis.characteristics.hard || analysis.characteristics.distorted) {
    // Prefer samples that might be numbered higher (typically variations go from low to high aggression)
    weight += (sampleIndex / totalSamples) * 0.3;
  }

  // Prefer softer/smoother samples if those characteristics are present
  if (analysis.characteristics.soft || analysis.characteristics.smooth) {
    // Prefer lower-numbered samples (typically less aggressive)
    weight += ((totalSamples - sampleIndex) / totalSamples) * 0.3;
  }

  // Prefer crisp/punchy samples
  if (analysis.characteristics.crisp || analysis.characteristics.punchy) {
    weight += 0.2;
  }

  return Math.max(0, Math.min(1, weight));
}

/**
 * Suggest sample selection index based on prompt analysis and available samples
 */
export function selectSampleIndex(
  analysis: PromptAnalysisResult,
  totalSamples: number
): number {
  if (totalSamples === 0) return 0;
  if (totalSamples === 1) return 0;

  // Calculate weighted selection
  let selectedIndex = Math.floor(analysis.intensity * (totalSamples - 1));

  // Apply fine-tuning based on specific characteristics
  if (analysis.characteristics.hard || analysis.characteristics.distorted) {
    selectedIndex = Math.min(totalSamples - 1, selectedIndex + 1);
  } else if (analysis.characteristics.soft) {
    selectedIndex = Math.max(0, selectedIndex - 1);
  }

  return selectedIndex;
}
