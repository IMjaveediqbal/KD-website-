export function isUserSessionUsable(
  session: { expiresAt: Date; user: { status: string } },
  now = new Date(),
): boolean {
  return session.expiresAt > now && session.user.status === "ACTIVE";
}

export function isAdminSessionUsable(
  session: { expiresAt: Date; revokedAt: Date | null; admin: { status: string } },
  now = new Date(),
): boolean {
  return session.revokedAt === null && session.expiresAt > now && session.admin.status === "ACTIVE";
}

export function ownedContributionWhere(userId: string, contributionId?: string) {
  return {
    userId,
    ...(contributionId ? { id: contributionId } : {}),
  };
}

export function canEditContribution(status: string): boolean {
  return ["DRAFT", "NEEDS_CORRECTION", "REVISION_PENDING"].includes(status);
}
