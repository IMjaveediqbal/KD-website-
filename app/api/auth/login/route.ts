import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { AuthRateLimitUnavailableError, consumeAuthRateLimit } from "@/lib/auth-rate-limit";

const DUMMY_PASSWORD_HASH = hash("not-a-real-user-password", 12);

export async function POST(request: Request) {
  try {
    if (!hasTrustedRequestOrigin(request)) {
      return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
    }
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const ipLimit = await consumeAuthRateLimit({ scope: "login:ip", request, maxAttempts: 30, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 });
    const identityLimit = await consumeAuthRateLimit({ scope: `login:email:${normalizedEmail}`, request, maxAttempts: 8, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 });
    const limited = !ipLimit.allowed ? ipLimit : identityLimit;
    if (!ipLimit.allowed || !identityLimit.allowed) {
      return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
    }
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const passwordHash = user?.passwordHash ?? await DUMMY_PASSWORD_HASH;
    const passwordMatches = await compare(parsed.data.password, passwordHash);
    if (!user || !user.passwordHash || user.status !== "ACTIVE" || !passwordMatches) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username },
    });
  } catch (error) {
    if (error instanceof AuthRateLimitUnavailableError) {
      return NextResponse.json({ error: "Sign-in is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
