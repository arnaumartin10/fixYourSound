import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── SYNTH MODE ───────────────────────────────────────────────────────────────

const SYNTH_SYSTEM_PROMPT = `You are a professional Synthesizer Sound Designer. Translate the user's sound description into a JSON object for Tone.js synth parameters.

Required keys (ALL are required):
- oscillator: type ("sine" | "square" | "sawtooth" | "triangle")
- subOscillator: boolean (whether to add a sub-octave sine wave)
- subOctave: number (-24 to -1, semitones below root, typically -12 for one octave)
- attack: number (0.001 to 2, seconds)
- decay: number (0.001 to 2, seconds)
- sustain: number (0 to 1, level)
- release: number (0.01 to 4, seconds)
- filterCutoff: number (20 to 20000, Hz - Low-pass filter frequency)
- filterQ: number (0 to 20, resonance)
- lfoRate: number (0.1 to 30, Hz)
- lfoDepth: number (0 to 1, modulation amount)
- lfoTarget: string ("pitch" | "filter", what the LFO modulates)
- reverb: number (0 to 1, wet/dry mix)
- delay: number (0 to 1, feedback amount)
- delayTime: number (0.01 to 1, seconds)
- pitchEnvelope: object with "depth" (0 to 48, pitch bend in semitones) and "attack" (0.001 to 0.5)
- explanation: string explaining WHY you chose these specific values for the user's request
- tips: array of 2-3 short practical tips for the user to further customize the sound

Return ONLY the raw JSON. No markdown, no code blocks, no conversational text.`;

const DEFAULT_SYNTH_RESPONSE = {
  oscillator: "sawtooth",
  subOscillator: false,
  subOctave: -12,
  attack: 0.01,
  decay: 0.2,
  sustain: 0.5,
  release: 0.3,
  filterCutoff: 2000,
  filterQ: 1,
  lfoRate: 5,
  lfoDepth: 0,
  lfoTarget: "filter" as const,
  reverb: 0.3,
  delay: 0,
  delayTime: 0.25,
  pitchEnvelope: { depth: 0, attack: 0.001 },
  explanation: "Default warm synth sound.",
  tips: ["Try increasing LFO depth for vibrato", "Lower the filter cutoff for a darker tone"],
};

function sanitizeSynth(raw: any) {
  const oscTypes = ["sine", "square", "sawtooth", "triangle"];
  const lfoTargets = ["pitch", "filter"];
  return {
    oscillator: oscTypes.includes(raw.oscillator) ? raw.oscillator : DEFAULT_SYNTH_RESPONSE.oscillator,
    subOscillator: Boolean(raw.subOscillator),
    subOctave: clamp(Number(raw.subOctave ?? DEFAULT_SYNTH_RESPONSE.subOctave), -24, -1),
    attack: clamp(Number(raw.attack ?? DEFAULT_SYNTH_RESPONSE.attack), 0.001, 2),
    decay: clamp(Number(raw.decay ?? DEFAULT_SYNTH_RESPONSE.decay), 0.001, 2),
    sustain: clamp(Number(raw.sustain ?? DEFAULT_SYNTH_RESPONSE.sustain), 0, 1),
    release: clamp(Number(raw.release ?? DEFAULT_SYNTH_RESPONSE.release), 0.01, 4),
    filterCutoff: clamp(Number(raw.filterCutoff ?? DEFAULT_SYNTH_RESPONSE.filterCutoff), 20, 20000),
    filterQ: clamp(Number(raw.filterQ ?? DEFAULT_SYNTH_RESPONSE.filterQ), 0, 20),
    lfoRate: clamp(Number(raw.lfoRate ?? DEFAULT_SYNTH_RESPONSE.lfoRate), 0.1, 30),
    lfoDepth: clamp(Number(raw.lfoDepth ?? DEFAULT_SYNTH_RESPONSE.lfoDepth), 0, 1),
    lfoTarget: lfoTargets.includes(raw.lfoTarget) ? raw.lfoTarget : DEFAULT_SYNTH_RESPONSE.lfoTarget,
    reverb: clamp(Number(raw.reverb ?? DEFAULT_SYNTH_RESPONSE.reverb), 0, 1),
    delay: clamp(Number(raw.delay ?? DEFAULT_SYNTH_RESPONSE.delay), 0, 1),
    delayTime: clamp(Number(raw.delayTime ?? DEFAULT_SYNTH_RESPONSE.delayTime), 0.01, 1),
    pitchEnvelope: {
      depth: clamp(Number(raw.pitchEnvelope?.depth ?? 0), 0, 48),
      attack: clamp(Number(raw.pitchEnvelope?.attack ?? 0.001), 0.001, 0.5),
    },
    explanation: String(raw.explanation ?? DEFAULT_SYNTH_RESPONSE.explanation),
    tips: Array.isArray(raw.tips) ? raw.tips.slice(0, 3) : DEFAULT_SYNTH_RESPONSE.tips,
  };
}

