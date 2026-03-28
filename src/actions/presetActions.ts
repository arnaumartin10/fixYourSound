"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function savePreset(name: string, category: string, data: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const preset = await prisma.preset.create({
    data: {
      name,
      category,
      data,
      userId: session.user.id
    }
  });

  revalidatePath("/profile");
  return preset;
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
