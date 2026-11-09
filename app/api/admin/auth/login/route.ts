import { createHmac, randomUUID } from "node:crypto";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { createAdminSession } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { adminLoginSchema } from "@/lib/admin-validation";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const DUMMY_PASSWORD_HASH = hash("not-a-real-admin-password", 12);

function throttleKey(email: string, clientAddress: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes.");
  }
  return createHmac("sha256", secret)
    .update(`admin-login:${email}:${clientAddress}`)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedRequestOrigin(request)) {
      return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
    }

    const parsed = adminLoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
    }

    // The ingress proxy must overwrite X-Forwarded-For; this value is only
    // used inside an HMAC bucket key and is never trusted for authorization.
    const forwarded = request.headers.get("x-forwarded-for");
    const clientAddress =
      (forwarded ? forwarded.split(",").at(-1)?.trim() : null) ||
      request.headers.get("x-real-ip")?.trim() ||
      "unknown";
    const email = parsed.data.email;
    const key = throttleKey(email, clientAddress);
    const now = new Date();

    const throttle = await prisma.adminLoginThrottle.findUnique({
      where: { identifierHash: key },
    });
    if (throttle?.blockedUntil && throttle.blockedUntil > now) {
      return NextResponse.json(
        { error: "Too many unsuccessful attempts. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((throttle.blockedUntil.getTime() - now.getTime()) / 1000)),
            ),
          },
        },
      );
    }

    const admin = await prisma.adminAccount.findUnique({ where: { email } });
    const passwordHash = admin?.passwordHash ?? (await DUMMY_PASSWORD_HASH);
    const passwordMatches = await compare(parsed.data.password, passwordHash);
    const valid = Boolean(admin && admin.status === "ACTIVE" && passwordMatches);

    if (!valid || !admin) {
      // Upsert is atomic for a given unique HMAC key. Concurrent failures
      // cannot overwrite one another's counter with a stale read.
      const rows = await prisma.$queryRaw<Array<{ blockedUntil: Date | null }>>`
        INSERT INTO "AdminLoginThrottle"
          ("id", "identifierHash", "failures", "windowStartedAt", "blockedUntil", "updatedAt")
        VALUES (
          ${randomUUID()},
          ${key},
          1,
          ${now},
          NULL,
          ${now}
        )
        ON CONFLICT ("identifierHash") DO UPDATE SET
          "failures" = CASE
            WHEN "AdminLoginThrottle"."blockedUntil" IS NOT NULL
              AND "AdminLoginThrottle"."blockedUntil" > ${now}
              THEN "AdminLoginThrottle"."failures"
            WHEN "AdminLoginThrottle"."windowStartedAt" <= ${new Date(now.getTime() - WINDOW_MS)}
              THEN 1
            ELSE "AdminLoginThrottle"."failures" + 1
          END,
          "windowStartedAt" = CASE
            WHEN "AdminLoginThrottle"."blockedUntil" IS NOT NULL
              AND "AdminLoginThrottle"."blockedUntil" > ${now}
              THEN "AdminLoginThrottle"."windowStartedAt"
            WHEN "AdminLoginThrottle"."windowStartedAt" <= ${new Date(now.getTime() - WINDOW_MS)}
              THEN ${now}
            ELSE "AdminLoginThrottle"."windowStartedAt"
          END,
          "blockedUntil" = CASE
            WHEN "AdminLoginThrottle"."blockedUntil" IS NOT NULL
              AND "AdminLoginThrottle"."blockedUntil" > ${now}
              THEN "AdminLoginThrottle"."blockedUntil"
            WHEN "AdminLoginThrottle"."windowStartedAt" <= ${new Date(now.getTime() - WINDOW_MS)}
              THEN NULL
            WHEN "AdminLoginThrottle"."failures" + 1 >= ${MAX_FAILURES}
              THEN ${new Date(now.getTime() + WINDOW_MS)}
            ELSE NULL
          END,
          "updatedAt" = ${now}
        RETURNING "blockedUntil"
      `;

      const activeBlock = rows[0]?.blockedUntil;
      if (activeBlock && activeBlock > now) {
        return NextResponse.json(
          { error: "Too many unsuccessful attempts. Try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.max(1, Math.ceil((activeBlock.getTime() - now.getTime()) / 1000)),
              ),
            },
          },
        );
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
