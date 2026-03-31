import { auth } from "@/auth";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: presets, error } = await supabase
      .from("presets")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[presets GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch presets" }, { status: 500 });
    }

    return NextResponse.json({ presets });
  } catch (error) {
    console.error("Failed to fetch presets:", error);
    return NextResponse.json({ error: "Failed to fetch presets" }, { status: 500 });
  }
}
