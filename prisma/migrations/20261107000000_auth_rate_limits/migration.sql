-- Persistent, privacy-preserving rate-limit buckets for public authentication endpoints.
CREATE TABLE "AuthRateLimitBucket" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthRateLimitBucket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AuthRateLimitBucket_key_key" ON "AuthRateLimitBucket"("key");
CREATE INDEX "AuthRateLimitBucket_windowStartedAt_idx" ON "AuthRateLimitBucket"("windowStartedAt");
