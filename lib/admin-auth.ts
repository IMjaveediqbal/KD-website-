import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const ADMIN_SESSION_COOKIE = "kd_admin_session";
const ADMIN_SESSION_HOURS = 8;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(adminId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: { tokenHash: hashToken(token), adminId, expiresAt },
  });

  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await prisma.adminSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(ADMIN_SESSION_COOKIE);
}

export async function getCurrentAdmin() {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.admin.status !== "ACTIVE") {
    if (session && !session.revokedAt) {
      await prisma.adminSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }
    store.delete(ADMIN_SESSION_COOKIE);
    return null;
  }

  return {
    id: session.admin.id,
    email: session.admin.email,
    displayName: session.admin.displayName,
  };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("ADMIN_UNAUTHENTICATED");
  return admin;
}

/**
 * Trust exact origins only. In local development, the request URL supplies the
 * active host and port, so changing the Next.js port needs no code change.
 * In production, configure APP_BASE_URL and/or APP_ALLOWED_ORIGINS explicitly;
 * never trust an arbitrary Host or forwarded-host header as an allow-list.
 */
export function hasTrustedAdminOrigin(request: Request) {
  const requestOrigin = (() => {
    try {
      return new URL(request.url).origin;
    } catch {
      return null;
    }
  })();
  const originHeader = request.headers.get("origin");
  if (!requestOrigin || !originHeader) return false;

  let suppliedOrigin: string;
  try {
    const parsed = new URL(originHeader);
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
      parsed.username ||
      parsed.password ||
      parsed.origin !== originHeader
    ) {
      return false;
    }
    suppliedOrigin = parsed.origin;
  } catch {
    return false;
  }

  const configuredValues = [
    process.env.APP_BASE_URL,
    ...(process.env.APP_ALLOWED_ORIGINS ?? "").split(","),
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value));

  if (configuredValues.length > 0) {
    const allowedOrigins = new Set<string>();
    try {
      for (const value of configuredValues) {
        const parsed = new URL(value);
        if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username || parsed.password) {
          return false;
        }
        allowedOrigins.add(parsed.origin);
      }
    } catch {
      return false;
    }
    return allowedOrigins.has(suppliedOrigin);
  }

  // A production deployment must declare its public origin(s) explicitly.
  return process.env.NODE_ENV !== "production" && suppliedOrigin === requestOrigin;
}
