/**
 * Same-origin protection for browser endpoints that create or mutate
 * cookie-authenticated sessions.
 *
 * Development follows the request's actual origin (including its port).
 * Production requires explicit exact origins via APP_BASE_URL and/or
 * APP_ALLOWED_ORIGINS. Do not derive trust from arbitrary forwarded headers.
 */
export function hasTrustedRequestOrigin(request: Request): boolean {
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
        if (
          (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
          parsed.username ||
          parsed.password
        ) {
          return false;
        }
        allowedOrigins.add(parsed.origin);
      }
    } catch {
      return false;
    }
    return allowedOrigins.has(suppliedOrigin);
  }

  return process.env.NODE_ENV !== "production" && suppliedOrigin === requestOrigin;
}
