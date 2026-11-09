import { NextResponse } from "next/server";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const decisions = new Set(["VALIDATE", "NEEDS_CORRECTION", "REJECT", "DUPLICATE"]);
const reviewableStatuses = ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"] as const;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasTrustedRequestOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Administrator authentication required." }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { decision?: unknown; notes?: unknown } | null;
  if (!body || typeof body.decision !== "string" || !decisions.has(body.decision) || (typeof body.notes === "string" && body.notes.length > 1000)) {
    return NextResponse.json({ error: "Invalid moderation decision." }, { status: 400 });
  }
  const note = typeof body.notes === "string" ? body.notes.trim() : "";
  if (body.decision !== "VALIDATE" && !note) return NextResponse.json({ error: "A review note is required for this decision." }, { status: 400 });

  const nextStatus = body.decision === "VALIDATE" ? "VALIDATED" : body.decision === "NEEDS_CORRECTION" ? "NEEDS_CORRECTION" : body.decision === "REJECT" ? "REJECTED" : "DUPLICATE";
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.contribution.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!current) return { kind: "missing" as const };
      if (!reviewableStatuses.some((status) => status === current.status)) return { kind: "conflict" as const, status: current.status };

      const updated = await tx.contribution.updateMany({
        where: { id, status: { in: [...reviewableStatuses] } },
        data: {
          status: nextStatus,
          validatedAt: nextStatus === "VALIDATED" ? new Date() : null,
          validatedBy: nextStatus === "VALIDATED" ? admin.id : null,
          rejectionReason: nextStatus === "REJECTED" || nextStatus === "DUPLICATE" ? note : null,
          correctionNote: nextStatus === "NEEDS_CORRECTION" ? note : null,
        },
      });
      if (updated.count !== 1) return { kind: "conflict" as const, status: current.status };
      await tx.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: `CONTRIBUTION_${nextStatus}`,
          targetType: "Contribution",
          targetId: id,
          metadata: { previousStatus: current.status, note, source: "legacy-validation-api" },
        },
      });
      return { kind: "updated" as const };
    });
    if (result.kind === "missing") return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
    if (result.kind === "conflict") return NextResponse.json({ error: `Contribution is no longer awaiting review (current status: ${result.status}).` }, { status: 409 });
    return NextResponse.json({ success: true, status: nextStatus });
  } catch {
    return NextResponse.json({ error: "Unable to save moderation decision." }, { status: 500 });
  }
}
