import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { checkAdminApiRateLimit } from "../lib/admin-api-rate-limit";

const shouldRun = process.env.RUN_DB_TESTS === "true";
process.env.AUTH_SECRET ??= "integration-test-secret-that-is-at-least-32-bytes";

test("admin API limiter blocks concurrent excess requests and isolates actions", { skip: !shouldRun }, async () => {
  const adminId = randomUUID();
  const action = `integration-${randomUUID()}`;
  const address = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  const request = new Request("http://localhost/api/admin/test", {
    headers: { "x-forwarded-for": address },
  });
  const scope = `admin-api:${action}:${adminId}`;
  const secret = process.env.AUTH_SECRET!;
  const bucketKey = createHmac("sha256", secret).update(`${scope}:ip:${address}`).digest("hex");

  try {
    const results = await Promise.all(
      Array.from({ length: 32 }, () => checkAdminApiRateLimit(request, adminId, action)),
    );
    assert.equal(results.filter((result) => result === null).length, 30);
    const blocked = results.filter((result) => result !== null);
    assert.equal(blocked.length, 2);
    assert.ok(blocked.every((result) => result?.status === 429));

    const otherAction = await checkAdminApiRateLimit(request, adminId, `${action}-other`);
    assert.equal(otherAction, null);
  } finally {
    await prisma.authRateLimitBucket.deleteMany({ where: { key: bucketKey } });
  }
});
