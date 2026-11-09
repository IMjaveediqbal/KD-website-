import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createAudioReadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ audioId: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Administrator authentication required." }, { status: 401 });

  const { audioId } = await context.params;
  const audio = await prisma.audioItem.findUnique({
    where: { id: audioId },
    select: { id: true, storageKey: true, mimeType: true, storageStatus: true, contributionId: true },
  });
  if (!audio) return NextResponse.json({ error: "Audio item not found." }, { status: 404 });
  if (audio.storageStatus !== "READY") {
    return NextResponse.json({ error: "This audio item is not ready for playback." }, { status: 409 });
  }

  try {
    const url = await createAudioReadUrl(audio.storageKey);
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: "AUDIO_PLAYBACK_URL_ISSUED",
        targetType: "AudioItem",
        targetId: audio.id,
        metadata: { contributionId: audio.contributionId },
      },
    });
    return NextResponse.json({ url, mimeType: audio.mimeType, expiresInSeconds: 300 });
  } catch {
    return NextResponse.json({ error: "Audio storage is unavailable or not configured." }, { status: 503 });
  }
}
