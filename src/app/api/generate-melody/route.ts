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
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are a professional music composer. Generate a melodic composition based on the following:

Chord Progression: ${chordProgression}
Vibe/Style: ${vibe}

Create two musical lines: a Lead melody and a Bassline.
Each note should be represented as MIDI-like note objects with the following format:
- pitch: Note name (e.g., "C4", "D#5", "Bb3")
- startTime: Beat position (0-8 for an 8-beat pattern)
- duration: Note length in beats (0.5 = eighth note, 1 = quarter note, 2 = half note)

Return ONLY a JSON object with this structure:
{
  "lead": [
    { "pitch": "C5", "startTime": 0, "duration": 1 },
    { "pitch": "E5", "startTime": 1, "duration": 1 },
    ... (8-16 notes total)
  ],
  "bassline": [
    { "pitch": "C3", "startTime": 0, "duration": 2 },
    { "pitch": "G2", "startTime": 2, "duration": 2 },
    ... (4-8 notes total)
  ],
  "bpm": 120,
  "timeSignature": "4/4"
}

Important Rules:
1. Lead melody should be musically interesting and match the vibe
2. Bassline should outline the chord progression
3. All pitches must be valid MIDI note names (C, D, E, F, G, A, B with # or b modifiers, followed by octave number)
4. startTime and duration must be numeric values in beats
5. Return ONLY valid JSON, no markdown formatting or explanations
6. Ensure melodies fit within 8 beats (standard phrase)`;

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

    const data: MelodyResponse = JSON.parse(cleaned);

    // Validate response structure
    if (
      !Array.isArray(data.lead) ||
      !Array.isArray(data.bassline) ||
      typeof data.bpm !== "number" ||
      typeof data.timeSignature !== "string"
    ) {
      throw new Error("Invalid response structure from LLM");
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Melody Generation API Error:", error);

    // FALLBACK MELODY
    const fallbackResponse: MelodyResponse = {
      bpm: 120,
      timeSignature: "4/4",
      lead: [
        { pitch: "C5", startTime: 0, duration: 1 },
        { pitch: "E5", startTime: 1, duration: 1 },
        { pitch: "G5", startTime: 2, duration: 1 },
        { pitch: "A5", startTime: 3, duration: 1 },
        { pitch: "G5", startTime: 4, duration: 1 },
        { pitch: "E5", startTime: 5, duration: 1 },
        { pitch: "C5", startTime: 6, duration: 2 },
      ],
      bassline: [
        { pitch: "C3", startTime: 0, duration: 2 },
        { pitch: "G2", startTime: 2, duration: 2 },
        { pitch: "A2", startTime: 4, duration: 2 },
        { pitch: "E2", startTime: 6, duration: 2 },
      ],
    };

    return NextResponse.json(fallbackResponse);
  }
}
