import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Helper function to extract notes from scale string (e.g., "C major" -> ["C", "D", "E", "F", "G", "A", "B"])
function getScaleNotes(scale: string): string[] {
  const scaleMap: Record<string, string[]> = {
    "C major": ["C", "D", "E", "F", "G", "A", "B"],
    "C# major": ["C#", "D#", "E#", "F#", "G#", "A#", "B#"],
    "D major": ["D", "E", "F#", "G", "A", "B", "C#"],
    "D# major": ["D#", "E#", "F##", "G#", "A#", "B#", "C##"],
    "E major": ["E", "F#", "G#", "A", "B", "C#", "D#"],
    "F major": ["F", "G", "A", "Bb", "C", "D", "E"],
    "F# major": ["F#", "G#", "A#", "B", "C#", "D#", "E#"],
    "G major": ["G", "A", "B", "C", "D", "E", "F#"],
    "G# major": ["G#", "A#", "B#", "C#", "D#", "E#", "F##"],
    "A major": ["A", "B", "C#", "D", "E", "F#", "G#"],
    "A# major": ["A#", "B#", "C##", "D#", "E#", "F##", "G##"],
    "B major": ["B", "C#", "D#", "E", "F#", "G#", "A#"],
    "Bb major": ["Bb", "C", "D", "Eb", "F", "G", "A"],
    "Db major": ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
    "Eb major": ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
    "Gb major": ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"],
    "Ab major": ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
    "Cb major": ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"],
    // Minor scales
    "A minor": ["A", "B", "C", "D", "E", "F", "G"],
    "A# minor": ["A#", "B#", "C#", "D#", "E#", "F#", "G#"],
    "B minor": ["B", "C#", "D", "E", "F#", "G", "A"],
    "C minor": ["C", "D", "Eb", "F", "G", "Ab", "Bb"],
    "C# minor": ["C#", "D#", "E", "F#", "G#", "A", "B"],
    "D minor": ["D", "E", "F", "G", "A", "Bb", "C"],
    "D# minor": ["D#", "E#", "F#", "G#", "A#", "B", "C#"],
    "E minor": ["E", "F#", "G", "A", "B", "C", "D"],
    "F minor": ["F", "G", "Ab", "Bb", "C", "Db", "Eb"],
    "F# minor": ["F#", "G#", "A", "B", "C#", "D", "E"],
    "G minor": ["G", "A", "Bb", "C", "D", "Eb", "F"],
    "G# minor": ["G#", "A#", "B", "C#", "D#", "E", "F#"],
    "Ab minor": ["Ab", "Bb", "Cb", "Db", "Eb", "Fb", "Gb"],
    "Bb minor": ["Bb", "C", "Db", "Eb", "F", "Gb", "Ab"],
    "Db minor": ["Db", "Eb", "Fb", "Gb", "Ab", "Bbb", "Cb"],
    "Eb minor": ["Eb", "F", "Gb", "Ab", "Bb", "Cb", "Db"],
    "Gb minor": ["Gb", "Ab", "Bbb", "Cb", "Db", "Ebb", "Fb"],
  };
  return scaleMap[scale] || ["C", "D", "E", "F", "G", "A", "B"];
}

export async function POST(req: Request) {
  try {
    const { scale, vibe } = await req.json();

    const scaleNotes = getScaleNotes(scale);
    const scaleNotesStr = scaleNotes.join(", ");

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are a professional music composition assistant. 
    Generate a sophisticated 4-chord progression based on the following:
    Scale: ${scale}
    Scale Notes (AVAILABLE): ${scaleNotesStr}
    Vibe: ${vibe}

    CRITICAL RULE: You MUST generate chords strictly within the ${scale} scale. 
    ONLY use these notes: ${scaleNotesStr}
    Do NOT use borrowed chords, chromatic notes, or any notes outside the scale.
    Every chord must be built ONLY from the available scale notes.

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
    4. Ensure all chords are valid only within the ${scale} scale.`;

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
    
    // FALLBACK CHORD PROGRESSION
    return NextResponse.json({
      progression: [
        { chord: "Cmaj7", explanation: "Home key, stable and bright." },
        { chord: "Am7", explanation: "Relative minor, adding some soft melancholy." },
        { chord: "Dm7", explanation: "Subdominant tension, preparing the cadence." },
        { chord: "G7", explanation: "Dominant tension leading back to home." }
      ],
      scaleNotes: ["C", "D", "E", "F", "G", "A", "B"],
      strummingPatternIdea: "A simple folk pattern: D D U U D U"
    });
  }
}
