"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function savePreset(name: string, category: string, data: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  console.log("[savePreset] User ID from session:", session.user.id);

  try {
    const preset = await prisma.preset.create({
      data: {
        name,
        category,
        data,
        userId: session.user.id
      }
    });
    return preset;
  } catch (error) {
    console.error("[savePreset] Error:", error);
    throw error;
  }
}

export async function deletePreset(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.preset.delete({
    where: { 
      id,
      userId: session.user.id // ensure they own it
    }
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function updatePreset(id: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const preset = await prisma.preset.update({
    where: { 
      id,
      userId: session.user.id
    },
    data: { name }
  });

  revalidatePath("/profile");
  return preset;
}

export async function updateUserProfile(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name }
  });

  revalidatePath("/profile");
  return user;
}

export async function getPresetById(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const preset = await prisma.preset.findFirst({
    where: { 
      id,
      userId: session.user.id
    }
  });

  return preset;
}
