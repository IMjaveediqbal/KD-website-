import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAudioUploadUrl } from "@/lib/storage";
import { z } from "zod";

const schema = z.object({
  mimeType: z.enum(["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg"]),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await context.params;
  const contribution = await prisma.contribution.findUnique({ where: { id }, select: { id: true, userId: true, status: true } });
  if (!contribution || contribution.userId !== user.id) return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
  if (![ "DRAFT", "NEEDS_CORRECTION", "REVISION_PENDING" ].includes(contribution.status)) {
    return NextResponse.json({ error: "Audio can only be attached while the contribution is editable." }, { status: 409 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid audio metadata." }, { status: 400 });

  const extension = parsed.data.mimeType === "audio/wav" || parsed.data.mimeType === "audio/x-wav" ? "wav"
    : parsed.data.mimeType === "audio/mpeg" ? "mp3"
    : parsed.data.mimeType === "audio/mp4" ? "m4a"
    : parsed.data.mimeType === "audio/ogg" ? "ogg" : "webm";
  const storageKey = `audio/${user.id}/${contribution.id}/${randomUUID()}.${extension}`;

  try {
    const uploadUrl = await createAudioUploadUrl(storageKey, parsed.data.mimeType);
    const audio = await prisma.audioItem.create({
      data: {
        contributionId: contribution.id,
        storageKey,
        mimeType: parsed.data.mimeType,
        sizeBytes: BigInt(parsed.data.sizeBytes),
        storageStatus: "UPLOADING",
      },
      select: { id: true, storageKey: true, mimeType: true, sizeBytes: true, storageStatus: true },
    });
    return NextResponse.json({
      audio: { ...audio, sizeBytes: audio.sizeBytes?.toString() ?? null },
      uploadUrl,
      expiresInSeconds: 900,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Audio storage is not configured or unavailable." }, { status: 503 });
  }
}
