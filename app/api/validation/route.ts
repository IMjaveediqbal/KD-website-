import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowed = new Set(["VALIDATOR","EXPERT","ADMIN","SUPER_ADMIN"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !allowed.has(user.role)) return NextResponse.json({ error: "Validator access required." }, { status: 403 });
  const items = await prisma.contribution.findMany({
    where: { status: { in: ["SUBMITTED","UNDER_REVIEW","EXPERT_REVIEW"] } },
    orderBy: { submittedAt: "asc" }, take: 50,
    include: { user: { select: { id:true, displayName:true, username:true } }, audioItems: true },
  });
  return NextResponse.json({ items });
}