// ─── GUITAR MODE ──────────────────────────────────────────────────────────────

const GUITAR_SYSTEM_PROMPT = `You are a professional Guitar Tone Designer and FX expert. Translate the user's guitar tone description into a JSON object representing a virtual pedalboard and amplifier configuration for Tone.js.

Map everything to these exact parameters for our FMSynth and FX chain:
- ampModel: string ("clean", "crunch", or "highgain")
- amp: {
    gain: number (0.1 to 1.0),
    bass: number (0 to 1),
    middle: number (0 to 1),
    treble: number (0 to 1),
    presence: number (0 to 1),
    master: number (0.1 to 1.0)
  }
- distortion: number (0 to 1, amount of fuzz/overdrive stompbox distortion)
- chorus: number (0 to 1, chorus/flanger depth stompbox)
- chorusRate: number (0.1 to 8, chorus LFO rate in Hz)
- delayTime: number (0.05 to 1, echo delay time in seconds)
- delayFeedback: number (0 to 0.9, echo feedback/repeats)
- delayMix: number (0 to 1, delay stompbox wet/dry mix)
- reverb: number (0 to 1, reverb stompbox wet/dry)
- reverbDecay: number (0.5 to 10, reverb tail length in seconds)
- compressor: number (0 to 1, compression stompbox amount)
- filterFreq: number (200 to 8000, wah/cabinet filter center frequency in Hz)
- filterQ: number (0.5 to 10, filter resonance)
- explanation: string explaining how these settings achieve the requested tone (mention the artist/song if applicable)
- tips: array of 2-3 short tips for tweaking this sound further

Think carefully:
- Clean tones (e.g., Surf, Jazz, Funk): ampModel "clean", low amp gain (0.2-0.4), distortion 0.
- Crunch tones (e.g., AC/DC, classic rock): ampModel "crunch", mid amp gain (0.5-0.7), middle 0.6-0.8.
- High-Gain (e.g., Metal, Djent): ampModel "highgain", high amp gain (0.8-1.0), scooped middle (0.2-0.4).
- Jimi Hendrix / Fuzz: distortion 0.8-1.0, filterFreq sweep for wah.
- Pink Floyd / Gilmour: chorus 0.5-0.8, delay 0.5-0.8, reverb 0.6-0.8.

Return ONLY the raw JSON. No markdown, no code blocks, no conversational text.`;

const DEFAULT_GUITAR_RESPONSE = {
  ampModel: "clean",
  amp: {
    gain: 0.3,
    bass: 0.5,
    middle: 0.5,
    treble: 0.6,
    presence: 0.5,
    master: 0.7,
  },
  distortion: 0.0,
  chorus: 0.0,
  chorusRate: 1.5,
  delayTime: 0.35,
  delayFeedback: 0.3,
  delayMix: 0.0,
  reverb: 0.3,
  reverbDecay: 2.5,
  compressor: 0.2,
  filterFreq: 4500,
  filterQ: 1,
  explanation: "A standard clean amplifier tone with slight compression and room reverb.",
  tips: ["Switch to the Crunch amp for rock rhythms", "Turn on the Overdrive pedal for bluesy solos", "Add delay and chorus for an 80s clean tone"],
};

