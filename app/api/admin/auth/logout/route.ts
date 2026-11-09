import { NextResponse } from "next/server";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { destroyAdminSession, getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (admin) {
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: "ADMIN_LOGOUT",
        targetType: "ADMIN_SESSION",
      },
    });
  }
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
