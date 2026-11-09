import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { consumeAuthRateLimit } from "../lib/auth-rate-limit";
import { prisma } from "../lib/prisma";

const shouldRun = process.env.RUN_DB_TESTS === "true";
process.env.AUTH_SECRET ??= "integration-test-secret-that-is-at-least-32-bytes";

test("database rate limiter enforces a concurrent per-IP attempt limit", { skip: !shouldRun }, async () => {
  const scope = `test:concurrent:${randomUUID()}`;
  const request = new Request("http://localhost/api/auth/login", {
    headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}` },
  });
  try {
    const results = await Promise.all(Array.from({ length: 12 }, () => consumeAuthRateLimit({
      scope,
      request,
      maxAttempts: 4,
      windowMs: 60_000,
      blockMs: 60_000,
    })));
    assert.equal(results.filter((result) => result.allowed).length, 4);
    assert.equal(results.filter((result) => !result.allowed).length, 8);
    assert.ok(results.filter((result) => !result.allowed).every((result) => result.retryAfterSeconds > 0));
  } finally {
    await prisma.$disconnect();
  }
});