function sanitizeGuitar(raw: any) {
  const ampModels = ["clean", "crunch", "highgain"];
  return {
    ampModel: ampModels.includes(raw.ampModel) ? raw.ampModel : DEFAULT_GUITAR_RESPONSE.ampModel,
    amp: {
      gain: clamp(Number(raw.amp?.gain ?? DEFAULT_GUITAR_RESPONSE.amp.gain), 0.1, 1),
      bass: clamp(Number(raw.amp?.bass ?? DEFAULT_GUITAR_RESPONSE.amp.bass), 0, 1),
      middle: clamp(Number(raw.amp?.middle ?? DEFAULT_GUITAR_RESPONSE.amp.middle), 0, 1),
      treble: clamp(Number(raw.amp?.treble ?? DEFAULT_GUITAR_RESPONSE.amp.treble), 0, 1),
      presence: clamp(Number(raw.amp?.presence ?? DEFAULT_GUITAR_RESPONSE.amp.presence), 0, 1),
      master: clamp(Number(raw.amp?.master ?? DEFAULT_GUITAR_RESPONSE.amp.master), 0.1, 1),
    },
    distortion: clamp(Number(raw.distortion ?? DEFAULT_GUITAR_RESPONSE.distortion), 0, 1),
    chorus: clamp(Number(raw.chorus ?? DEFAULT_GUITAR_RESPONSE.chorus), 0, 1),
    chorusRate: clamp(Number(raw.chorusRate ?? DEFAULT_GUITAR_RESPONSE.chorusRate), 0.1, 8),
    delayTime: clamp(Number(raw.delayTime ?? DEFAULT_GUITAR_RESPONSE.delayTime), 0.05, 1),
    delayFeedback: clamp(Number(raw.delayFeedback ?? DEFAULT_GUITAR_RESPONSE.delayFeedback), 0, 0.9),
    delayMix: clamp(Number(raw.delayMix ?? DEFAULT_GUITAR_RESPONSE.delayMix), 0, 1),
    reverb: clamp(Number(raw.reverb ?? DEFAULT_GUITAR_RESPONSE.reverb), 0, 1),
    reverbDecay: clamp(Number(raw.reverbDecay ?? DEFAULT_GUITAR_RESPONSE.reverbDecay), 0.5, 10),
    compressor: clamp(Number(raw.compressor ?? DEFAULT_GUITAR_RESPONSE.compressor), 0, 1),
    filterFreq: clamp(Number(raw.filterFreq ?? DEFAULT_GUITAR_RESPONSE.filterFreq), 200, 8000),
    filterQ: clamp(Number(raw.filterQ ?? DEFAULT_GUITAR_RESPONSE.filterQ), 0.5, 10),
    explanation: String(raw.explanation ?? DEFAULT_GUITAR_RESPONSE.explanation),
    tips: Array.isArray(raw.tips) ? raw.tips.slice(0, 3) : DEFAULT_GUITAR_RESPONSE.tips,
  };
}

// ─── SHARED ───────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function callGemini(systemPrompt: string, userPrompt: string, defaultResponse: object): Promise<object | string> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    const result = await model.generateContent(`${systemPrompt}\n\nUser request: ${userPrompt}`);
    return result.response.text();
  } catch (apiError: any) {
    const status = apiError?.status ?? apiError?.response?.status;
    const msg = apiError?.message ?? "";
    if (status === 503 || msg.includes("503") || msg.toLowerCase().includes("unavailable")) {
      console.warn("Gemini API 503 - Service unavailable, using fallback");
    } else if (status === 429 || msg.includes("429")) {
      console.warn("Gemini API 429 - Quota exceeded, using fallback");
    } else {
      console.error("Gemini API error:", apiError);
    }
    // Return the default response object directly so the caller can detect the fallback
    return defaultResponse;
  }
}

function extractJSON(content: string): any {
  let cleaned = content;
  const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    cleaned = match[1].trim();
  } else {
    cleaned = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  }
  return JSON.parse(cleaned);
}

export async function POST(request: Request) {
  let mode: "synth" | "guitar" = "synth";
  try {
    const body = (await request.json()) as { prompt?: string; mode?: "synth" | "guitar" };
    const userPrompt = body.prompt?.trim();
    mode = body.mode === "guitar" ? "guitar" : "synth";

    if (!userPrompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const systemPrompt = mode === "guitar" ? GUITAR_SYSTEM_PROMPT : SYNTH_SYSTEM_PROMPT;
    const defaultResponse = mode === "guitar" ? DEFAULT_GUITAR_RESPONSE : DEFAULT_SYNTH_RESPONSE;
    const sanitize = mode === "guitar" ? sanitizeGuitar : sanitizeSynth;

    const result = await callGemini(systemPrompt, userPrompt, defaultResponse);

    // If callGemini returned the default object directly (API error fallback), use it
    if (typeof result !== "string") {
      return NextResponse.json({ ...result, explanation: (result as any).explanation ?? "AI unavailable — using fallback preset." });
    }

    if (!result) return NextResponse.json(defaultResponse);

    try {
      const parsed = extractJSON(result);
      return NextResponse.json(sanitize(parsed));
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Content:", result);
      return NextResponse.json(defaultResponse);
    }
  } catch (error) {
    // Last-resort catch — always return a usable default, never a raw 500
    console.error("AI Synth route error:", error);
    const defaultResponse = mode === "guitar" ? DEFAULT_GUITAR_RESPONSE : DEFAULT_SYNTH_RESPONSE;
    return NextResponse.json({ ...defaultResponse, explanation: "An unexpected error occurred. Using safe default preset." });
  }
}

