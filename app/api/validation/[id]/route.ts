import { NextResponse } from "next/server";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  isModerationNoteValid,
  type ModerationDecision,
} from "@/lib/admin-policy";
import { moderateContribution } from "@/lib/admin-moderation";
import { checkAdminApiRateLimit } from "@/lib/admin-api-rate-limit";

const legacyDecisionMap: Record<string, ModerationDecision> = {
  VALIDATE: "VALIDATED",
  NEEDS_CORRECTION: "NEEDS_CORRECTION",
  REJECT: "REJECTED",
  DUPLICATE: "DUPLICATE",
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Administrator authentication required." }, { status: 401 });
  }

  const rateLimitResponse = await checkAdminApiRateLimit(request, admin.id, "legacy-moderation");
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid moderation decision." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid moderation decision." }, { status: 400 });
  }

  const input = body as { decision?: unknown; notes?: unknown };
  const legacyDecision = typeof input.decision === "string" ? input.decision : "";
  const decision = Object.hasOwn(legacyDecisionMap, legacyDecision)
    ? legacyDecisionMap[legacyDecision]
    : undefined;
  if (!decision) {
    return NextResponse.json({ error: "Invalid moderation decision." }, { status: 400 });
  }

  const note = typeof input.notes === "string" ? input.notes.trim() : "";
  if (!isModerationNoteValid(decision, note)) {
    return NextResponse.json(
      { error: "A review note of up to 1000 characters is required for this decision." },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction((tx) =>
      moderateContribution(tx, {
        contributionId: id,
        adminId: admin.id,
        decision,
        note,
      }),
    );

    if (result.kind === "missing") {
      return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
    }
    if (result.kind === "conflict") {
      return NextResponse.json(
        { error: `Contribution is no longer awaiting review (current status: ${result.status}).` },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, status: decision });
  } catch {
    return NextResponse.json({ error: "Unable to save moderation decision." }, { status: 500 });
  }
}
