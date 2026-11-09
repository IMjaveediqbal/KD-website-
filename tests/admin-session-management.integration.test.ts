import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { isAdminSessionUsable } from "../lib/access-policy";
import { revokeAdminSession } from "../lib/admin-session-management";

const shouldRun = process.env.RUN_DB_TESTS === "true";

test("admin session persistence enforces expiry, revocation, and disabled-account state", { skip: !shouldRun }, async () => {
  const suffix = randomUUID();
  const activeToken = randomUUID();
  const expiredToken = randomUUID();
  const hash = (token: string) => createHash("sha256").update(token).digest("hex");
  let adminId: string | undefined;

  try {
    const admin = await prisma.adminAccount.create({
      data: { email: `session-admin-${suffix}@example.test`, passwordHash: "test-only-hash" },
    });
    adminId = admin.id;

    await prisma.adminSession.createMany({
      data: [
        {
          tokenHash: hash(activeToken),
          adminId,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        {
          tokenHash: hash(expiredToken),
          adminId,
          expiresAt: new Date(Date.now() - 1000),
        },
      ],
    });

    const activeSession = await prisma.adminSession.findUniqueOrThrow({
      where: { tokenHash: hash(activeToken) },
      include: { admin: { select: { status: true } } },
    });
    const expiredSession = await prisma.adminSession.findUniqueOrThrow({
      where: { tokenHash: hash(expiredToken) },
      include: { admin: { select: { status: true } } },
    });

    assert.equal(isAdminSessionUsable(activeSession), true);
    assert.equal(isAdminSessionUsable(expiredSession), false);

    await prisma.adminAccount.update({ where: { id: adminId }, data: { status: "DISABLED" } });
    const disabledSession = await prisma.adminSession.findUniqueOrThrow({
      where: { tokenHash: hash(activeToken) },
      include: { admin: { select: { status: true } } },
    });
    assert.equal(isAdminSessionUsable(disabledSession), false);

    await prisma.adminAccount.update({ where: { id: adminId }, data: { status: "ACTIVE" } });
    const firstRevocation = await revokeAdminSession(prisma, activeToken, adminId);
    const repeatedRevocation = await revokeAdminSession(prisma, activeToken);
    assert.equal(firstRevocation.count, 1);
    assert.equal(repeatedRevocation.count, 0);
    assert.equal(
      await prisma.adminAuditLog.count({ where: { adminId, action: "ADMIN_LOGOUT", targetType: "ADMIN_SESSION" } }),
      1,
    );

    const revokedSession = await prisma.adminSession.findUniqueOrThrow({
      where: { tokenHash: hash(activeToken) },
      include: { admin: { select: { status: true } } },
    });
    assert.ok(revokedSession.revokedAt);
    assert.equal(isAdminSessionUsable(revokedSession), false);
  } finally {
    if (adminId) {
      await prisma.adminSession.deleteMany({ where: { adminId } });
      await prisma.adminAuditLog.deleteMany({ where: { adminId } });
      await prisma.adminAccount.deleteMany({ where: { id: adminId } });
    }
  }
});
