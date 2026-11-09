import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { recordAdminLoginFailure } from "../lib/admin-login-throttle";

const shouldRun = process.env.RUN_DB_TESTS === "true";

test("admin login throttle atomically blocks after five concurrent failures", { skip: !shouldRun }, async () => {
  const identifierHash = randomUUID().replaceAll("-", "").padEnd(64, "a");
  const now = new Date("2026-11-09T12:00:00.000Z");

  try {
    const results = await Promise.all(
      Array.from({ length: 12 }, () => recordAdminLoginFailure(identifierHash, now)),
    );

    assert.equal(results.filter((result) => result.blockedUntil === null).length, 4);
    assert.equal(results.filter((result) => result.blockedUntil !== null).length, 8);

    const stored = await prisma.adminLoginThrottle.findUnique({
      where: { identifierHash },
    });
    assert.equal(stored?.failures, 5);
    assert.equal(stored?.blockedUntil?.toISOString(), new Date(now.getTime() + 15 * 60 * 1000).toISOString());
  } finally {
    await prisma.adminLoginThrottle.deleteMany({ where: { identifierHash } });
  }
});
