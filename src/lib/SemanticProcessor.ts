import type { SemanticTerm, SpectrumPoint } from "@/types/audio";

export interface DspState {
  lowShelf: { frequency: number; gain: number; q: number };
  highShelf: { frequency: number; gain: number; q: number };
  peaking1: { frequency: number; gain: number; q: number };
  peaking2: { frequency: number; gain: number; q: number };
  peaking3: { frequency: number; gain: number; q: number };
  boxyNotch: { frequency: number; gain: number; q: number };
  lowPass: { frequency: number; q: number };
  highPass: { frequency: number; q: number };
  saturation: { amount: number; order: number };
  compressor: { threshold: number; ratio: number; attack: number; release: number };
  bitcrusher: { bits: number; wet: number };
  reverb: { wet: number };
}

export interface LlmDspParams {
  lowpass: number;
  highpass: number;
  distortion: number;
  bitrate: number;
  reverbWet: number;
  compressionThreshold: number;
  explanation: string;
}

export const BASE_DSP_STATE: DspState = {
  lowShelf: { frequency: 120, gain: 0, q: 0.7 },
  highShelf: { frequency: 9000, gain: 0, q: 0.7 },
  peaking1: { frequency: 250, gain: 0, q: 0.7 },
  peaking2: { frequency: 3800, gain: 0, q: 1.1 },
  peaking3: { frequency: 4800, gain: 0, q: 1.1 },
  boxyNotch: { frequency: 500, gain: 0, q: 4.2 },
  lowPass: { frequency: 20000, q: 1 },
  highPass: { frequency: 20, q: 1 },
  saturation: { amount: 0, order: 1 },
  compressor: { threshold: -18, ratio: 1, attack: 0.008, release: 0.09 },
  bitcrusher: { bits: 8, wet: 0 },
  reverb: { wet: 0 },
};

const TERM_LIST: SemanticTerm[] = [
  "warm",
  "vintage",
  "airy",
  "crispy",
  "defined",
  "punch",
  "presence",
  "remove boxy",
  "dark",
  "telephone",
  "radio",
  "lo-fi",
  "digital lo-fi",
];

export class SemanticProcessor {
  static suggest(query: string): SemanticTerm[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return TERM_LIST;
    }

