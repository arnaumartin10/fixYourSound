import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Predefined communities
const DEFAULT_COMMUNITIES = [
  {
    name: "General",
    icon: "💬",
    language: "en",
    description: "Daily chat and introductions",
  },
  {
    name: "Songs-Remixes",
    icon: "🎸",
    language: "en",
    description: "Share audio files, links, and get feedback",
  },
  {
    name: "Plugins-Tools",
    icon: "🔌",
    language: "en",
    description: "Discuss DAWs, VSTs, and presets",
  },
  {
    name: "General",
    icon: "💬",
    language: "es",
    description: "Chat diario e introducciones",
  },
  {
    name: "Canciones-Remixes",
    icon: "🎸",
    language: "es",
    description: "Comparte archivos de audio, enlaces y obtén comentarios",
  },
  {
    name: "Complementos-Herramientas",
    icon: "🔌",
    language: "es",
    description: "Discute DAWs, VSTs y presets",
  },
];

// Welcome messages for General channel
const WELCOME_MESSAGES = [
  {
    content: "👋 Welcome to FixYourSound Community! This is the General channel for daily chat, introductions, and getting to know fellow producers.",
    isSystemMessage: true,
    language: "en",
  },
  {
    content: "🎵 Use #Songs-Remixes to share your tracks and get feedback from the community.",
    isSystemMessage: true,
    language: "en",
  },
  {
    content: "⚙️ Use #Plugins-Tools to discuss your favorite DAWs, VSTs, and presets.",
    isSystemMessage: true,
    language: "en",
  },
  {
    content: "👋 ¡Bienvenido a la Comunidad FixYourSound! Este es el canal General para chat diario, presentaciones y conocer a otros productores.",
    isSystemMessage: true,
    language: "es",
  },
  {
    content: "🎵 Usa #Canciones-Remixes para compartir tus pistas y obtener comentarios de la comunidad.",
    isSystemMessage: true,
    language: "es",
  },
  {
    content: "⚙️ Usa #Complementos-Herramientas para discutir tus DAWs, VSTs y presets favoritos.",
    isSystemMessage: true,
    language: "es",
  },
];

export async function POST() {
  try {
    // Check if communities already exist
    const existingCommunities = await prisma.community.count();

    if (existingCommunities > 0) {
      return NextResponse.json(
        { message: "Communities already initialized", count: existingCommunities },
        { status: 200 }
      );
    }

    // Create communities
    const created = await prisma.community.createMany({
      data: DEFAULT_COMMUNITIES,
      skipDuplicates: true,
    });

    // Fetch the General communities (EN and ES)
    const generalCommunities = await prisma.community.findMany({
      where: {
        name: "General",
      },
    });

    // Add welcome messages to General channels
    for (const general of generalCommunities) {
      const welcomeMessages = WELCOME_MESSAGES.filter(
        (msg) => msg.language === general.language
      );

      for (const welcomeMsg of welcomeMessages) {
        await prisma.communityMessage.create({
          data: {
            content: welcomeMsg.content,
            userId: null, // System messages have no user
            communityId: general.id,
            isSystemMessage: true,
          },
        });
      }
    }

    return NextResponse.json(
      {
        message: "Communities initialized successfully",
        count: created.count,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to initialize communities:", error);
    return NextResponse.json(
      { error: "Failed to initialize communities" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const count = await prisma.community.count();
    return NextResponse.json({
      initialized: count > 0,
      count,
    });
  } catch (error) {
    console.error("Failed to check community status:", error);
    return NextResponse.json(
      { error: "Failed to check community status" },
      { status: 500 }
    );
  }
}
