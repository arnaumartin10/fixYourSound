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
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const systemPrompt = `You are a professional music producer and beat maker. Generate drum beat patterns based on the user's request.

USER HAS SELECTED: "${drumKit}" DRUM KIT
GENERATE: ${totalSteps}-step drum beat pattern (${bars} bar${bars > 1 ? "s" : ""})

DRUM KIT CHARACTERISTICS - Tailor your rhythm accordingly:
- "rock": Punchy acoustic-style kick, powerful snare on 2 & 4, driving hi-hat pattern
- "pop": Balanced, radio-friendly sound, groovy offbeat snares, consistent hi-hats
- "electronic": Clean 909/808 hybrid sounds, tight programming, modern feel  
- "latino": Dembow-influenced patterns, tight high-pitched kicks, tight snare hits and ghost notes
- "rap-trap": 808 bass drops with pitch slides, crisp snares, rapid hi-hat rolls/tremolos

RHYTHM REQUIREMENTS:
- Generate EXACTLY ${totalSteps} boolean values per track (16 steps x ${bars} bar${bars > 1 ? "s" : ""})
- For ${bars > 1 ? "multi-bar patterns: introduce variations, fills, and syncopations across measures" : "single bar: keep it tight and punchy"}
- Avoid robotic repetition${bars > 1 ? " - use fills, accent patterns, and dynamic changes" : ""}
- ${bars >= 2 ? "Add intensity ramps or drum fills at the end of measure 2" + (bars === 4 ? " and measure 4" : "") : ""}

INTENSITY & COMPLEXITY:
- Intensity (1-100): Higher = more hits, busier patterns. Lower = sparse, minimal.
- Complexity (1-100): Higher = syncopation, polyrhythms, offbeats. Lower = straight 4/4.

Return ONLY valid JSON with this exact structure:
{
  "explanation": "Brief description of the groove, feel, and why it matches the requested drum kit and parameters.",
  "tempo": 120,
  "kitType": "house",
  "tracks": [
    {
      "instrument": "Kick",
      "steps": [true, false, true, ... (exactly ${totalSteps} booleans)]
    },
    {
      "instrument": "Snare",
      "steps": [false, false, false, ... (exactly ${totalSteps} booleans)]
    },
    {
      "instrument": "ClosedHat",
      "steps": [true, true, false, ... (exactly ${totalSteps} booleans)]
    },
    {
      "instrument": "OpenHat",
      "steps": [false, false, false, ... (exactly ${totalSteps} booleans)]
    }
  ]
}

CRITICAL:
1. Each track's steps array MUST have EXACTLY ${totalSteps} boolean values
2. Include kitType based on the user's genre prompt (auto-detect: trap, house, acoustic, dnb, techno, funk)
3. Return ONLY valid JSON, no markdown or explanations
4. Tempo range: 80-180 BPM (appropriate for the vibe)`;

    const userPrompt = `Create a ${bars}-bar beat with these parameters:
- Drum Kit Selected: ${drumKit}
- Genre/Vibe: ${prompt}
- Intensity: ${intensity}/100
- Complexity: ${complexity}/100

Generate exactly ${totalSteps} steps per instrument. Return ONLY the JSON.`;

    const result = await model.generateContent(
      systemPrompt + "\n\n" + userPrompt
    );

    const text = result.response.text();

    // Sanitize JSON response
    let cleaned = text.trim();
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleaned = match[1].trim();
    } else {
      cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    }

    const data: BeatResponse = JSON.parse(cleaned);

    // Validate response structure
    if (
      !data.explanation ||
      typeof data.tempo !== "number" ||
      !data.kitType ||
      !Array.isArray(data.tracks)
    ) {
      throw new Error("Invalid response structure from LLM");
    }

    // Validate kitType if provided
    if (data.kitType) {
      const validKitTypes = ["trap", "house", "acoustic", "dnb", "techno", "funk"];
      if (!validKitTypes.includes(data.kitType)) {
        data.kitType = "house"; // Default to house
      }
    }

    // Validate each track has exactly totalSteps steps
    for (const track of data.tracks) {
      if (!track.instrument || !Array.isArray(track.steps) || track.steps.length !== totalSteps) {
        throw new Error(`Invalid track "${track.instrument}": must have exactly ${totalSteps} steps`);
      }
      // Ensure all steps are booleans
      track.steps = track.steps.map(step => Boolean(step));
    }

    // Ensure we have the 4 required instruments
    const requiredInstruments = ["Kick", "Snare", "ClosedHat", "OpenHat"];
    const existingInstruments = data.tracks.map(t => t.instrument);
    const missingInstruments = requiredInstruments.filter(
      inst => !existingInstruments.includes(inst)
    );

    if (missingInstruments.length > 0) {
      // Add missing instruments with empty patterns
      for (const inst of missingInstruments) {
        data.tracks.push({
          instrument: inst,
          steps: Array(totalSteps).fill(false),
        });
      }
    }

    // Reorder tracks to match expected order
    const trackOrder = ["Kick", "Snare", "ClosedHat", "OpenHat"];
    data.tracks.sort((a, b) => trackOrder.indexOf(a.instrument) - trackOrder.indexOf(b.instrument));

    // Add drumKit and bars to response
    data.drumKit = drumKit as any;
    data.bars = bars as any;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Beat Generation API Error:", error);

    // FALLBACK BEAT
    const fallbackBeat: BeatResponse = {
      explanation:
        "A classic four-on-the-floor beat with snare on 2 and 4, closed hats on every eighth note, and occasional open hats for groove.",
      tempo: 120,
      drumKit: drumKit,
      bars: bars,
      tracks: [
        {
          instrument: "Kick",
          steps: Array(totalSteps)
            .fill(null)
            .map((_, i) => i % 4 === 0 || (bars >= 2 && i % 8 === 4)),
        },
        {
          instrument: "Snare",
          steps: Array(totalSteps)
            .fill(null)
            .map((_, i) => i % 8 === 4 || i % 8 === 12),
        },
        {
          instrument: "ClosedHat",
          steps: Array(totalSteps)
            .fill(null)
            .map(() => true),
        },
        {
          instrument: "OpenHat",
          steps: Array(totalSteps)
            .fill(null)
            .map((_, i) => i % 8 === 7),
        },
      ],
    };

    return NextResponse.json(fallbackBeat);
  }
}
