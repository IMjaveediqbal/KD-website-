import { NextResponse } from "next/server";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { ContributionStatus } from "@prisma/client";

const decisions = new Set(["VALIDATED", "NEEDS_CORRECTION", "REJECTED", "DUPLICATE"]);
const reviewableStatuses: ContributionStatus[] = ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Administrator authentication required." }, { status: 401 });

  const { id } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid decision." }, { status: 400 });

  const input = body as { decision?: unknown; note?: unknown };
  const decision = typeof input.decision === "string" ? input.decision : "";
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (!decisions.has(decision)) return NextResponse.json({ error: "Unsupported moderation decision." }, { status: 400 });
  if (note.length > 1000 || (decision !== "VALIDATED" && note.length === 0)) {
    return NextResponse.json({ error: "A review note of up to 1000 characters is required for this decision." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.contribution.findUnique({
        where: { id },
        select: { id: true, status: true, userId: true },
      });
      if (!current) return { kind: "missing" as const };
      if (!reviewableStatuses.some((status) => status === current.status)) return { kind: "conflict" as const, status: current.status };

      const updated = await tx.contribution.updateMany({
        where: { id, status: { in: reviewableStatuses } },
        data: {
          status: decision as "VALIDATED" | "NEEDS_CORRECTION" | "REJECTED" | "DUPLICATE",
          validatedAt: decision === "VALIDATED" ? new Date() : null,
          validatedBy: decision === "VALIDATED" ? admin.id : null,
          correctionNote: decision === "NEEDS_CORRECTION" ? note : null,
          rejectionReason: decision === "REJECTED" || decision === "DUPLICATE" ? note : null,
        },
      });
      if (updated.count !== 1) return { kind: "conflict" as const, status: current.status };

      await tx.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: `CONTRIBUTION_${decision}`,
          targetType: "Contribution",
          targetId: id,
          metadata: { previousStatus: current.status, note },
        },
      });
      return { kind: "updated" as const };
    });

    if (result.kind === "missing") return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
    if (result.kind === "conflict") return NextResponse.json({ error: `This contribution is no longer awaiting review (current status: ${result.status}).` }, { status: 409 });
    return NextResponse.json({ success: true, status: decision });
  } catch {
    return NextResponse.json({ error: "Unable to save moderation decision." }, { status: 500 });
  }
}
