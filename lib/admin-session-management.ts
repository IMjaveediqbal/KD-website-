import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

type AdminSessionStore = Pick<PrismaClient, "adminSession">;

/**
 * Revoke the browser's opaque admin-session token without ever storing or
 * querying the raw token. Repeated calls are intentionally idempotent.
 */
export async function revokeAdminSession(store: AdminSessionStore, token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return store.adminSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
