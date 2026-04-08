import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

interface MelodyNote {
  pitch: string;
  startTime: number;
  duration: number;
}

interface MelodyResponse {
  lead: MelodyNote[];
  bassline: MelodyNote[];
  bpm: number;
  timeSignature: string;
}

export async function POST(req: Request) {
  try {
    const { chordProgression, vibe } = await req.json();

    if (!chordProgression?.trim() || !vibe?.trim()) {
      return NextResponse.json(
        { error: "Chord progression and vibe are required" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    const prompt = `You are a professional music composer. Generate 4 distinct melodic variations (Lead + Bassline) based on the following:

Chord Progression: ${chordProgression}
Vibe/Style: ${vibe}

Each variation must include:
- lead: MIDI-like note objects (pitch, startTime: 0-8, duration index)
- bassline: MIDI-like note objects (pitch, startTime: 0-8, duration index)
- bpm: number
- timeSignature: "4/4"

Return ONLY a JSON object with this structure:
{
  "options": [
    {
      "lead": [{ "pitch": "C5", "startTime": 0, "duration": 1 }, ...],
      "bassline": [{ "pitch": "C3", "startTime": 0, "duration": 2 }, ...],
      "bpm": 120,
      "timeSignature": "4/4"
    },
    ... (4 variations total)
  ]
}

Important Rules:
1. Lead melody should be musically interesting and match the vibe.
2. Bassline should outline the chord progression.
3. Pitches must be valid MIDI note names.
4. Return ONLY valid JSON, no markdown.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Sanitize JSON response
    let cleaned = text;
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleaned = match[1].trim();
    } else {
      cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    }

    const data = JSON.parse(cleaned);

    // Minor validation
    if (data.options && Array.isArray(data.options)) {
      return NextResponse.json(data);
    }
    throw new Error("Invalid format from AI");

  } catch (error: any) {
    console.error("Melody Generation API Error:", error);

    // FALLBACK MELODY (Wrap in options)
    const fallback = {
      lead: [{ pitch: "C5", startTime: 0, duration: 1 }, { pitch: "E5", startTime: 1, duration: 1 }, { pitch: "G5", startTime: 2, duration: 1 }, { pitch: "C6", startTime: 3, duration: 1 }],
      bassline: [{ pitch: "C3", startTime: 0, duration: 2 }, { pitch: "G2", startTime: 2, duration: 2 }],
      bpm: 120,
      timeSignature: "4/4",
    };

    return NextResponse.json({ options: [fallback, { ...fallback, bpm: 125 }] });
  }
}

