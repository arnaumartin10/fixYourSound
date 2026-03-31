"use server";

import { auth } from "@/auth";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function savePreset(name: string, category: string, data: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: preset, error } = await supabase
    .from("presets")
    .insert({
      name,
      category,
      data,
      user_id: session.user.id
    })
    .select()
    .single();

  if (error) {
    console.error("[savePreset] Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/profile");
  return preset;
}

export async function deletePreset(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { error } = await supabase
    .from("presets")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    console.error("[deletePreset] Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function updatePreset(id: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: preset, error } = await supabase
    .from("presets")
    .update({ name })
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single();

  if (error) {
    console.error("[updatePreset] Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/profile");
  return preset;
}

export async function updateUserProfile(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from("users")
    .update({ name })
    .eq("id", session.user.id)
    .select()
    .single();

  if (error) {
    console.error("[updateUserProfile] Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/profile");
  return user;
}

export async function getPresetById(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: preset, error } = await supabase
    .from("presets")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error) {
    console.error("[getPresetById] Error:", error);
    return null;
  }

  return preset;
}
