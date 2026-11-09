-- Initial PostgreSQL schema for the Khowar Dataset platform.
-- This migration intentionally contains the pre-admin application schema.
-- Existing databases must be inspected and baselined with prisma migrate resolve;
-- do not apply this migration blindly to a database that already has these tables.

CREATE TYPE "Role" AS ENUM ('CONTRIBUTOR', 'VALIDATOR', 'RESEARCHER', 'EXPERT', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE "ContributionStatus" AS ENUM (
  'DRAFT',
  'QUEUED',
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_CORRECTION',
  'EXPERT_REVIEW',
  'VALIDATED',
  'REJECTED',
  'DUPLICATE',
  'ARCHIVED',
  'REVISION_PENDING'
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "username" TEXT,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "role" "Role" NOT NULL DEFAULT 'CONTRIBUTOR',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "emailVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Profile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bio" TEXT,
  "preferredUiLanguage" TEXT NOT NULL DEFAULT 'en',
  "dialect" TEXT,
  "region" TEXT,
  "district" TEXT,
  "village" TEXT,
  "languages" JSONB,
  "contributorType" TEXT,
  "profileVisibility" JSONB,
  "audioConsent" BOOLEAN NOT NULL DEFAULT false,
  "researchConsent" BOOLEAN NOT NULL DEFAULT false,
  "modelTrainingConsent" BOOLEAN NOT NULL DEFAULT false,
  "datasetLicense" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contribution" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "ContributionStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT,
  "originalText" TEXT,
  "normalizedText" TEXT,
  "transliteration" TEXT,
  "englishTranslation" TEXT,
  "urduTranslation" TEXT,
  "dialect" TEXT,
  "region" TEXT,
  "sourceType" TEXT,
  "sourceDescription" TEXT,
  "license" TEXT,
  "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
  "aiAssistanceDescription" TEXT,
  "submittedAt" TIMESTAMP(3),
  "validatedAt" TIMESTAMP(3),
  "validatedBy" TEXT,
  "rejectionReason" TEXT,
  "correctionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AudioItem" (
  "id" TEXT NOT NULL,
  "contributionId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "durationSeconds" INTEGER,
  "sizeBytes" BIGINT,
  "checksum" TEXT,
  "storageStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AudioItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ValidationRecord" (
  "id" TEXT NOT NULL,
  "contributionId" TEXT NOT NULL,
  "validatorId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ValidationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE UNIQUE INDEX "Contribution_clientId_key" ON "Contribution"("clientId");
CREATE INDEX "Contribution_userId_type_status_createdAt_idx" ON "Contribution"("userId", "type", "status", "createdAt");
CREATE INDEX "Contribution_dialect_region_idx" ON "Contribution"("dialect", "region");
CREATE INDEX "Contribution_normalizedText_idx" ON "Contribution"("normalizedText");
CREATE INDEX "AudioItem_contributionId_idx" ON "AudioItem"("contributionId");
CREATE INDEX "ValidationRecord_contributionId_validatorId_idx" ON "ValidationRecord"("contributionId", "validatorId");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_targetType_targetId_createdAt_idx" ON "AuditLog"("targetType", "targetId", "createdAt");

ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Contribution"
  ADD CONSTRAINT "Contribution_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AudioItem"
  ADD CONSTRAINT "AudioItem_contributionId_fkey"
  FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ValidationRecord"
  ADD CONSTRAINT "ValidationRecord_contributionId_fkey"
  FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ValidationRecord_validatorId_fkey"
  FOREIGN KEY ("validatorId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
