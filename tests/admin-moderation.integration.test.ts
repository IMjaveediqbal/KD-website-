import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { moderateContribution } from "../lib/admin-moderation";

const shouldRun = process.env.RUN_DB_TESTS === "true";

test("admin moderation persists the decision and audit record atomically", { skip: !shouldRun }, async () => {
  const suffix = randomUUID();
  let adminId: string | undefined;
  let userId: string | undefined;
  let contributionId: string | undefined;
  try {
    const admin = await prisma.adminAccount.create({
      data: { email: `moderator-${suffix}@example.test`, passwordHash: "test-only-hash" },
    });
    adminId = admin.id;
    const user = await prisma.user.create({ data: { email: `contributor-${suffix}@example.test` } });
    userId = user.id;
    const contribution = await prisma.contribution.create({
      data: {
        clientId: `moderation-${suffix}`,
        userId,
        type: "TEXT",
        status: "SUBMITTED",
        originalText: "Authentic test contribution",
      },
    });
    contributionId = contribution.id;

    const result = await prisma.$transaction((tx) => moderateContribution(tx, {
      contributionId: contribution!.id,
      adminId: admin!.id,
      decision: "NEEDS_CORRECTION",
      note: "Please add the dialect source.",
    }));

    assert.deepEqual(result, { kind: "updated" });
    const saved = await prisma.contribution.findUniqueOrThrow({ where: { id: contributionId } });
    assert.equal(saved.status, "NEEDS_CORRECTION");
    assert.equal(saved.correctionNote, "Please add the dialect source.");
    assert.equal(saved.validatedAt, null);
    assert.equal(saved.validatedBy, null);

    const audit = await prisma.adminAuditLog.findFirst({
      where: { adminId, targetId: contributionId, action: "CONTRIBUTION_NEEDS_CORRECTION" },
    });
    assert.ok(audit);
    assert.deepEqual(audit.metadata, {
      previousStatus: "SUBMITTED",
      note: "Please add the dialect source.",
    });
  } finally {
    if (contributionId) await prisma.contribution.deleteMany({ where: { id: contributionId } });
    if (adminId) {
      await prisma.adminAuditLog.deleteMany({ where: { adminId } });
      await prisma.adminAccount.deleteMany({ where: { id: adminId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
});

test("a contribution outside the review queue cannot be moderated or audited", { skip: !shouldRun }, async () => {
  const suffix = randomUUID();
  let adminId: string | undefined;
  let userId: string | undefined;
  let contributionId: string | undefined;
  try {
    const admin = await prisma.adminAccount.create({
      data: { email: `moderator-${suffix}@example.test`, passwordHash: "test-only-hash" },
    });
    adminId = admin.id;
    const user = await prisma.user.create({ data: { email: `contributor-${suffix}@example.test` } });
    userId = user.id;
    const contribution = await prisma.contribution.create({
      data: { clientId: `moderation-${suffix}`, userId, type: "TEXT", status: "DRAFT" },
    });
    contributionId = contribution.id;

    const result = await prisma.$transaction((tx) => moderateContribution(tx, {
      contributionId: contribution!.id,
      adminId: admin!.id,
      decision: "VALIDATED",
      note: "",
    }));

    assert.deepEqual(result, { kind: "conflict", status: "DRAFT" });
    assert.equal(await prisma.adminAuditLog.count({ where: { adminId, targetId: contributionId } }), 0);
    assert.equal((await prisma.contribution.findUniqueOrThrow({ where: { id: contributionId } })).status, "DRAFT");
  } finally {
    if (contributionId) await prisma.contribution.deleteMany({ where: { id: contributionId } });
    if (adminId) {
      await prisma.adminAuditLog.deleteMany({ where: { adminId } });
      await prisma.adminAccount.deleteMany({ where: { id: adminId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
});

test("two concurrent moderation decisions cannot both win", { skip: !shouldRun }, async () => {
  const suffix = randomUUID();
  let adminId: string | undefined;
  let userId: string | undefined;
  let contributionId: string | undefined;
  try {
    const admin = await prisma.adminAccount.create({
      data: { email: `moderator-${suffix}@example.test`, passwordHash: "test-only-hash" },
    });
    adminId = admin.id;
    const user = await prisma.user.create({ data: { email: `contributor-${suffix}@example.test` } });
    userId = user.id;
    const contribution = await prisma.contribution.create({
      data: { clientId: `moderation-${suffix}`, userId, type: "TEXT", status: "UNDER_REVIEW" },
    });
    contributionId = contribution.id;

    const decide = (decision: "VALIDATED" | "REJECTED", note: string) =>
      prisma.$transaction((tx) => moderateContribution(tx, {
        contributionId: contribution!.id,
        adminId: admin!.id,
        decision,
        note,
      }));
    const results = await Promise.all([decide("VALIDATED", ""), decide("REJECTED", "Insufficient evidence")]);

    assert.equal(results.filter((result) => result.kind === "updated").length, 1);
    assert.equal(results.filter((result) => result.kind === "conflict").length, 1);
    assert.equal(await prisma.adminAuditLog.count({ where: { adminId, targetId: contributionId } }), 1);
  } finally {
    if (contributionId) await prisma.contribution.deleteMany({ where: { id: contributionId } });
    if (adminId) {
      await prisma.adminAuditLog.deleteMany({ where: { adminId } });
      await prisma.adminAccount.deleteMany({ where: { id: adminId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
});
