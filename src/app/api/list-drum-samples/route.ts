import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const genre = searchParams.get("genre") as string;
    const drumType = searchParams.get("drumType") as string;

    if (!genre || !drumType) {
      return NextResponse.json(
        { error: "genre and drumType required" },
        { status: 400 }
      );
    }

    // Build the file path
    const basePath = path.join(
      process.cwd(),
      "public",
      "sounds",
      "drum-kits",
      genre,
      drumType
    );

    // Check if directory exists
    if (!fs.existsSync(basePath)) {
      // Try with alternative naming (e.g., "latino" vs "latin")
      const altGenre = genre === "latino" ? "latin" : genre;
      const altPath = path.join(
        process.cwd(),
        "public",
        "sounds",
        "drum-kits",
        altGenre,
        drumType
      );

      if (!fs.existsSync(altPath)) {
        return NextResponse.json(
          { error: "Directory not found", genre, drumType },
          { status: 404 }
        );
      }

      // Use the alternative path
      const files = fs
        .readdirSync(altPath)
        .filter((file) => file.endsWith(".wav") || file.endsWith(".mp3"))
        .sort();

      return NextResponse.json({
        genre: altGenre,
        drumType,
        files,
        count: files.length,
      });
    }

    // List audio files in the directory
    const files = fs
      .readdirSync(basePath)
      .filter((file) => file.endsWith(".wav") || file.endsWith(".mp3"))
      .sort();

    return NextResponse.json({
      genre,
      drumType,
      files,
      count: files.length,
    });
  } catch (error) {
    console.error("Error listing drum samples:", error);
    return NextResponse.json(
      { error: "Failed to list samples" },
      { status: 500 }
    );
  }
}
