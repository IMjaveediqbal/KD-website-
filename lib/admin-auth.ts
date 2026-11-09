import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hasTrustedRequestOrigin } from "@/lib/request-security";

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

export function hasTrustedAdminOrigin(request: Request) {
  return hasTrustedRequestOrigin(request);
}
