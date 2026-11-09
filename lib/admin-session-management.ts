import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

type AdminSessionStore = Pick<PrismaClient, "adminSession" | "adminAuditLog">;

/**
 * Revoke an opaque admin-session token, then record logout.
 * Revocation deliberately happens before the audit write: an audit-store
 * failure must never leave the browser session usable. Repeated calls are
 * idempotent and do not create duplicate logout events.
 */
export async function revokeAdminSession(
  store: AdminSessionStore,
  token: string,
  adminId?: string,
) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const result = await store.adminSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count > 0 && adminId) {
    await store.adminAuditLog.create({
      data: {
        adminId,
        action: "ADMIN_LOGOUT",
        targetType: "ADMIN_SESSION",
      },
    });
  }

  return result;
}
