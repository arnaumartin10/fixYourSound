import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export async function POST(req: Request) {
  try {
    const { track, genre, chords, beat, melody, params } = await req.json();

    let trackPrompt = "";
    if (track === "lead") {
      trackPrompt = "Analyze the Lead Synth/Instrument choices based on the genre and params.";
    } else if (track === "bass") {
      trackPrompt = "Analyze the Bassline choices based on the genre and params.";
    } else if (track === "chords") {
      trackPrompt = "Analyze the Chord/Pad instrument choices based on the genre and params.";
    } else if (track === "drums") {
      trackPrompt = "Analyze the Rhythm/Beat choices based on the genre.";
    } else {
      trackPrompt = "Analyze this track in the context of the genre.";
    }

    const fullPrompt = `You are a friendly, enthusiastic music production teacher named "Maestro".
A student is inspecting their "${track}" track in the DAW.
Genre context: ${genre || "Unknown"}
Track specific parameters/notes:
${params ? JSON.stringify(params) : (track === "lead" || track === "bass" ? JSON.stringify(melody) : chords)}

${trackPrompt}
Explain in 2-3 sentences exactly why these specific sounds/notes work so well for their chosen genre. Keep it simple, fun, technical but accessible. One emoji per sentence. No markdown.`;

    const result = streamText({
      model: google("gemini-3.1-flash-lite-preview"),
      prompt: fullPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Inspector Insight API error:", error);
    return new Response("This track sounds awesome! 🎵 Keep experimenting with the sound design. ✨", { status: 500 });
  }
}
