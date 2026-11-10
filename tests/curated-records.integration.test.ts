import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import {
  approveCuratedRevision,
  createCuratedDraft,
  createNextCuratedRevision,
} from "../lib/curated-records";

const shouldRun = process.env.RUN_DB_TESTS === "true";

test("curated services approve complete revisions and create new revisions without overwriting history", { skip: !shouldRun }, async () => {
  const suffix = randomUUID();
  let adminId: string | undefined;
  let recordId: string | undefined;
  let revisionIds: string[] = [];

  try {
    const admin = await prisma.adminAccount.create({
      data: {
        email: `curator-${suffix}@example.test`,
        passwordHash: "test-only-hash",
      },
    });
    adminId = admin.id;

    const initial = await prisma.$transaction(async (tx) => {
      const draft = await createCuratedDraft(tx, {
        kind: "LEXICAL_ENTRY",
        createdByAdminId: admin.id,
        changeReason: "Initial reviewed entry",
        content: {
          headword: "initial-headword",
          normalizedHeadword: "initial-headword",
          senses: [{ senseNumber: 1, meaningEnglish: "initial meaning" }],
        },
      });
      const approval = await approveCuratedRevision(tx, {
        revisionId: draft.revision.id,
        adminId: admin.id,
      });
      return { draft, approval };
    });

    recordId = initial.draft.record.id;
    revisionIds.push(initial.draft.revision.id);
    assert.equal(initial.approval.kind, "approved");
    assert.equal(
      (await prisma.adminAuditLog.count({
        where: {
          adminId,
          action: "CURATED_REVISION_APPROVED",
          targetId: initial.draft.revision.id,
        },
      })),
      1,
    );

    const duplicateApproval = await prisma.$transaction((tx) =>
      approveCuratedRevision(tx, { revisionId: initial.draft.revision.id, adminId: admin.id }),
    );
    assert.equal(duplicateApproval.kind, "already_approved");

    const next = await prisma.$transaction((tx) =>
      createNextCuratedRevision(tx, {
        recordId: initial.draft.record.id,
        kind: "LEXICAL_ENTRY",
        createdByAdminId: admin.id,
        changeReason: "Expert correction",
        content: {
          headword: "corrected-headword",
          normalizedHeadword: "corrected-headword",
          senses: [{ senseNumber: 1, meaningEnglish: "corrected meaning" }],
        },
      }),
    );
    assert.equal(next.kind, "created");
    if (next.kind !== "created") return;
    revisionIds.push(next.revision.id);
    assert.equal(next.revision.revisionNumber, 2);

    const previous = await prisma.lexicalEntryRevision.findUniqueOrThrow({
      where: { revisionId: initial.draft.revision.id },
    });
    const latest = await prisma.lexicalEntryRevision.findUniqueOrThrow({
      where: { revisionId: next.revision.id },
    });
    assert.equal(previous.headword, "initial-headword");
    assert.equal(latest.headword, "corrected-headword");

    const concurrentResults = await Promise.all([1, 2].map((n) =>
      prisma.$transaction((tx) =>
        createNextCuratedRevision(tx, {
          recordId: initial.draft.record.id,
          kind: "LEXICAL_ENTRY",
          createdByAdminId: admin.id,
          changeReason: `Concurrent editorial revision ${n}`,
          content: {
            headword: `concurrent-headword-${n}`,
            senses: [{ senseNumber: 1, meaningEnglish: `meaning ${n}` }],
          },
        }),
      ),
    ));
    for (const result of concurrentResults) {
      assert.equal(result.kind, "created");
      if (result.kind === "created") revisionIds.push(result.revision.id);
    }
    const concurrentNumbers = concurrentResults
      .filter((result) => result.kind === "created")
      .map((result) => result.revision.revisionNumber)
      .sort((a, b) => a - b);
    assert.deepEqual(concurrentNumbers, [3, 4]);

    const record = await prisma.curatedRecord.findUniqueOrThrow({ where: { id: recordId } });
    assert.equal(record.status, "IN_REVIEW");
  } finally {
    if (revisionIds.length) {
      await prisma.adminAuditLog.deleteMany({
        where: { targetType: "CuratedRevision", targetId: { in: revisionIds } },
      });
      const entries = await prisma.lexicalEntryRevision.findMany({
        where: { revisionId: { in: revisionIds } },
        select: { id: true },
      });
      await prisma.lexicalSense.deleteMany({
        where: { lexicalEntryRevisionId: { in: entries.map((entry) => entry.id) } },
      });
      await prisma.lexicalEntryRevision.deleteMany({ where: { revisionId: { in: revisionIds } } });
      await prisma.curatedRevision.deleteMany({ where: { id: { in: revisionIds } } });
    }
    if (recordId) {
      await prisma.curatedRecord.deleteMany({ where: { id: recordId } });
    }
    if (adminId) {
      await prisma.adminAuditLog.deleteMany({ where: { adminId } });
      await prisma.adminAccount.delete({ where: { id: adminId } });
    }
  }
});
