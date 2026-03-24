import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a professional Audio Systems Engineer. Translate the user's sound description into a JSON object for Tone.js.
Required keys:

lowpass: Frequency in Hz (20 to 20000).

highpass: Frequency in Hz (20 to 20000).

distortion: Amount (0.0 to 1.0).

bitrate: Bit depth (1 to 16).

reverbWet: Mix amount (0.0 to 1.0).

compressionThreshold: Level in dB (-60 to 0).

explanation: A very short (one sentence) engineering reason for these choices.
Return ONLY the raw JSON. No markdown, no '\`\`\`json', no conversational text.`;

const DEFAULT_RESPONSE = {
  lowpass: 20000,
  highpass: 20,
  distortion: 0,
  bitrate: 16,
  reverbWet: 0,
  compressionThreshold: -18,
  explanation: "Default neutral state.",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitize(raw: Partial<typeof DEFAULT_RESPONSE>) {
  return {
    lowpass: clamp(Number(raw.lowpass ?? DEFAULT_RESPONSE.lowpass), 20, 20000),
    highpass: clamp(Number(raw.highpass ?? DEFAULT_RESPONSE.highpass), 20, 20000),
    distortion: clamp(Number(raw.distortion ?? DEFAULT_RESPONSE.distortion), 0, 1),
    bitrate: Math.round(clamp(Number(raw.bitrate ?? DEFAULT_RESPONSE.bitrate), 1, 16)),
    reverbWet: clamp(Number(raw.reverbWet ?? DEFAULT_RESPONSE.reverbWet), 0, 1),
    compressionThreshold: clamp(
      Number(raw.compressionThreshold ?? DEFAULT_RESPONSE.compressionThreshold),
      -60,
      0
    ),
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

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
