import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await context.params;
  const item = await prisma.contribution.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
  if (!item.originalText?.trim()) return NextResponse.json({ error: "Original Khowar text is required before submission." }, { status: 400 });
  if (!["DRAFT", "NEEDS_CORRECTION", "REVISION_PENDING"].includes(item.status)) {
    return NextResponse.json({ error: "This contribution is not ready for submission." }, { status: 409 });
  }

  const updated = await prisma.contribution.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date(), rejectionReason: null, correctionNote: null },
    select: { id: true, status: true, submittedAt: true },
  });
  return NextResponse.json({ contribution: updated });
}
