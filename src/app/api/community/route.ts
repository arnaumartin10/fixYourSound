import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch all communities with message counts
    const communities = await prisma.community.findMany({
      include: {
        messages: {
          select: { id: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      communities: communities.map((c) => ({
        ...c,
        messageCount: c.messages.length,
        messages: undefined,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch communities:", error);
    return NextResponse.json(
      { error: "Failed to fetch communities" },
      { status: 500 }
    );
  }
}
