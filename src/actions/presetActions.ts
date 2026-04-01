"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function savePreset(name: string, category: string, data: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const preset = await prisma.preset.create({
      data: {
        name,
        category,
        data,
        userId: session.user.id,
      },
    });

    console.log("[savePreset] Success:", preset);
    revalidatePath("/profile");
    return preset;
  } catch (error: any) {
    console.error("[savePreset] Error:", error);
    throw new Error(error.message || "Failed to save preset");
  }
}

export async function deletePreset(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    await prisma.preset.delete({
      where: {
        id,
        userId: session.user.id,
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    console.error("[deletePreset] Error:", error);
    throw new Error(error.message || "Failed to delete preset");
  }
}

export async function updatePreset(id: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const preset = await prisma.preset.update({
      where: {
        id,
        userId: session.user.id,
      },
      data: { name },
    });

    revalidatePath("/profile");
    return preset;
  } catch (error: any) {
    console.error("[updatePreset] Error:", error);
    throw new Error(error.message || "Failed to update preset");
  }
}

export async function updateUserProfile(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
    });

    revalidatePath("/profile");
    return user;
  } catch (error: any) {
    console.error("[updateUserProfile] Error:", error);
    throw new Error(error.message || "Failed to update profile");
  }
}

export async function getPresetById(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const preset = await prisma.preset.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return preset;
  } catch (error: any) {
    console.error("[getPresetById] Error:", error);
    return null;
  }
}
