import type { Prisma } from "@prisma/client";

type LexicalDraft = {
  kind: "LEXICAL_ENTRY";
  changeReason?: string;
  createdByAdminId?: string;
  content: {
    headword: string;
    normalizedHeadword?: string | null;
    script?: string | null;
    languageCode?: string | null;
    dialect?: string | null;
    region?: string | null;
    senses: Array<{
      senseNumber: number;
      meaningEnglish?: string | null;
      meaningUrdu?: string | null;
      meaningKhowar?: string | null;
      partOfSpeech?: string | null;
      usageNotes?: string | null;
    }>;
  };
};

type SentenceDraft = {
  kind: "CORPUS_SENTENCE";
  changeReason?: string;
  createdByAdminId?: string;
  content: {
    originalText: string;
    normalizedText?: string | null;
    transliteration?: string | null;
    englishTranslation?: string | null;
    urduTranslation?: string | null;
    dialect?: string | null;
    region?: string | null;
    sourceContext?: string | null;
  };
};

export type CuratedDraftInput = LexicalDraft | SentenceDraft;

function validateDraft(input: CuratedDraftInput) {
  if (input.kind === "LEXICAL_ENTRY") {
    if (!input.content.headword.trim()) throw new Error("A lexical headword is required.");
    if (input.content.senses.length === 0) throw new Error("At least one lexical sense is required.");
    const senseNumbers = input.content.senses.map((sense) => sense.senseNumber);
    if (senseNumbers.some((number) => !Number.isInteger(number) || number < 1) ||
        new Set(senseNumbers).size !== senseNumbers.length) {
      throw new Error("Lexical sense numbers must be unique positive integers.");
    }
    return;
  }
  if (!input.content.originalText.trim()) throw new Error("Original corpus sentence text is required.");
}

function revisionContent(input: CuratedDraftInput) {
  if (input.kind === "LEXICAL_ENTRY") {
    return {
      lexicalEntry: {
        create: {
          ...input.content,
          senses: { create: input.content.senses },
        },
      },
    };
  }
  return { corpusSentence: { create: input.content } };
}

/** Create a new stable record and its first draft revision atomically. */
export async function createCuratedDraft(
  tx: Prisma.TransactionClient,
  input: CuratedDraftInput,
) {
  validateDraft(input);
  const record = await tx.curatedRecord.create({
    data: { kind: input.kind, status: "DRAFT" },
    select: { id: true, kind: true, status: true },
  });
  const revision = await tx.curatedRevision.create({
    data: {
      recordId: record.id,
      revisionNumber: 1,
      changeReason: input.changeReason,
      createdByAdminId: input.createdByAdminId,
      ...revisionContent(input),
    },
    select: { id: true, recordId: true, revisionNumber: true, createdAt: true },
  });
  return { record, revision };
}

export type NewRevisionResult =
  | { kind: "missing" }
  | { kind: "archived" }
  | { kind: "type_mismatch" }
  | { kind: "created"; revision: { id: string; recordId: string; revisionNumber: number; createdAt: Date } };

/** Add a new numbered draft; approved revision content is never edited in place. */
export async function createNextCuratedRevision(
  tx: Prisma.TransactionClient,
  input: CuratedDraftInput & { recordId: string },
): Promise<NewRevisionResult> {
  const record = await tx.curatedRecord.findUnique({
    where: { id: input.recordId },
    select: { id: true, kind: true, status: true },
  });
  if (!record) return { kind: "missing" };
  if (record.status === "ARCHIVED") return { kind: "archived" };
  if (record.kind !== input.kind) return { kind: "type_mismatch" };
  validateDraft(input);

  // Serialize revision-number allocation per record inside the caller's transaction.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${record.id}, 0))`;
  const latest = await tx.curatedRevision.aggregate({
    where: { recordId: record.id },
    _max: { revisionNumber: true },
  });
  const revision = await tx.curatedRevision.create({
    data: {
      recordId: record.id,
      revisionNumber: (latest._max.revisionNumber ?? 0) + 1,
      changeReason: input.changeReason,
      createdByAdminId: input.createdByAdminId,
      ...revisionContent(input),
    },
    select: { id: true, recordId: true, revisionNumber: true, createdAt: true },
  });
  await tx.curatedRecord.update({
    where: { id: record.id },
    data: { status: "IN_REVIEW" },
  });
  return { kind: "created", revision };
}

export type ApproveRevisionResult =
  | { kind: "missing" }
  | { kind: "archived" }
  | { kind: "already_approved" }
  | { kind: "invalid_content" }
  | { kind: "conflict" }
  | { kind: "approved" };

/** Approve a complete typed revision and write its audit event in the same transaction. */
export async function approveCuratedRevision(
  tx: Prisma.TransactionClient,
  input: { revisionId: string; adminId: string },
): Promise<ApproveRevisionResult> {
  const revision = await tx.curatedRevision.findUnique({
    where: { id: input.revisionId },
    include: {
      record: { select: { id: true, kind: true, status: true } },
      lexicalEntry: { select: { id: true, _count: { select: { senses: true } } } },
      corpusSentence: { select: { id: true, originalText: true } },
    },
  });
  if (!revision) return { kind: "missing" };
  if (revision.record.status === "ARCHIVED") return { kind: "archived" };
  if (revision.approvedAt) return { kind: "already_approved" };

  const hasValidContent =
    revision.record.kind === "LEXICAL_ENTRY"
      ? Boolean(revision.lexicalEntry && revision.lexicalEntry._count.senses > 0)
      : Boolean(revision.corpusSentence?.originalText.trim());
  if (!hasValidContent) return { kind: "invalid_content" };

  const updated = await tx.curatedRevision.updateMany({
    where: { id: revision.id, approvedAt: null },
    data: { approvedAt: new Date(), approvedByAdminId: input.adminId },
  });
  if (updated.count !== 1) return { kind: "conflict" };

  await tx.curatedRecord.update({
    where: { id: revision.record.id },
    data: { status: "APPROVED" },
  });
  await tx.adminAuditLog.create({
    data: {
      adminId: input.adminId,
      action: "CURATED_REVISION_APPROVED",
      targetType: "CuratedRevision",
      targetId: revision.id,
      metadata: {
        recordId: revision.record.id,
        revisionNumber: revision.revisionNumber,
        kind: revision.record.kind,
      },
    },
  });
  return { kind: "approved" };
}
