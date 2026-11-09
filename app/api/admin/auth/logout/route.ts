import { NextResponse } from "next/server";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { destroyAdminSession, getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  try {
    const admin = await getCurrentAdmin();

    // Revoke the session before writing the audit event so an audit-store
    // outage cannot leave the administrator signed in.
    await destroyAdminSession();

    if (admin) {
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: "ADMIN_LOGOUT",
          targetType: "ADMIN_SESSION",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Best-effort second attempt also clears the cookie if session lookup failed.
    try {
      await destroyAdminSession();
    } catch {
      // The cookie is cleared in destroyAdminSession's finally block.
    }
    return NextResponse.json({ error: "Unable to complete sign out." }, { status: 500 });
  }
}
