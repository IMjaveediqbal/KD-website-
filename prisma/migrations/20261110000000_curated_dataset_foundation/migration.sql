-- Add a separate curated dataset domain without altering or backfilling
-- existing Contribution and AudioItem source-submission records.

CREATE TYPE "CuratedRecordKind" AS ENUM ('LEXICAL_ENTRY', 'CORPUS_SENTENCE');
CREATE TYPE "CuratedRecordStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');
CREATE TYPE "ConsentPurpose" AS ENUM ('AUDIO_RECORDING', 'RESEARCH', 'MODEL_TRAINING', 'DATASET_DISTRIBUTION');
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'REVOKED');
CREATE TYPE "DatasetReleaseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'WITHDRAWN');

CREATE TABLE "CuratedRecord" (
  "id" TEXT NOT NULL,
  "kind" "CuratedRecordKind" NOT NULL,
  "status" "CuratedRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CuratedRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CuratedRevision" (
  "id" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "changeReason" TEXT,
  "createdByAdminId" TEXT,
  "approvedByAdminId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CuratedRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LexicalEntryRevision" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "headword" TEXT NOT NULL,
  "normalizedHeadword" TEXT,
  "script" TEXT,
  "languageCode" TEXT,
  "dialect" TEXT,
  "region" TEXT,
  CONSTRAINT "LexicalEntryRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LexicalSense" (
  "id" TEXT NOT NULL,
  "lexicalEntryRevisionId" TEXT NOT NULL,
  "senseNumber" INTEGER NOT NULL,
  "meaningEnglish" TEXT,
  "meaningUrdu" TEXT,
  "meaningKhowar" TEXT,
  "partOfSpeech" TEXT,
  "usageNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LexicalSense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CorpusSentenceRevision" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "originalText" TEXT NOT NULL,
  "normalizedText" TEXT,
  "transliteration" TEXT,
  "englishTranslation" TEXT,
  "urduTranslation" TEXT,
  "dialect" TEXT,
  "region" TEXT,
  "sourceContext" TEXT,
  CONSTRAINT "CorpusSentenceRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContributionEvidence" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "contributionId" TEXT NOT NULL,
  "evidenceRole" TEXT NOT NULL DEFAULT 'SUPPORTING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContributionEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceReference" (
  "id" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "attribution" TEXT,
  "stableReference" TEXT,
  "license" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceReference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RevisionSourceReference" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "sourceReferenceId" TEXT NOT NULL,
  "locator" TEXT,
  "notes" TEXT,
  CONSTRAINT "RevisionSourceReference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsentEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "contributionId" TEXT,
  "audioItemId" TEXT,
  "purpose" "ConsentPurpose" NOT NULL,
  "action" "ConsentAction" NOT NULL,
  "scope" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConsentEvent_subject_check" CHECK (
    "userId" IS NOT NULL OR "contributionId" IS NOT NULL OR "audioItemId" IS NOT NULL
  )
);

CREATE TABLE "DatasetRelease" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" "DatasetReleaseStatus" NOT NULL DEFAULT 'DRAFT',
  "schemaVersion" TEXT NOT NULL,
  "manifest" JSONB,
  "checksum" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "DatasetRelease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DatasetReleaseItem" (
  "id" TEXT NOT NULL,
  "releaseId" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DatasetReleaseItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CuratedRecord_kind_status_updatedAt_idx" ON "CuratedRecord"("kind", "status", "updatedAt");
CREATE UNIQUE INDEX "CuratedRevision_recordId_revisionNumber_key" ON "CuratedRevision"("recordId", "revisionNumber");
CREATE INDEX "CuratedRevision_recordId_createdAt_idx" ON "CuratedRevision"("recordId", "createdAt");
CREATE INDEX "CuratedRevision_approvedAt_idx" ON "CuratedRevision"("approvedAt");
CREATE UNIQUE INDEX "LexicalEntryRevision_revisionId_key" ON "LexicalEntryRevision"("revisionId");
CREATE INDEX "LexicalEntryRevision_normalizedHeadword_idx" ON "LexicalEntryRevision"("normalizedHeadword");
CREATE INDEX "LexicalEntryRevision_dialect_region_idx" ON "LexicalEntryRevision"("dialect", "region");
CREATE UNIQUE INDEX "LexicalSense_lexicalEntryRevisionId_senseNumber_key" ON "LexicalSense"("lexicalEntryRevisionId", "senseNumber");
CREATE UNIQUE INDEX "CorpusSentenceRevision_revisionId_key" ON "CorpusSentenceRevision"("revisionId");
CREATE INDEX "CorpusSentenceRevision_normalizedText_idx" ON "CorpusSentenceRevision"("normalizedText");
CREATE INDEX "CorpusSentenceRevision_dialect_region_idx" ON "CorpusSentenceRevision"("dialect", "region");
CREATE UNIQUE INDEX "ContributionEvidence_revisionId_contributionId_key" ON "ContributionEvidence"("revisionId", "contributionId");
CREATE INDEX "ContributionEvidence_contributionId_idx" ON "ContributionEvidence"("contributionId");
CREATE UNIQUE INDEX "SourceReference_sourceType_stableReference_key" ON "SourceReference"("sourceType", "stableReference");
CREATE UNIQUE INDEX "RevisionSourceReference_revisionId_sourceReferenceId_key" ON "RevisionSourceReference"("revisionId", "sourceReferenceId");
CREATE INDEX "RevisionSourceReference_sourceReferenceId_idx" ON "RevisionSourceReference"("sourceReferenceId");
CREATE INDEX "ConsentEvent_userId_purpose_occurredAt_idx" ON "ConsentEvent"("userId", "purpose", "occurredAt");
CREATE INDEX "ConsentEvent_contributionId_purpose_occurredAt_idx" ON "ConsentEvent"("contributionId", "purpose", "occurredAt");
CREATE INDEX "ConsentEvent_audioItemId_purpose_occurredAt_idx" ON "ConsentEvent"("audioItemId", "purpose", "occurredAt");
CREATE UNIQUE INDEX "DatasetRelease_version_key" ON "DatasetRelease"("version");
CREATE UNIQUE INDEX "DatasetReleaseItem_releaseId_revisionId_key" ON "DatasetReleaseItem"("releaseId", "revisionId");
CREATE INDEX "DatasetReleaseItem_revisionId_idx" ON "DatasetReleaseItem"("revisionId");

ALTER TABLE "CuratedRevision"
  ADD CONSTRAINT "CuratedRevision_recordId_fkey"
  FOREIGN KEY ("recordId") REFERENCES "CuratedRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CuratedRevision_createdByAdminId_fkey"
  FOREIGN KEY ("createdByAdminId") REFERENCES "AdminAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CuratedRevision_approvedByAdminId_fkey"
  FOREIGN KEY ("approvedByAdminId") REFERENCES "AdminAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LexicalEntryRevision"
  ADD CONSTRAINT "LexicalEntryRevision_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "CuratedRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LexicalSense"
  ADD CONSTRAINT "LexicalSense_lexicalEntryRevisionId_fkey"
  FOREIGN KEY ("lexicalEntryRevisionId") REFERENCES "LexicalEntryRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CorpusSentenceRevision"
  ADD CONSTRAINT "CorpusSentenceRevision_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "CuratedRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContributionEvidence"
  ADD CONSTRAINT "ContributionEvidence_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "CuratedRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ContributionEvidence_contributionId_fkey"
  FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RevisionSourceReference"
  ADD CONSTRAINT "RevisionSourceReference_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "CuratedRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RevisionSourceReference_sourceReferenceId_fkey"
  FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConsentEvent"
  ADD CONSTRAINT "ConsentEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ConsentEvent_contributionId_fkey"
  FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ConsentEvent_audioItemId_fkey"
  FOREIGN KEY ("audioItemId") REFERENCES "AudioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DatasetReleaseItem"
  ADD CONSTRAINT "DatasetReleaseItem_releaseId_fkey"
  FOREIGN KEY ("releaseId") REFERENCES "DatasetRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DatasetReleaseItem_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "CuratedRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
