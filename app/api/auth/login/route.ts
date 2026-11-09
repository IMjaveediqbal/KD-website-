import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { hasTrustedRequestOrigin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    if (!hasTrustedRequestOrigin(request)) {
      return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
    }
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const passwordHash = user?.passwordHash ?? await DUMMY_PASSWORD_HASH;
    const passwordMatches = await compare(parsed.data.password, passwordHash);
    if (!user || !user.passwordHash || user.status !== "ACTIVE" || !passwordMatches) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, role: user.role },
    });
  } catch {
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
