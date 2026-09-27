import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contributionSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 100);
  const cursor = searchParams.get("cursor");

  const items = await prisma.contribution.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, clientId: true, type: true, status: true, title: true,
      originalText: true, normalizedText: true, englishTranslation: true, urduTranslation: true,
      dialect: true, region: true, aiAssisted: true, createdAt: true, updatedAt: true,
    },
  });
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return NextResponse.json({ items: data, nextCursor: hasMore ? data[data.length - 1].id : null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const parsed = contributionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid contribution data." }, { status: 400 });

  const data = parsed.data;
  try {
    const item = await prisma.contribution.create({
      data: { ...data, userId: user.id },
      select: { id: true, clientId: true, type: true, status: true, createdAt: true },
    });
    return NextResponse.json({ contribution: item }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /Unique constraint/i.test(error.message)) {
      return NextResponse.json({ error: "This client contribution already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to save contribution." }, { status: 500 });
  }
}
