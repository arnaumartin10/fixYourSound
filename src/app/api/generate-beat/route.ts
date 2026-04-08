import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

interface BeatTrack {
  instrument: string;
  steps: boolean[];
}

interface BeatResponse {
  explanation: string;
  tempo: number;
  kitType?: "trap" | "house" | "acoustic" | "dnb" | "techno" | "funk";
  drumKit: "rock" | "pop" | "electronic" | "latino" | "rap-trap";
  bars: 1 | 2 | 4;
  tracks: BeatTrack[];
}

export async function POST(req: Request) {
  const body = await req.json();
  const { prompt, intensity, complexity, drumKit, bars } = body;

  if (!prompt?.trim()) {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  if (intensity === undefined || complexity === undefined) {
    return NextResponse.json(
      { error: "Intensity and Complexity are required" },
      { status: 400 }
    );
  }

  if (!drumKit || !bars || ![1, 2, 4].includes(bars)) {
    return NextResponse.json(
      { error: "drumKit and valid bars (1, 2, or 4) are required" },
      { status: 400 }
    );
  }

  const totalSteps = 16 * bars; // 16, 32, or 64 steps

  try {

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    const systemPrompt = `You are a professional music producer and beat maker. Generate 4 distinct drum beat variations based on the user's request.

USER HAS SELECTED: "${drumKit}" DRUM KIT
GENERATE: ${totalSteps}-step drum beat patterns (${bars} bar${bars > 1 ? "s" : ""})

DRUM KIT CHARACTERISTICS:
- "rock": Punchy acoustic kick, snare on 2 & 4.
- "pop": Radio-friendly, groovy offbeat snares.
- "electronic": Tight programming, modern feel.
- "latino": Dembow-influenced, syncopated.
- "rap-trap": 808 bass drops, rapid hi-hat rolls.

Return ONLY a JSON object with this structure:
{
  "options": [
    {
      "explanation": "Brief description of this variation...",
      "tempo": 120,
      "kitType": "house",
      "tracks": [
        { "instrument": "Kick", "steps": [true, false, ...] },
        ... (Exactly 4 tracks: Kick, Snare, ClosedHat, OpenHat)
      ]
    },
    ... (4 variations total)
  ]
}

CRITICAL: 
1. Each track's steps array MUST have EXACTLY ${totalSteps} booleans.
2. Return ONLY raw JSON.`;

    const userPrompt = `Create 4 variations for a ${bars}-bar beat:
- Drum Kit: ${drumKit}
- Genre/Vibe: ${prompt}
- Intensity: ${intensity}/100
- Complexity: ${complexity}/100`;

    const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt);
    const text = result.response.text();

    // Sanitize JSON
    let cleaned = text.trim();
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleaned = match[1].trim();
    } else {
      cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    }

    const data = JSON.parse(cleaned);

    // Validate each option
    if (data.options && Array.isArray(data.options)) {
      data.options = data.options.map((opt: any) => {
        // Ensure 4 tracks exist
        const required = ["Kick", "Snare", "ClosedHat", "OpenHat"];
        const tracks = opt.tracks || [];
        required.forEach(inst => {
           if (!tracks.find((t: any) => t.instrument === inst)) {
             tracks.push({ instrument: inst, steps: Array(totalSteps).fill(false) });
           }
        });
        return { ...opt, tracks: tracks.slice(0, 4) };
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Beat Generation API Error:", error);
    return NextResponse.json({
      options: [
        {
          explanation: "Fallback basic beat",
          tempo: 120,
          kitType: "house",
          tracks: [
            { instrument: "Kick", steps: Array(totalSteps).fill(false).map((_, i) => i % 4 === 0) },
            { instrument: "Snare", steps: Array(totalSteps).fill(false).map((_, i) => i % 8 === 4) },
            { instrument: "ClosedHat", steps: Array(totalSteps).fill(true) },
            { instrument: "OpenHat", steps: Array(totalSteps).fill(false) }
          ]
        }
      ]
    });
  }
}

