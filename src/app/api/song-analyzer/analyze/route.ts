import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AnalysisRequest {
  bpm: number;
  key: string; // e.g., "C Major", "G Minor"
  loudness: number; // 0-100
}

export interface InsightResponse {
  tip: string;
  vibe: string;
  recommendation: string;
}

const SYSTEM_PROMPT = `You are a music production mentor specializing in helping beginner producers understand their audio files. 
Your expertise is in music theory, production techniques, and genre-specific advice.

When given BPM, Key, and Loudness metrics, provide:
1. A 1-sentence "tip" that explains what the BPM/Key combination is good for (e.g., "At 128 BPM in G Minor, you've got the perfect dark techno foundation.")
2. A "vibe" description (1-2 words) that captures the mood (e.g., "Dark & Energetic", "Chill Hip-Hop", "Happy & Bright")
3. A practical "recommendation" (1 sentence) for production suggestions (e.g., "Add a heavy sub-bass to fill the low end.")

Return ONLY valid JSON with these exact keys: { "tip": "...", "vibe": "...", "recommendation": "..." }
No markdown, no code blocks, no extra text.`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalysisRequest;
    const { bpm, key, loudness } = body;

    if (!bpm || !key) {
      return NextResponse.json(
        { error: "BPM and Key are required" },
        { status: 400 }
      );
    }

    const userPrompt = `Analyze this audio: BPM=${bpm}, Key=${key}, Loudness=${loudness.toFixed(0)}/100. Generate producer insights.`;

    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser request: ${userPrompt}`);
      const content = result.response.text();

      if (!content) {
        return NextResponse.json(getDefaultInsight(bpm, key));
      }

      // Extract JSON from response
      let cleaned = content;
      const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        cleaned = match[1].trim();
      } else {
        cleaned = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      }

      try {
        const parsed = JSON.parse(cleaned) as InsightResponse;
        // Validate required fields
        if (!parsed.tip || !parsed.vibe || !parsed.recommendation) {
          return NextResponse.json(getDefaultInsight(bpm, key));
        }
        return NextResponse.json(parsed);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        return NextResponse.json(getDefaultInsight(bpm, key));
      }
    } catch (apiError: any) {
      console.error("Gemini API Error:", apiError);

      // Rate limit fallback
      if (apiError?.status === 429) {
        return NextResponse.json(getDefaultInsight(bpm, key));
      }

      return NextResponse.json(
        {
          tip: `You've got a solid ${bpm} BPM track in ${key}.`,
          vibe: "Neutral",
          recommendation: "Experiment with layering complementary sounds to develop your track.",
        }
      );
    }
  } catch (error) {
    console.error("Analysis Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * Generate default insight based on BPM and Key
 */
function getDefaultInsight(bpm: number, key: string): InsightResponse {
  let vibe = "Neutral";
  let recommendation = "Layer complementary sounds to develop your track.";

  // Determine vibe based on BPM range
  if (bpm < 70) {
    vibe = "Chill & Lo-Fi";
    recommendation = "Perfect for ambient or lo-fi hip-hop. Add warm, vintage textures.";
  } else if (bpm < 90) {
    vibe = "Soulful & Smooth";
    recommendation = "Try adding live instrumentation or smooth vocal chops.";
  } else if (bpm < 110) {
    vibe = "Groovy & Uplifting";
    recommendation = "Add punchy drums and bright melodic elements.";
  } else if (bpm < 130) {
    vibe = "Energetic & Club-Ready";
    recommendation = "Layer in deep bass and rhythmic elements for the dancefloor.";
  } else if (bpm < 160) {
    vibe = "Fast & Intense";
    recommendation = "Focus on tight rhythms and aggressive sound design.";
  } else {
    vibe = "High-Energy Drill";
    recommendation = "Use complex hi-hats and punchy melodics.";
  }

  // Check if key contains "minor" for additional vibe adjustment
  if (key.toLowerCase().includes("minor")) {
    vibe = vibe.replace("&", "Dark &");
  }

  return {
    tip: `This ${bpm} BPM track in ${key} has real potential for the ${vibe} space.`,
    vibe,
    recommendation,
  };
}
