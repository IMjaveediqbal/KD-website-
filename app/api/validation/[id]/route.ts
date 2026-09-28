import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowed = new Set(["VALIDATOR","EXPERT","ADMIN","SUPER_ADMIN"]);
const decisions = new Set(["VALIDATE","NEEDS_CORRECTION","REJECT","EXPERT_REVIEW","DUPLICATE"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !allowed.has(user.role)) return NextResponse.json({ error: "Validator access required." }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { decision?: string; notes?: string } | null;
  if (!body || !body.decision || !decisions.has(body.decision) || (body.notes && body.notes.length > 4000)) return NextResponse.json({ error: "Invalid validation decision." }, { status: 400 });
  const item = await prisma.contribution.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
  if (!["SUBMITTED","UNDER_REVIEW","EXPERT_REVIEW"].includes(item.status)) return NextResponse.json({ error: "Contribution is not awaiting validation." }, { status: 409 });

  const nextStatus = body.decision === "VALIDATE" ? "VALIDATED" : body.decision === "NEEDS_CORRECTION" ? "NEEDS_CORRECTION" : body.decision === "REJECT" ? "REJECTED" : body.decision === "EXPERT_REVIEW" ? "EXPERT_REVIEW" : "DUPLICATE";
  const updated = await prisma.$transaction(async tx => {
    const contribution = await tx.contribution.update({
      where: { id },
      data: {
        status: nextStatus,
        validatedAt: nextStatus === "VALIDATED" ? new Date() : null,
        validatedBy: nextStatus === "VALIDATED" ? user.id : null,
        rejectionReason: nextStatus === "REJECTED" ? (body.notes || "Rejected during validation.") : null,
        correctionNote: nextStatus === "NEEDS_CORRECTION" ? (body.notes || "Correction requested.") : null,
      },
      select: { id:true, status:true, validatedAt:true, validatedBy:true, rejectionReason:true, correctionNote:true },
    });
    await tx.validationRecord.create({ data: { contributionId: id, validatorId: user.id, decision: body.decision, notes: body.notes || null } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "CONTRIBUTION_VALIDATION", targetType: "Contribution", targetId: id, metadata: { decision: body.decision } } });
    return contribution;
  });
  return NextResponse.json({ contribution: updated });
}
