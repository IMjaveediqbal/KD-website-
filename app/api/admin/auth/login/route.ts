import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAdminSession } from "@/lib/admin-auth";
import { adminLoginSchema } from "@/lib/admin-validation";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const DUMMY_PASSWORD_HASH = hash("not-a-real-admin-password", 12);

function throttleKey(email: string, clientAddress: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required.");
  return createHash("sha256").update(`${secret}:${email}:${clientAddress}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const appBaseUrl = process.env.APP_BASE_URL;
    if (!appBaseUrl) return NextResponse.json({ error: "Authentication is not configured." }, { status: 500 });

    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).origin !== new URL(appBaseUrl).origin) {
      return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
    }

    const parsed = adminLoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
    }

    // In production, the hosting proxy must overwrite/append these headers rather than pass client values through.
    const forwarded = request.headers.get("x-forwarded-for");
    const clientAddress = (forwarded ? forwarded.split(",").at(-1)?.trim() : null)
      || request.headers.get("x-real-ip")
      || "unknown";
    const email = parsed.data.email;
    const key = throttleKey(email, clientAddress);
    const now = new Date();
    let throttle = await prisma.adminLoginThrottle.findUnique({ where: { identifierHash: key } });

    if (throttle?.blockedUntil && throttle.blockedUntil > now) {
      return NextResponse.json(
        { error: "Too many unsuccessful attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((throttle.blockedUntil.getTime() - now.getTime()) / 1000))) } }
      );
    }

    if (throttle && now.getTime() - throttle.windowStartedAt.getTime() >= WINDOW_MS) {
      throttle = await prisma.adminLoginThrottle.update({
        where: { identifierHash: key },
        data: { failures: 0, windowStartedAt: now, blockedUntil: null },
      });
    }

    const admin = await prisma.adminAccount.findUnique({ where: { email } });
    const passwordHash = admin?.passwordHash ?? await DUMMY_PASSWORD_HASH;
    const passwordMatches = await compare(parsed.data.password, passwordHash);
    const valid = Boolean(admin && admin.status === "ACTIVE" && passwordMatches);

    if (!valid || !admin) {
      if (!throttle) {
        await prisma.adminLoginThrottle.create({
          data: { identifierHash: key, failures: 1, windowStartedAt: now },
        });
      } else {
        const failures = throttle.failures + 1;
        await prisma.adminLoginThrottle.update({
          where: { identifierHash: key },
          data: {
            failures,
            blockedUntil: failures >= MAX_FAILURES ? new Date(now.getTime() + WINDOW_MS) : null,
          },
        });
      }
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await prisma.adminLoginThrottle.deleteMany({ where: { identifierHash: key } });
    await prisma.adminAccount.update({
      where: { id: admin.id },
      data: { lastLoginAt: now },
    });
    await createAdminSession(admin.id);
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: "ADMIN_LOGIN",
        targetType: "ADMIN_SESSION",
        metadata: { method: "password" },
      },
    });

    return NextResponse.json({
      admin: { id: admin.id, email: admin.email, displayName: admin.displayName },
    });
  } catch {
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
