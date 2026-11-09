import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export class AuthRateLimitUnavailableError extends Error {
  constructor() {
    super("Authentication rate limiting is unavailable.");
    this.name = "AuthRateLimitUnavailableError";
  }
}

function getClientAddress(request: Request): string {
  // Configure the ingress proxy to overwrite X-Forwarded-For. Never use this
  // value for authorization; it is only an input to a keyed, one-way bucket ID.
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwardedAddress = forwarded?.split(",")[0]?.trim();
  return firstForwardedAddress || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function createBucketKey(scope: string, request: Request): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new AuthRateLimitUnavailableError();
  return createHmac("sha256", secret)
    .update(`${scope}:ip:${getClientAddress(request)}`)
    .digest("hex");
}

/** Atomically increments a database bucket without storing raw email/IP values. */
export async function consumeAuthRateLimit(input: {
  scope: string;
  request: Request;
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const key = createBucketKey(input.scope, input.request);
  const now = new Date();
  const windowStart = new Date(now.getTime() - input.windowMs);
  const blockedUntil = new Date(now.getTime() + input.blockMs);
  try {
    const rows = await prisma.$queryRaw<Array<{ attempts: number; blockedUntil: Date | null }>>\u0060
      INSERT INTO "AuthRateLimitBucket" AS bucket
        ("id", "key", "attempts", "windowStartedAt", "blockedUntil", "updatedAt")
      VALUES (${randomUUID()}, ${key}, 1, ${now}, NULL, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE
          WHEN bucket."blockedUntil" IS NOT NULL AND bucket."blockedUntil" > ${now} THEN bucket."attempts"
          WHEN bucket."windowStartedAt" <= ${windowStart} THEN 1
          ELSE bucket."attempts" + 1
        END,
        "windowStartedAt" = CASE
          WHEN bucket."blockedUntil" IS NOT NULL AND bucket."blockedUntil" > ${now} THEN bucket."windowStartedAt"
          WHEN bucket."windowStartedAt" <= ${windowStart} THEN ${now}
          ELSE bucket."windowStartedAt"
        END,
        "blockedUntil" = CASE
          WHEN bucket."blockedUntil" IS NOT NULL AND bucket."blockedUntil" > ${now} THEN bucket."blockedUntil"
          WHEN bucket."windowStartedAt" <= ${windowStart} THEN NULL
          WHEN bucket."attempts" + 1 > ${input.maxAttempts} THEN ${blockedUntil}
          ELSE NULL
        END,
        "updatedAt" = ${now}
      RETURNING "attempts", "blockedUntil"
    `;
    const result = rows[0];
    if (!result) throw new Error("Rate-limit bucket did not return a row.");
    const activeBlock = result.blockedUntil && result.blockedUntil > now ? result.blockedUntil : null;
    return {
      allowed: activeBlock === null,
      retryAfterSeconds: activeBlock ? Math.max(1, Math.ceil((activeBlock.getTime() - now.getTime()) / 1000)) : 0,
    };
  } catch {
    throw new AuthRateLimitUnavailableError();
  }
}
