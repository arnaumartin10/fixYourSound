import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (process.env.NODE_ENV === "production") {
  console.log("[Supabase] URL:", supabaseUrl ? "set" : "MISSING");
  console.log("[Supabase] Key:", supabaseKey ? "set" : "MISSING");
}

if (!supabaseUrl || !supabaseKey) {
  console.error("[Supabase] ERROR - URL:", supabaseUrl, "Key:", supabaseKey);
}

export const createClient = async () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key not set in environment variables");
  }
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    },
  );
};
