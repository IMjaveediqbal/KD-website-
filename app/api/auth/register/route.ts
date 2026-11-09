import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { AuthRateLimitUnavailableError, consumeAuthRateLimit } from "@/lib/auth-rate-limit";

export async function POST(request: Request) {
  try {
    if (!hasTrustedRequestOrigin(request)) {
      return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
    }
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid registration details." }, { status: 400 });

    const { email, password, displayName, username } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const ipLimit = await consumeAuthRateLimit({ scope: "register:ip", request, maxAttempts: 20, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 });
    const identityLimit = await consumeAuthRateLimit({ scope: `register:email:${normalizedEmail}`, request, maxAttempts: 5, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 });
    const limited = !ipLimit.allowed ? ipLimit : identityLimit;
    if (!ipLimit.allowed || !identityLimit.allowed) {
      return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
    }
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
      select: { id: true, email: true, displayName: true, username: true },
    });

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRateLimitUnavailableError) {
      return NextResponse.json({ error: "Sign-up is temporarily unavailable. Please try again later." }, { status: 503 });
    }
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
