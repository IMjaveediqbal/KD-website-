import { NextResponse } from "next/server";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { role, status, ...publicUser } = user;
  void role;
  void status;
  return NextResponse.json({ user: publicUser });
}

export async function PATCH(request: Request) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile data." }, { status: 400 });

  const data = parsed.data;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (data.username && data.username !== user.username) {
        const taken = await tx.user.findFirst({
          where: { username: data.username ?? undefined, id: { not: user.id } },
          select: { id: true },
        });
        if (taken) throw new Error("USERNAME_TAKEN");
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          displayName: data.displayName,
          username: data.username === undefined ? undefined : data.username,
        },
        select: { id: true },
      });

      const { displayName, username, ...profileData } = data;
      await tx.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...profileData },
        update: profileData,
      });

      return tx.user.findUniqueOrThrow({
        where: { id: updatedUser.id },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          profile: true,
        },
      });
    });

    const { role, status, ...publicUser } = updated;
    void role;
    void status;
    return NextResponse.json({ user: publicUser });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}
