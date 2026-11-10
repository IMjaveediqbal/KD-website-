-- Curated audio is a private dataset asset, distinct from source upload intake.
-- Consent is attached to the exact curated asset as well as its source when known.

CREATE TYPE "CuratedAudioStatus" AS ENUM ('PENDING', 'READY', 'QUARANTINED', 'DELETED');

CREATE TABLE "CuratedAudioAsset" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "sourceAudioItemId" TEXT,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "durationSeconds" INTEGER,
  "sizeBytes" BIGINT,
  "checksum" TEXT,
  "status" "CuratedAudioStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CuratedAudioAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ConsentEvent" ADD COLUMN "curatedAudioAssetId" TEXT;

ALTER TABLE "ConsentEvent"
  DROP CONSTRAINT "ConsentEvent_subject_check",
  ADD CONSTRAINT "ConsentEvent_subject_check" CHECK (
    "userId" IS NOT NULL OR
    "contributionId" IS NOT NULL OR
    "audioItemId" IS NOT NULL OR
    "curatedAudioAssetId" IS NOT NULL
  );

CREATE UNIQUE INDEX "CuratedAudioAsset_storageKey_key" ON "CuratedAudioAsset"("storageKey");
CREATE INDEX "CuratedAudioAsset_revisionId_status_idx" ON "CuratedAudioAsset"("revisionId", "status");
CREATE INDEX "CuratedAudioAsset_sourceAudioItemId_idx" ON "CuratedAudioAsset"("sourceAudioItemId");
CREATE INDEX "ConsentEvent_curatedAudioAssetId_purpose_occurredAt_idx"
  ON "ConsentEvent"("curatedAudioAssetId", "purpose", "occurredAt");

ALTER TABLE "CuratedAudioAsset"
  ADD CONSTRAINT "CuratedAudioAsset_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "CuratedRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CuratedAudioAsset_sourceAudioItemId_fkey"
  FOREIGN KEY ("sourceAudioItemId") REFERENCES "AudioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConsentEvent"
  ADD CONSTRAINT "ConsentEvent_curatedAudioAssetId_fkey"
  FOREIGN KEY ("curatedAudioAssetId") REFERENCES "CuratedAudioAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
