import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const ADMIN_LOGIN_MAX_FAILURES = 5;

/** Atomically records one failed admin login for an opaque HMAC identifier. */
export async function recordAdminLoginFailure(
  identifierHash: string,
  now = new Date(),
): Promise<{ blockedUntil: Date | null }> {
  const windowStart = new Date(now.getTime() - ADMIN_LOGIN_WINDOW_MS);
  const newBlockUntil = new Date(now.getTime() + ADMIN_LOGIN_WINDOW_MS);
  const rows = await prisma.$queryRaw<Array<{ blockedUntil: Date | null }>>`
    INSERT INTO "AdminLoginThrottle"
      ("id", "identifierHash", "failures", "windowStartedAt", "blockedUntil", "updatedAt")
    VALUES (${randomUUID()}, ${identifierHash}, 1, ${now}, NULL, ${now})
    ON CONFLICT ("identifierHash") DO UPDATE SET
      "failures" = CASE
        WHEN "AdminLoginThrottle"."blockedUntil" IS NOT NULL
          AND "AdminLoginThrottle"."blockedUntil" > ${now}
          THEN "AdminLoginThrottle"."failures"
        WHEN "AdminLoginThrottle"."windowStartedAt" <= ${windowStart}
          THEN 1
        ELSE "AdminLoginThrottle"."failures" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "AdminLoginThrottle"."blockedUntil" IS NOT NULL
          AND "AdminLoginThrottle"."blockedUntil" > ${now}
          THEN "AdminLoginThrottle"."windowStartedAt"
        WHEN "AdminLoginThrottle"."windowStartedAt" <= ${windowStart}
          THEN ${now}
        ELSE "AdminLoginThrottle"."windowStartedAt"
      END,
      "blockedUntil" = CASE
        WHEN "AdminLoginThrottle"."blockedUntil" IS NOT NULL
          AND "AdminLoginThrottle"."blockedUntil" > ${now}
          THEN "AdminLoginThrottle"."blockedUntil"
        WHEN "AdminLoginThrottle"."windowStartedAt" <= ${windowStart}
          THEN NULL
        WHEN "AdminLoginThrottle"."failures" + 1 >= ${ADMIN_LOGIN_MAX_FAILURES}
          THEN ${newBlockUntil}
        ELSE NULL
      END,
      "updatedAt" = ${now}
    RETURNING "blockedUntil"
  `;
  const blockedUntil = rows[0]?.blockedUntil ?? null;
  return { blockedUntil: blockedUntil && blockedUntil > now ? blockedUntil : null };
}
