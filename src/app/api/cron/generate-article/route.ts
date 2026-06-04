import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";

// ─── Constants ───────────────────────────────────────────────────────────────

const BOT_NAME = "FixYourSound Bot";
const BOT_EMAIL = "bot@fixyoursound.internal";

/** The community name where articles will be posted. Must match a record in the
 *  `communities` table. "General" is the default catch-all channel. */
const TARGET_COMMUNITY_NAME = "General";

// ─── Topic pool ──────────────────────────────────────────────────────────────

const TOPICS = [
  "How Sónar+D is shaping the future of AI-driven live performance tools",
  "MTG (Music Technology Group at UPF Barcelona) and their latest research on generative audio models",
  "Barcelona's growing music tech startup ecosystem: studios, collectives and DAW innovators to watch",
  "Using LLMs and diffusion models for real-time synthesis: a Barcelona producer's perspective",
  "The role of Pompeu Fabra University in bridging academic AI research and the independent music scene",
  "Generative AI plugins and how local Barcelona studios are integrating them into professional workflows",
  "How AI is changing the sound design process in Barcelona's electronic music community",
  "Open-source music AI tools emerging from Spain's tech hubs and what they mean for independent artists",
  "The ethics of generative music: perspectives from Barcelona's creative tech community",
  "Spatial audio and AI: how Barcelona's XR and immersive arts scene is experimenting with generative sound",
];

// ─── System prompt ────────────────────────────────────────────────────────────

function buildPrompt(topic: string): string {
  return `You are FixYourSound Bot — an automated Music Tech scout and editorial writer based in Barcelona.
Your role is to write insightful, opinionated, and well-structured community articles for the FixYourSound platform:
a community of musicians, producers, sound designers and audio developers who care deeply about
Generative AI, music technology, and the local creative tech ecosystem.

Write a rich, engaging community post on the following topic:
"${topic}"

Guidelines:
- Length: 350–500 words, no more.
- Tone: knowledgeable but conversational, like a senior producer sharing insider knowledge.
- Always mention at least one concrete local Barcelona reference (Sónar+D, MTG/UPF, Poblenou arts district, local studios, Barcelona tech accelerators, etc.).
- Weave in relevant global Generative AI music tech trends (e.g., diffusion models for audio, LLM-based composition, real-time neural synthesis).
- End with one open question or call to discussion to engage the community.
- Do NOT use markdown headers or bullet points. Write in flowing paragraphs.
- Do NOT start with "Sure" or any preamble. Jump straight into the content.`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── 1. Security: validate Vercel cron secret ─────────────────────────────
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron] Unauthorized request to /api/cron/generate-article");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] /api/cron/generate-article triggered");

  try {
    // ── 2. Pick a random topic ──────────────────────────────────────────────
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    console.log(`[Cron] Selected topic: "${topic}"`);

    // ── 3. Generate article with Gemini ────────────────────────────────────
    let articleContent: string;

    try {
      const { text } = await generateText({
        model: google("gemini-3.1-flash-lite-preview"),
        prompt: buildPrompt(topic),
        maxOutputTokens: 700,
        temperature: 0.85,
      });

      if (!text || text.trim().length < 50) {
        throw new Error("Generated text is too short or empty");
      }

      articleContent = text.trim();
      console.log(
        `[Cron] Article generated successfully (${articleContent.length} chars)`
      );
    } catch (aiError) {
      console.error("[Cron] AI generation failed:", aiError);
      return NextResponse.json(
        {
          error: "AI generation failed",
          details: aiError instanceof Error ? aiError.message : String(aiError),
        },
        { status: 500 }
      );
    }

    // ── 4. Upsert the bot system user ───────────────────────────────────────
    const botUser = await prisma.user.upsert({
      where: { email: BOT_EMAIL },
      update: {},
      create: {
        name: BOT_NAME,
        email: BOT_EMAIL,
        // No password — this account is never used for login
      },
    });

    console.log(`[Cron] Bot user ready: ${botUser.id}`);

    // ── 5. Find or create the target community channel ──────────────────────
    const community = await prisma.community.upsert({
      where: {
        name_language: {
          name: TARGET_COMMUNITY_NAME,
          language: "en",
        },
      },
      update: {},
      create: {
        name: TARGET_COMMUNITY_NAME,
        language: "en",
        icon: "🌐",
        description:
          "General discussions about music production, AI tools, and the FixYourSound ecosystem.",
      },
    });

    console.log(`[Cron] Community channel ready: ${community.id}`);

    // ── 6. Format the final message (header + body) ─────────────────────────
    const formattedContent = `📡 **AI Music Tech Scout** — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}\n\n**${topic}**\n\n${articleContent}`;

    // ── 7. Insert the community message ─────────────────────────────────────
    const message = await prisma.communityMessage.create({
      data: {
        content: formattedContent,
        userId: botUser.id,
        communityId: community.id,
        isSystemMessage: true,
      },
    });

    console.log(
      `[Cron] Community message created successfully: ${message.id}`
    );

    // ── 8. Return success payload ───────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        messageId: message.id,
        communityId: community.id,
        topic,
        createdAt: message.createdAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Cron] Unexpected error in generate-article:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
