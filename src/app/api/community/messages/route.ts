import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface MessageRequest {
  content: string;
  communityId: string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    if (!communityId) {
      return NextResponse.json(
        { error: "communityId is required" },
        { status: 400 }
      );
    }

    const messages = await prisma.communityMessage.findMany({
      where: {
        communityId,
        deletedAt: null, // Only get non-deleted messages
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      skip: skip,
    });

    const total = await prisma.communityMessage.count({
      where: { communityId, deletedAt: null },
    });

    return NextResponse.json({ messages, total });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: MessageRequest = await req.json();
    const { content, communityId } = body;

    if (!content || !communityId) {
      return NextResponse.json(
        { error: "content and communityId are required" },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0 || trimmedContent.length > 500) {
      return NextResponse.json(
        { error: "Message must be between 1 and 500 characters" },
        { status: 400 }
      );
    }

    // Verify community exists
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    const message = await prisma.communityMessage.create({
      data: {
        content: trimmedContent,
        userId: session.user.id,
        communityId,
        isSystemMessage: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Failed to create message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("id");

    if (!messageId) {
      return NextResponse.json(
        { error: "Message id is required" },
        { status: 400 }
      );
    }

    // Get the message to verify ownership
    const message = await prisma.communityMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Only allow deletion by the message owner
    if (message.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized - You can only delete your own messages" },
        { status: 403 }
      );
    }

    // Soft delete the message
    const deletedMessage = await prisma.communityMessage.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Message deleted successfully", deletedMessage },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
