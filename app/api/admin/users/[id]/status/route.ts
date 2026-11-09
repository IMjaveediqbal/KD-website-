import { NextResponse } from "next/server";
import { hasTrustedRequestOrigin } from "@/lib/request-security";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { changeUserStatus } from "@/lib/admin-user-management";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Administrator authentication required." }, { status: 401 });

  const { id } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid account status." }, { status: 400 });

  const status = (body as { status?: unknown }).status;
  if (status !== "ACTIVE" && status !== "SUSPENDED") {
    return NextResponse.json({ error: "Only ACTIVE and SUSPENDED are supported account states." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction((tx) =>
      changeUserStatus(tx, { userId: id, adminId: admin.id, status })
    );

    if (result.kind === "missing") return NextResponse.json({ error: "User account not found." }, { status: 404 });
    if (result.kind === "deactivated") return NextResponse.json({ error: "Deactivated accounts cannot be changed here." }, { status: 409 });
    return NextResponse.json({ success: true, status });
  } catch {
    return NextResponse.json({ error: "Unable to update account status." }, { status: 500 });
  }
}