    return TERM_LIST.filter((term) => term.includes(normalized));
  }

  static parse(input: string): SemanticTerm[] {
    const normalized = input.toLowerCase();
    const terms = new Set<SemanticTerm>();

    if (normalized.includes("warm")) terms.add("warm");
    if (normalized.includes("vintage")) terms.add("vintage");
    if (normalized.includes("airy")) terms.add("airy");
    if (normalized.includes("crispy")) terms.add("crispy");
    if (normalized.includes("defined")) terms.add("defined");
    if (normalized.includes("punch")) terms.add("punch");
    if (normalized.includes("presence")) terms.add("presence");
    if (
      normalized.includes("remove boxy") ||
      (normalized.includes("remove") && normalized.includes("boxy"))
    ) {
      terms.add("remove boxy");
    }
    if (normalized.includes("dark")) terms.add("dark");
    if (normalized.includes("telephone")) terms.add("telephone");
    if (normalized.includes("radio")) terms.add("radio");
    if (normalized.includes("lofi") || normalized.includes("lo-fi")) terms.add("lo-fi");
    if (
      normalized.includes("digital lo-fi") ||
      normalized.includes("digital lofi") ||
      (normalized.includes("digital") && (normalized.includes("lo-fi") || normalized.includes("lofi")))
    ) {
      terms.add("digital lo-fi");
    }

    return [...terms];
  }

  static apply(terms: SemanticTerm[]): DspState {
    const next: DspState = structuredClone(BASE_DSP_STATE);

    for (const term of terms) {
      switch (term) {
        case "warm":
          // Warm: +3dB @250Hz, 2nd harmonic saturation, -2dB shelf @6kHz
          next.peaking1 = { frequency: 250, gain: 3, q: 0.7 };
          next.saturation = { amount: 0.35, order: 2 };
          next.highShelf = { frequency: 6000, gain: -2, q: 0.7 };
          break;
        case "vintage":
          next.highPass = { frequency: 90, q: 1 };
          next.lowPass = { frequency: 9500, q: 0.9 };
          next.saturation = { amount: 0.45, order: 3 };
          next.compressor = { threshold: -21, ratio: 1.8, attack: 0.006, release: 0.12 };
          break;
        case "airy":
          // Airy: +6dB @12kHz high shelf, gentle slope
          next.highShelf = { frequency: 12000, gain: 6, q: 0.45 };
          break;
        case "crispy":
        case "defined":
          // Crispy/Defined: 3kHz-5kHz boosts + slight compression
          next.peaking2 = { frequency: 3400, gain: 2.5, q: 1 };
          next.peaking3 = { frequency: 4800, gain: 2.5, q: 1 };
          next.compressor = { threshold: -24, ratio: 1.6, attack: 0.004, release: 0.08 };
          break;
        case "punch":
          next.compressor = { threshold: -26, ratio: 2.4, attack: 0.003, release: 0.06 };
          next.peaking1 = { frequency: 120, gain: 2, q: 0.8 };
          break;
        case "presence":
          next.peaking2 = { frequency: 2600, gain: 3.2, q: 1 };
          next.peaking3 = { frequency: 4200, gain: 2.2, q: 1.1 };
          break;
        case "remove boxy":
          // Remove Boxy: notch 500Hz by -6dB
          next.boxyNotch = { frequency: 500, gain: -6, q: 4.2 };
          break;
        case "dark":
          // Dark: steep low-pass around 2kHz
          next.lowPass = { frequency: 2000, q: 1.2 };
          break;
        case "telephone":
          // Telephone: band-pass (300Hz-3.4kHz) + 4-bit crusher
          next.highPass = { frequency: 300, q: 1 };
          next.lowPass = { frequency: 3400, q: 1 };
          next.bitcrusher = { bits: 4, wet: 1 };
          break;
        case "radio":
          next.highPass = { frequency: 250, q: 1.1 };
          next.lowPass = { frequency: 3600, q: 1.1 };
          next.compressor = { threshold: -28, ratio: 2.6, attack: 0.004, release: 0.07 };
          break;
        case "lo-fi":
          next.highPass = { frequency: 120, q: 1 };
          next.lowPass = { frequency: 6500, q: 0.9 };
          next.saturation = { amount: 0.4, order: 2 };
          break;
        case "digital lo-fi":
          next.bitcrusher = { bits: 5, wet: 1 };
          next.lowPass = { frequency: 5200, q: 1 };
          break;
      }
    }

    return next;
  }

  static async applyFromPrompt(prompt: string): Promise<LlmDspParams> {
    console.log("Sending prompt to API:", prompt);
    const response = await fetch("/api/interpret-vibe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      return {
        lowpass: 20000,
        highpass: 20,
        distortion: 0,
        bitrate: 16,
        reverbWet: 0,
        compressionThreshold: -18,
        explanation: "API request failed, reset to default.",
      };
    }

    const payload = (await response.json()) as LlmDspParams;
    console.log("Received JSON from API:", payload);
    return payload;
  }

  static toDspState(payload: LlmDspParams): DspState {
    const next: DspState = structuredClone(BASE_DSP_STATE);
    next.lowPass = { frequency: payload.lowpass, q: 1 };
    next.highPass = { frequency: payload.highpass, q: 1 };
    next.saturation = { amount: payload.distortion, order: 2 };
    next.bitcrusher = { bits: payload.bitrate, wet: payload.bitrate < 16 ? 1 : 0 };
    next.compressor = {
      threshold: payload.compressionThreshold,
      ratio: 2.2,
      attack: 0.006,
      release: 0.08,
    };
    next.reverb = { wet: payload.reverbWet };
    return next;
  }

  static eqOverlayPoints(state: DspState): SpectrumPoint[] {
    return [
      { freqHz: state.peaking1.frequency, gainDb: state.peaking1.gain },
      { freqHz: state.boxyNotch.frequency, gainDb: state.boxyNotch.gain },
      { freqHz: state.peaking2.frequency, gainDb: state.peaking2.gain },
      { freqHz: state.peaking3.frequency, gainDb: state.peaking3.gain },
      { freqHz: state.highShelf.frequency, gainDb: state.highShelf.gain },
    ];
  }
}
