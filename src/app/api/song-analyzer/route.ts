import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { bpm, key, scale } = await req.json();

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are an expert music producer and mentor speaking to a beginner producer.
    
The user has just analyzed their track and found the following:
- BPM (Tempo): ${bpm}
- Musical Key: ${key} ${scale}

Write EXACTLY 2 sentences of actionable, inspiring producer advice. 
- Sentence 1: Identify the genre or vibe this BPM+Key combination naturally fits (be specific, e.g. "Dark Techno", "Lo-Fi Hip Hop", "Afrobeats", "Melodic Dubstep").
- Sentence 2: Give ONE concrete production tip tailored to this specific BPM and key (e.g. a specific instrument, technique, or sound design idea that works perfectly here).

Keep it conversational, encouraging, and educational. Do NOT use bullet points, headers, or markdown. Return only the 2 sentences as plain text.`;

    const result = await model.generateContent(prompt);
    const tip = result.response.text().trim();

    return NextResponse.json({ tip });
  } catch (error: any) {
    console.error("Song Analyzer API Error:", error);

    // Fallback tip
    return NextResponse.json({
      tip: "Your track has a great foundation! Try layering a subtle reverb on your melodic elements to add depth and space to the mix.",
    });
  }
}
