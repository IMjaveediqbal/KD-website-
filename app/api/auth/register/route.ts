import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { hasTrustedRequestOrigin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    if (!hasTrustedRequestOrigin(request)) {
      return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
    }
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid registration details." }, { status: 400 });

    const { email, password, displayName, username } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username?.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, ...(normalizedUsername ? [{ username: normalizedUsername }] : [])] },
      select: { email: true, username: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: existing.email === normalizedEmail ? "Email is already registered." : "Username is already taken." },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName,
        username: normalizedUsername || undefined,
        profile: { create: { preferredUiLanguage: "en" } },
      },
      select: { id: true, email: true, displayName: true, username: true, role: true },
    });

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Email or username is already in use." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create the account." }, { status: 500 });
  }
}
