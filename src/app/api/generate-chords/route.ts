import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { scale, vibe } = await req.json();

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are a professional music composition assistant. 
    Generate a sophisticated 4-chord progression based on the following:
    Scale: ${scale}
    Vibe: ${vibe}

    Return ONLY a JSON object with the following structure:
    {
      "progression": [
        { "chord": "Am7", "explanation": "Brief musical reason for this chord in the context of the vibe." },
        ... (4 chords total)
      ],
      "scaleNotes": ["C", "D", "E", "F", "G", "A", "B"],
      "strummingPatternIdea": "A descriptive strumming or rhythm pattern idea."
    }

    Important Formatting Rules:
    1. Use standard jazz/pop notation (e.g., Cmaj7, G13, F#m7b5).
    2. Avoid nested parentheses (e.g., use F#m9 instead of F#m(add9)).
    3. Ensure no markdown formatting or conversational text, return only raw JSON.
    4. Ensure chords are musically valid within the scale or interesting borrowed chords.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Sanitize JSON response (handling potential markdown blocks)
    let cleaned = text;
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleaned = match[1].trim();
    } else {
      cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    }

    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Chord Generation API Error:", error);
    
    // FALLBACK CHORD PROGRESSION as requested
    return NextResponse.json({
      progression: [
        { chord: "Cmaj7", explanation: "Home key, stable and bright." },
        { chord: "Am7", explanation: "Relative minor, adding some soft melancholy." },
        { chord: "Dm7", explanation: "Subdominant tension, preparing the cadance." },
        { chord: "G7", explanation: "Dominant tension leading back to home." }
      ],
      scaleNotes: ["C", "D", "E", "F", "G", "A", "B"],
      strummingPatternIdea: "A simple folk pattern: D D U U D U"
    });
  }
}
