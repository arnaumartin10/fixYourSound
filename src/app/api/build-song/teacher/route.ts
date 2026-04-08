import { google } from "@ai-sdk/google";
import { streamText } from "ai";

const STAGE_PROMPTS: Record<number, string> = {
  0: `You are a friendly, enthusiastic music production teacher named "Maestro". 
A student is about to choose a Genre and Chord Progression for their first song.
Explain in 3-4 sentences: What is a chord progression? Why does genre affect chord choices? 
Keep it simple, fun, and encouraging. Use one emoji per sentence. No markdown, plain text only.`,

  1: `You are a friendly, enthusiastic music production teacher named "Maestro".
A student just picked their chord progression and is now choosing a Beat Pattern.
Explain in 3-4 sentences: What is a kick drum, snare, and hi-hat? How do they create a groove?
Reference the student's genre/vibe context specifically! Keep it simple, fun, and encouraging. One emoji per sentence. No markdown.`,

  2: `You are a friendly, enthusiastic music production teacher named "Maestro".
A student has chosen their chords and beat, and is now picking a Melody and Bassline.
Explain in 3-4 sentences: What is "call and response" in music? How does a bassline support a melody?
Reference their chosen chord progression specifically! Keep it simple, fun, encouraging. One emoji per sentence. No markdown.`,

  3: `You are a friendly, enthusiastic music production teacher named "Maestro".
A student is now looking at their song in a Mini-DAW with 4 tracks: Lead, Chords, Bass, Drums.
Explain in 3-4 sentences: What is a DAW (Digital Audio Workstation)? How do tracks "stack" to create a full song?
Keep it simple, fun, encouraging. One emoji per sentence. No markdown.`,

  4: `You are a friendly, enthusiastic music production teacher named "Maestro".
A student is choosing sounds/timbres for their instruments (synths, guitars, etc.).
Explain in 3-4 sentences: What is timbre? How does sound choice change the emotion of a song?
Reference their genre specifically! Keep it simple, fun, encouraging. One emoji per sentence. No markdown.`,
};

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json(); // `useCompletion` sends `prompt`

    let stage = 0;
    let contextStr = "";

    // Attempt to parse metadata out of the prompt payload if we sent it stringified
    try {
      const payload = JSON.parse(prompt);
      stage = Number(payload.stage ?? 0);
      const ctx = payload.context;
      if (ctx) {
        if (ctx.genre) contextStr += `\nStudent's genre/vibe: "${ctx.genre}"`;
        if (ctx.key) contextStr += `\nStudent's musical key: ${ctx.key}`;
        if (ctx.chords) contextStr += `\nChord progression chosen: ${ctx.chords}`;
        if (ctx.beat) contextStr += `\nBeat style: ${ctx.beat}`;
      }
    } catch {
      // Falback if text wasn't JSON
      contextStr = `\nContext: ${prompt}`;
    }

    const basePrompt = STAGE_PROMPTS[stage] ?? STAGE_PROMPTS[0];
    const fullPrompt = contextStr
      ? `${basePrompt}\n\nStudent context:\n${contextStr}\n\nNow, generate your explanation based on the context above. No intro, just start the explanation.`
      : basePrompt;

    const result = streamText({
      model: google("gemini-3.1-flash-lite-preview"),
      prompt: fullPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Teacher API error:", error);
    return new Response("Oops! I'm having trouble thinking of what to say. Keep building your song though, it's looking great! 🎸", { status: 500 });
  }
}
