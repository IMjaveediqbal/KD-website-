import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  // Never serialize the database user model: it contains passwordHash and internal fields.
  const publicUser = {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: user.profile,
  };
  return NextResponse.json({ user: publicUser });
}
