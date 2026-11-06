import { NextResponse } from "next/server";
import { destroyAdminSession, getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
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
