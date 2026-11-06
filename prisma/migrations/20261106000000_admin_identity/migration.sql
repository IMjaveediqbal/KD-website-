-- Isolated administrator identity, sessions, audit trail, and login throttling.
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "AdminAccount" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT,
  "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminLoginThrottle" (
  "id" TEXT NOT NULL,
  "identifierHash" TEXT NOT NULL,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminLoginThrottle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminAccount_email_key" ON "AdminAccount"("email");
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");
CREATE INDEX "AdminSession_adminId_expiresAt_idx" ON "AdminSession"("adminId", "expiresAt");
CREATE INDEX "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt");
CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx" ON "AdminAuditLog"("targetType", "targetId", "createdAt");
CREATE UNIQUE INDEX "AdminLoginThrottle_identifierHash_key" ON "AdminLoginThrottle"("identifierHash");

ALTER TABLE "AdminSession"
  ADD CONSTRAINT "AdminSession_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "AdminAccount"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "AdminAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
