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

test("admin login throttle keeps an active block and resets after its window", { skip: !shouldRun }, async () => {
  const identifierHash = randomUUID().replaceAll("-", "").padEnd(64, "b");
  const now = new Date("2026-11-09T13:00:00.000Z");
  const blockEnd = new Date(now.getTime() + 15 * 60 * 1000);

  try {
    const attempts = [];
    for (let index = 0; index < 5; index += 1) {
      attempts.push(await recordAdminLoginFailure(identifierHash, now));
    }

    assert.equal(attempts.filter((result) => result.blockedUntil === null).length, 4);
    assert.equal(attempts[4]?.blockedUntil?.toISOString(), blockEnd.toISOString());

    const stillBlocked = await recordAdminLoginFailure(identifierHash, new Date(now.getTime() + 60_000));
    assert.equal(stillBlocked.blockedUntil?.toISOString(), blockEnd.toISOString());

    const afterWindow = await recordAdminLoginFailure(
      identifierHash,
      new Date(now.getTime() + 15 * 60 * 1000 + 1),
    );
    assert.equal(afterWindow.blockedUntil, null);

    const stored = await prisma.adminLoginThrottle.findUnique({
      where: { identifierHash },
    });
    assert.equal(stored?.failures, 1);
    assert.equal(stored?.blockedUntil, null);
  } finally {
    await prisma.adminLoginThrottle.deleteMany({ where: { identifierHash } });
  }
});
