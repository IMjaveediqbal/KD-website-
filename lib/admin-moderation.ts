import type { Prisma, ContributionStatus } from "@prisma/client";
import {
  buildModerationUpdate,
  isContributionReviewable,
  type ModerationDecision,
} from "@/lib/admin-policy";

const reviewableStatuses: ContributionStatus[] = ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"];

export type ModerationResult =
  | { kind: "missing" }
  | { kind: "conflict"; status: ContributionStatus }
  | { kind: "updated" };

export async function moderateContribution(
  tx: Prisma.TransactionClient,
  input: { contributionId: string; adminId: string; decision: ModerationDecision; note: string },
): Promise<ModerationResult> {
  const current = await tx.contribution.findUnique({
    where: { id: input.contributionId },
    select: { id: true, status: true },
  });
  if (!current) return { kind: "missing" };
  if (!isContributionReviewable(current.status)) return { kind: "conflict", status: current.status };

  const updated = await tx.contribution.updateMany({
    where: { id: input.contributionId, status: { in: reviewableStatuses } },
    data: buildModerationUpdate(input.decision, input.note, input.adminId),
  });
  if (updated.count !== 1) return { kind: "conflict", status: current.status };

  await tx.adminAuditLog.create({
    data: {
      adminId: input.adminId,
      action: `CONTRIBUTION_${input.decision}`,
      targetType: "Contribution",
      targetId: input.contributionId,
      metadata: { previousStatus: current.status, note: input.note },
    },
  });
  return { kind: "updated" };
}
