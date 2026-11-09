import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { changeUserStatus } from "../lib/admin-user-management";

const shouldRun = process.env.RUN_DB_TESTS === "true";

test("suspending a user revokes every session and writes an audit event atomically", { skip: !shouldRun }, async () => {
  const suffix = randomUUID();
  let adminId: string | undefined;
  let userId: string | undefined;
  try {
    const admin = await prisma.adminAccount.create({
      data: { email: `status-admin-${suffix}@example.test`, passwordHash: "test-only-hash" },
    });
    adminId = admin.id;
    const user = await prisma.user.create({
      data: { email: `status-user-${suffix}@example.test` },
    });
    userId = user.id;
    const tokenHashes = [randomUUID(), randomUUID()].map((token) =>
      createHash("sha256").update(token).digest("hex")
    );
    await prisma.session.createMany({
      data: tokenHashes.map((tokenHash) => ({
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })),
    });

    const result = await prisma.$transaction((tx) => changeUserStatus(tx, {
      userId: user.id,
      adminId: admin.id,
      status: "SUSPENDED",
    }));

    assert.deepEqual(result, { kind: "updated" });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status, "SUSPENDED");
    assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
    const audit = await prisma.adminAuditLog.findFirst({
      where: { adminId: admin.id, targetId: user.id, action: "USER_SUSPENDED" },
    });
    assert.ok(audit);
    assert.deepEqual(audit.metadata, {
      previousStatus: "ACTIVE",
      nextStatus: "SUSPENDED",
      email: user.email,
    });

    const restore = await prisma.$transaction((tx) => changeUserStatus(tx, {
      userId: user.id,
      adminId: admin.id,
      status: "ACTIVE",
    }));
    assert.deepEqual(restore, { kind: "updated" });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status, "ACTIVE");
    assert.equal(await prisma.adminAuditLog.count({ where: { adminId: admin.id, targetId: user.id } }), 2);
  } finally {
    if (userId) {
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.adminAuditLog.deleteMany({ where: { targetId: userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    if (adminId) {
      await prisma.adminAuditLog.deleteMany({ where: { adminId } });
      await prisma.adminAccount.deleteMany({ where: { id: adminId } });
    }
  }
});

test("deactivated accounts cannot be restored through the status-management workflow", { skip: !shouldRun }, async () => {
  const suffix = randomUUID();
  let adminId: string | undefined;
  let userId: string | undefined;
  try {
    const admin = await prisma.adminAccount.create({
      data: { email: `status-admin-${suffix}@example.test`, passwordHash: "test-only-hash" },
    });
    adminId = admin.id;
    const user = await prisma.user.create({
      data: { email: `status-user-${suffix}@example.test`, status: "DEACTIVATED" },
    });
    userId = user.id;

    const result = await prisma.$transaction((tx) => changeUserStatus(tx, {
      userId: user.id,
      adminId: admin.id,
      status: "ACTIVE",
    }));

    assert.deepEqual(result, { kind: "deactivated" });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status, "DEACTIVATED");
    assert.equal(await prisma.adminAuditLog.count({ where: { adminId, targetId: user.id } }), 0);
  } finally {
    if (userId) {
      await prisma.adminAuditLog.deleteMany({ where: { targetId: userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    if (adminId) {
      await prisma.adminAuditLog.deleteMany({ where: { adminId } });
      await prisma.adminAccount.deleteMany({ where: { id: adminId } });
    }
  }
});
