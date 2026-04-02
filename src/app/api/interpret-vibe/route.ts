import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a professional Audio Systems Engineer. Translate the user's sound description into a JSON object for Tone.js.
Required keys:

lowpass: Frequency in Hz (20 to 20000).
highpass: Frequency in Hz (20 to 20000).
distortion: Amount (0.0 to 1.0).
bitrate: Bit depth (1 to 16).
reverb: { wet: amount (0.0 to 1.0) }
compressor: { 
  threshold: level in dB (-60 to 0),
  ratio: value (1 to 20),
  attack: seconds (0.001 to 0.2),
  release: seconds (0.01 to 1.0)
}
phaser: { rate: (0.1 to 10), depth: (0.1 to 1.0), baseFrequency: (100 to 2000), wet: (0.0 to 1.0) }
tremolo: { frequency: (0.1 to 10), depth: (0.1 to 1.0), wet: (0.0 to 1.0) }
pitchShift: { pitch: semitones (-12 to 12), wet: (0.0 to 1.0) }
explanation: A very short (one sentence) engineering reason for these choices.

Return ONLY the raw JSON. No markdown, no '\`\`\`json', no conversational text.`;

const DEFAULT_RESPONSE = {
  lowpass: 20000,
  highpass: 20,
  distortion: 0,
  bitrate: 16,
  reverb: { wet: 0 },
  compressor: {
    threshold: -18,
    ratio: 1,
    attack: 0.008,
    release: 0.09,
  },
  phaser: { rate: 0.5, depth: 0.5, baseFrequency: 350, wet: 0 },
  tremolo: { frequency: 4, depth: 0.5, wet: 0 },
  pitchShift: { pitch: 0, wet: 0 },
  explanation: "Default neutral state.",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitize(raw: any) {
  return {
    lowpass: clamp(Number(raw.lowpass ?? DEFAULT_RESPONSE.lowpass), 20, 20000),
    highpass: clamp(Number(raw.highpass ?? DEFAULT_RESPONSE.highpass), 20, 20000),
    distortion: clamp(Number(raw.distortion ?? DEFAULT_RESPONSE.distortion), 0, 1),
    bitrate: Math.round(clamp(Number(raw.bitrate ?? DEFAULT_RESPONSE.bitrate), 1, 16)),
    reverb: {
      wet: clamp(Number(raw.reverb?.wet ?? DEFAULT_RESPONSE.reverb.wet), 0, 1),
    },
    compressor: {
      threshold: clamp(Number(raw.compressor?.threshold ?? DEFAULT_RESPONSE.compressor.threshold), -60, 0),
      ratio: clamp(Number(raw.compressor?.ratio ?? DEFAULT_RESPONSE.compressor.ratio), 1, 20),
      attack: clamp(Number(raw.compressor?.attack ?? DEFAULT_RESPONSE.compressor.attack), 0.001, 0.2),
      release: clamp(Number(raw.compressor?.release ?? DEFAULT_RESPONSE.compressor.release), 0.01, 1.0),
    },
    phaser: {
      rate: clamp(Number(raw.phaser?.rate ?? DEFAULT_RESPONSE.phaser.rate), 0.1, 10),
      depth: clamp(Number(raw.phaser?.depth ?? DEFAULT_RESPONSE.phaser.depth), 0.1, 1.0),
      baseFrequency: clamp(Number(raw.phaser?.baseFrequency ?? DEFAULT_RESPONSE.phaser.baseFrequency), 100, 2000),
      wet: clamp(Number(raw.phaser?.wet ?? DEFAULT_RESPONSE.phaser.wet), 0, 1),
    },
    tremolo: {
      frequency: clamp(Number(raw.tremolo?.frequency ?? DEFAULT_RESPONSE.tremolo.frequency), 0.1, 10),
      depth: clamp(Number(raw.tremolo?.depth ?? DEFAULT_RESPONSE.tremolo.depth), 0.1, 1.0),
      wet: clamp(Number(raw.tremolo?.wet ?? DEFAULT_RESPONSE.tremolo.wet), 0, 1),
    },
    pitchShift: {
      pitch: clamp(Number(raw.pitchShift?.pitch ?? DEFAULT_RESPONSE.pitchShift.pitch), -12, 12),
      wet: clamp(Number(raw.pitchShift?.wet ?? DEFAULT_RESPONSE.pitchShift.wet), 0, 1),
    },
    explanation: String(raw.explanation ?? DEFAULT_RESPONSE.explanation),
  };
}

export async function POST(request: Request) {
  try {
    const { prompt } = (await request.json()) as { prompt?: string };
    const userPrompt = prompt?.trim();
    if (!userPrompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

      // Use the successful prompt concatenation strategy
      const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser request: ${userPrompt}`);
      const content = result.response.text();
      console.log("Gemini raw response:", content);

      if (!content) {
        return NextResponse.json(DEFAULT_RESPONSE);
      }

      // Attempt to extract JSON from markdown code blocks or clean the string
      let cleaned = content;
      const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        cleaned = match[1].trim();
      } else {
        cleaned = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      }

      try {
        const parsed = JSON.parse(cleaned) as Partial<typeof DEFAULT_RESPONSE>;
        return NextResponse.json(sanitize(parsed));
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Content:", cleaned);
        return NextResponse.json(
          { error: "Failed to parse Gemini response as JSON", details: String(parseError) },
          { status: 500 }
        );
      }
    } catch (apiError: any) {
      // HANDLE 429 RATE LIMIT ERROR
      if (apiError?.status === 429 || apiError?.message?.includes("429")) {
        console.warn("Gemini API 429 - Using fallback response");
        return NextResponse.json({
          lowpass: 1500,
          highpass: 300,
          distortion: 0.4,
          bitrate: 12,
          reverb: { wet: 0.5 },
          compressor: {
            threshold: -20,
            ratio: 4,
            attack: 0.003,
            release: 0.25,
          },
          explanation: "FALLBACK: API Quota exceeded. Using safe defaults.",
        });
      }
      throw apiError; // Re-throw to be caught by the outer catch
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
