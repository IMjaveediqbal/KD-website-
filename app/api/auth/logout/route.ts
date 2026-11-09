import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { hasTrustedRequestOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
