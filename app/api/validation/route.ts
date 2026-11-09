import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const reviewableStatuses = ["SUBMITTED", "UNDER_REVIEW", "EXPERT_REVIEW"] as const;

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Administrator authentication required." }, { status: 401 });

  const items = await prisma.contribution.findMany({
    where: { status: { in: [...reviewableStatuses] } },
    orderBy: { submittedAt: "asc" },
    take: 50,
    select: {
      id: true, type: true, status: true, title: true, originalText: true,
      normalizedText: true, dialect: true, region: true, submittedAt: true,
      user: { select: { id: true, displayName: true, username: true } },
      audioItems: { select: { id: true, mimeType: true, durationSeconds: true, storageStatus: true } },
    },
  });
  return NextResponse.json({ items });
}
