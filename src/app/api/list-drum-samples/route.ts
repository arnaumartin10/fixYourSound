import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const AUDIO_EXTENSIONS = [".wav", ".mp3", ".ogg"];

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

    // Build the file path: public/sounds/drum-kits/[genre]/[drumType]
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
      console.warn(`Directory not found: ${basePath}`);
      // Return empty array instead of 404 for graceful fallback
      return NextResponse.json({ urls: [] });
    }

    // List audio files in the directory and filter for valid audio formats
    const files = fs
      .readdirSync(basePath)
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return AUDIO_EXTENSIONS.includes(ext);
      })
      .sort();

    // Convert file names to full public URLs
    // e.g., "kick1.wav" -> "/sounds/drum-kits/rap-trap/kick/kick1.wav"
    const urls = files.map((file) => `/sounds/drum-kits/${genre}/${drumType}/${file}`);

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Error listing drum samples:", error);
    // Return empty array on error to prevent server crash
    return NextResponse.json({ urls: [] });
  }
}
