import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";

const shouldRun = process.env.RUN_DB_TESTS === "true";

test("curated revisions preserve typed content, many-to-many provenance, consent events, and release snapshots", { skip: !shouldRun }, async () => {
  const suffix = randomUUID();
  let userId: string | undefined;
  let recordIds: string[] = [];
  let revisionIds: string[] = [];
  let contributionIds: string[] = [];
  let releaseId: string | undefined;

  try {
    const user = await prisma.user.create({
      data: { email: `curated-${suffix}@example.test` },
    });
    userId = user.id;

    const contributions = await Promise.all([1, 2].map((n) =>
      prisma.contribution.create({
        data: {
          clientId: `curated-${suffix}-${n}`,
          userId: user.id,
          type: n === 1 ? "WORD" : "SENTENCE",
          originalText: n === 1 ? "Khowar source word" : "Khowar source sentence",
        },
      }),
    ));
    contributionIds = contributions.map((item) => item.id);

    const lexicalRecord = await prisma.curatedRecord.create({
      data: { kind: "LEXICAL_ENTRY", status: "APPROVED" },
    });
    const sentenceRecord = await prisma.curatedRecord.create({
      data: { kind: "CORPUS_SENTENCE", status: "APPROVED" },
    });
    recordIds = [lexicalRecord.id, sentenceRecord.id];

    const lexicalRevision = await prisma.curatedRevision.create({
      data: {
        recordId: lexicalRecord.id,
        revisionNumber: 1,
        changeReason: "Initial expert-curated lexical entry",
        approvedAt: new Date(),
        lexicalEntry: {
          create: {
            headword: "test-headword",
            normalizedHeadword: "test-headword",
            languageCode: "khw",
            senses: {
              create: [
                { senseNumber: 1, meaningEnglish: "first verified meaning" },
                { senseNumber: 2, meaningUrdu: "دوسرا مستند مفہوم" },
              ],
            },
          },
        },
      },
    });
    const sentenceRevision = await prisma.curatedRevision.create({
      data: {
        recordId: sentenceRecord.id,
        revisionNumber: 1,
        changeReason: "Initial corpus sentence",
        approvedAt: new Date(),
        corpusSentence: {
          create: {
            originalText: "اصل کھوار جملہ",
            normalizedText: "اصل کھوار جملہ",
          },
        },
      },
    });
    revisionIds = [lexicalRevision.id, sentenceRevision.id];

    await prisma.contributionEvidence.createMany({
      data: [
        { revisionId: lexicalRevision.id, contributionId: contributions[0].id },
        { revisionId: lexicalRevision.id, contributionId: contributions[1].id },
        { revisionId: sentenceRevision.id, contributionId: contributions[0].id },
      ],
    });

    const evidence = await prisma.contributionEvidence.findMany({
      where: { revisionId: lexicalRevision.id },
    });
    assert.equal(evidence.length, 2);
    assert.equal(
      await prisma.contributionEvidence.count({ where: { contributionId: contributions[0].id } }),
      2,
    );

    await prisma.consentEvent.createMany({
      data: [
        {
          userId,
          contributionId: contributions[0].id,
          purpose: "AUDIO_RECORDING",
          action: "GRANTED",
          scope: "This contribution's audio may be recorded",
          policyVersion: "consent-v1",
        },
        {
          userId,
          contributionId: contributions[0].id,
          purpose: "AUDIO_RECORDING",
          action: "REVOKED",
          scope: "Recording permission withdrawn",
          policyVersion: "consent-v1",
        },
        {
          userId,
          contributionId: contributions[0].id,
          purpose: "RESEARCH",
          action: "GRANTED",
          scope: "Non-commercial linguistic research only",
          policyVersion: "consent-v1",
        },
      ],
    });
    assert.equal(
      await prisma.consentEvent.count({
        where: { contributionId: contributions[0].id, purpose: "AUDIO_RECORDING" },
      }),
      2,
    );
    assert.equal(
      await prisma.consentEvent.count({
        where: { contributionId: contributions[0].id, purpose: "RESEARCH", action: "GRANTED" },
      }),
      1,
    );

    const release = await prisma.datasetRelease.create({
      data: {
        version: `test-${suffix}`,
        schemaVersion: "1.0.0",
        status: "PUBLISHED",
        publishedAt: new Date(),
        items: {
          create: revisionIds.map((revisionId) => ({ revisionId })),
        },
      },
      include: { items: true },
    });
    releaseId = release.id;
    assert.equal(release.items.length, 2);
    assert.deepEqual(
      new Set(release.items.map((item) => item.revisionId)),
      new Set(revisionIds),
    );
  } finally {
    if (releaseId) {
      await prisma.datasetReleaseItem.deleteMany({ where: { releaseId } });
      await prisma.datasetRelease.deleteMany({ where: { id: releaseId } });
    }
    if (revisionIds.length) {
      await prisma.contributionEvidence.deleteMany({ where: { revisionId: { in: revisionIds } } });
      await prisma.revisionSourceReference.deleteMany({ where: { revisionId: { in: revisionIds } } });
      const lexicalEntries = await prisma.lexicalEntryRevision.findMany({
        where: { revisionId: { in: revisionIds } },
        select: { id: true },
      });
      await prisma.lexicalSense.deleteMany({
        where: { lexicalEntryRevisionId: { in: lexicalEntries.map((entry) => entry.id) } },
      });
      await prisma.lexicalEntryRevision.deleteMany({ where: { revisionId: { in: revisionIds } } });
      await prisma.corpusSentenceRevision.deleteMany({ where: { revisionId: { in: revisionIds } } });
      await prisma.curatedRevision.deleteMany({ where: { id: { in: revisionIds } } });
    }
    if (recordIds.length) {
      await prisma.curatedRecord.deleteMany({ where: { id: { in: recordIds } } });
    }
    if (contributionIds.length) {
      await prisma.consentEvent.deleteMany({ where: { contributionId: { in: contributionIds } } });
      await prisma.contribution.deleteMany({ where: { id: { in: contributionIds } } });
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
  }
});
