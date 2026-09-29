import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headStoredObject } from "@/lib/storage";
import { z } from "zod";

const schema = z.object({
  durationSeconds: z.number().int().nonnegative().max(60 * 60 * 4),
  checksum: z.string().trim().max(128).optional().nullable(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string; audioId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { audioId } = await context.params;
  const audio = await prisma.audioItem.findUnique({
    where: { id: audioId },
    include: { contribution: { select: { userId: true } } },
  });
  if (!audio || audio.contribution.userId !== user.id) return NextResponse.json({ error: "Audio item not found." }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid audio completion metadata." }, { status: 400 });

  try {
    const stored = await headStoredObject(audio.storageKey);
    const actualSize = stored.ContentLength ?? 0;
    if (actualSize <= 0 || actualSize !== Number(audio.sizeBytes ?? -1)) {
      await prisma.audioItem.update({ where: { id: audioId }, data: { storageStatus: "FAILED" } });
      return NextResponse.json({ error: "Uploaded audio size does not match the declared file size." }, { status: 400 });
    }

    const updated = await prisma.audioItem.update({
      where: { id: audioId },
      data: {
        durationSeconds: parsed.data.durationSeconds,
        checksum: parsed.data.checksum || null,
        storageStatus: "READY",
      },
      select: { id: true, mimeType: true, durationSeconds: true, sizeBytes: true, checksum: true, storageStatus: true },
    });
    return NextResponse.json({
      audio: { ...updated, sizeBytes: updated.sizeBytes?.toString() ?? null },
    });
  } catch {
    return NextResponse.json({ error: "Uploaded audio could not be verified in object storage." }, { status: 409 });
  }
}
