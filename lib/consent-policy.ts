import type { ConsentPurpose, Prisma } from "@prisma/client";

export type ConsentSubject =
  | { kind: "USER"; id: string }
  | { kind: "CONTRIBUTION"; id: string }
  | { kind: "AUDIO_ITEM"; id: string }
  | { kind: "CURATED_AUDIO_ASSET"; id: string };

export type ConsentDecision = {
  allowed: boolean;
  event: {
    action: "GRANTED" | "REVOKED";
    scope: string;
    policyVersion: string;
    occurredAt: Date;
  } | null;
};

/**
 * Evaluate only events attached to the exact subject and purpose.
 * No fallback to profile-level or broader subject consent is permitted.
 */
export async function getConsentDecision(
  tx: Prisma.TransactionClient,
  input: { subject: ConsentSubject; purpose: ConsentPurpose },
): Promise<ConsentDecision> {
  const where: Prisma.ConsentEventWhereInput = { purpose: input.purpose };
  switch (input.subject.kind) {
    case "USER":
      where.userId = input.subject.id;
      break;
    case "CONTRIBUTION":
      where.contributionId = input.subject.id;
      break;
    case "AUDIO_ITEM":
      where.audioItemId = input.subject.id;
      break;
    case "CURATED_AUDIO_ASSET":
      where.curatedAudioAssetId = input.subject.id;
      break;
  }

  const event = await tx.consentEvent.findFirst({
    where,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    select: {
      action: true,
      scope: true,
      policyVersion: true,
      occurredAt: true,
    },
  });

  if (!event) return { allowed: false, event: null };
  return {
    allowed: event.action === "GRANTED",
    event,
  };
}
