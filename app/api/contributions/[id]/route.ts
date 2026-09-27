import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contributionSchema } from "@/lib/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await context.params;
  const existing = await prisma.contribution.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
  if (!["DRAFT", "NEEDS_CORRECTION", "REVISION_PENDING"].includes(existing.status)) {
    return NextResponse.json({ error: "This contribution can no longer be edited." }, { status: 409 });
  }

  const parsed = contributionSchema.partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid contribution data." }, { status: 400 });

  const updated = await prisma.contribution.update({
    where: { id },
    data: parsed.data,
    select: { id: true, clientId: true, type: true, status: true, updatedAt: true },
  });
  return NextResponse.json({ contribution: updated });
}
