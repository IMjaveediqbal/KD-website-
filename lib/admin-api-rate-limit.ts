import { NextResponse } from "next/server";
import { AuthRateLimitUnavailableError, consumeAuthRateLimit } from "@/lib/auth-rate-limit";

/**
 * Per-administrator, per-action, per-client-address throttling for privileged
 * API work. The shared limiter stores only an HMAC-derived bucket key.
 */
export async function checkAdminApiRateLimit(
  request: Request,
  adminId: string,
  action: string,
): Promise<NextResponse | null> {
  try {
    const result = await consumeAuthRateLimit({
      scope: `admin-api:${action}:${adminId}`,
      request,
      maxAttempts: 30,
      windowMs: 60_000,
      blockMs: 60_000,
    });

    if (result.allowed) return null;
    return NextResponse.json(
      { error: "Too many administrator requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      },
    );
  } catch (error) {
    if (error instanceof AuthRateLimitUnavailableError) {
      return NextResponse.json(
        { error: "Administrator request protection is temporarily unavailable." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Administrator request protection is temporarily unavailable." },
      { status: 503 },
    );
  }
}
