import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid registration details." }, { status: 400 });

    const { email, password, displayName, username } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, ...(username ? [{ username }] : [])] },
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
        username: username || undefined,
        profile: { create: { preferredUiLanguage: "en" } },
      },
      select: { id: true, email: true, displayName: true, username: true, role: true },
    });

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create the account." }, { status: 500 });
  }
}
