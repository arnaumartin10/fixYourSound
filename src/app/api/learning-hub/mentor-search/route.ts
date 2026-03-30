import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export const glossaryTerms = [
  "REVERB",
  "DELAY",
  "COMPRESSION",
  "SATURATION",
  "BITCRUSHING",
  "HIGH-PASS FILTER",
  "LOW-PASS FILTER",
  "CHORUS",
  "PHASER",
  "PANNING",
  "LIMITER",
  "FLANGER",
  "TREMOLO",
  "STEREO WIDENING",
  "PITCH SHIFTING",
];

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log("Mentor search query:", query);
    console.log("API Key exists:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    // Check if the query matches any of our glossary terms
    const matchedTerm = glossaryTerms.find((term) =>
      query.toLowerCase().includes(term.toLowerCase())
    );

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    let systemPrompt = `You are a friendly, peer-to-peer audio production mentor. 
Explain audio engineering and music production concepts in simple, non-technical language that someone new to music production can understand.
Keep responses concise (2-3 sentences max).
Use metaphors and real-world analogies.
Be encouraging and enthusiastic about music production.`;

    if (matchedTerm) {
      systemPrompt += `\n\nThe user is asking about "${matchedTerm}", which is already available in the Interactive Audio Glossary above.
Suggest they try the ${matchedTerm} card to hear the effect in action!`;
    }

    const prompt = `${systemPrompt}\n\nUser's question: ${query}`;

    console.log("Sending to Gemini...");
    let response = "";
    try {
      const result = await model.generateContent(prompt);
      console.log("Gemini response received");
      response = result.response.text();
    } catch (apiError) {
      console.error("Gemini API error:", apiError);
      response = "Our AI Mentor is resting. Please try again in a moment.";
    }
    console.log("Response text:", response);

    return NextResponse.json({
      response,
      isExistingTerm: !!matchedTerm,
      matchedTerm: matchedTerm || null,
    });
  } catch (error) {
    console.error("Mentor search error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
