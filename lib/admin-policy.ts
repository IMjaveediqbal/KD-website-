export const moderationDecisions = [
  "VALIDATED",
  "NEEDS_CORRECTION",
  "REJECTED",
  "DUPLICATE",
] as const;

export type ModerationDecision = (typeof moderationDecisions)[number];

const reviewableContributionStatuses = new Set([
  "SUBMITTED",
  "UNDER_REVIEW",
  "EXPERT_REVIEW",
]);

export function isModerationDecision(value: string): value is ModerationDecision {
  return moderationDecisions.some((decision) => decision === value);
}

export function isContributionReviewable(status: string): boolean {
  return reviewableContributionStatuses.has(status);
}

export function isModerationNoteValid(decision: ModerationDecision, note: string): boolean {
  return note.length <= 1000 && (decision === "VALIDATED" || note.length > 0);
}

export function buildModerationUpdate(
  decision: ModerationDecision,
  note: string,
  adminId: string,
  now = new Date(),
) {
  return {
    status: decision,
    validatedAt: decision === "VALIDATED" ? now : null,
    validatedBy: decision === "VALIDATED" ? adminId : null,
    correctionNote: decision === "NEEDS_CORRECTION" ? note : null,
    rejectionReason: decision === "REJECTED" || decision === "DUPLICATE" ? note : null,
  };
}
