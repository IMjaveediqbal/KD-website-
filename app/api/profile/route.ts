import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile data." }, { status: 400 });

  const data = parsed.data;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (data.username !== undefined && data.username !== user.username) {
        const taken = await tx.user.findFirst({ where: { username: data.username ?? undefined, id: { not: user.id } } });
        if (taken) throw new Error("USERNAME_TAKEN");
      }
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          displayName: data.displayName,
          username: data.username === undefined ? undefined : data.username,
        },
      });
      const { displayName, username, ...profileData } = data;
      await tx.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...profileData },
        update: profileData,
      });
      return tx.user.findUnique({ where: { id: updatedUser.id }, include: { profile: true } });
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}
