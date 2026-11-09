import type { Prisma, UserStatus } from "@prisma/client";

export type UserStatusChangeResult =
  | { kind: "missing" }
  | { kind: "deactivated" }
  | { kind: "unchanged" }
  | { kind: "updated" };

export async function changeUserStatus(
  tx: Prisma.TransactionClient,
  input: { userId: string; adminId: string; status: Extract<UserStatus, "ACTIVE" | "SUSPENDED"> },
): Promise<UserStatusChangeResult> {
  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { id: true, status: true, email: true },
  });
  if (!user) return { kind: "missing" };
  if (user.status === "DEACTIVATED") return { kind: "deactivated" };
  if (user.status === input.status) return { kind: "unchanged" };

  await tx.user.update({ where: { id: input.userId }, data: { status: input.status } });
  if (input.status === "SUSPENDED") {
    await tx.session.deleteMany({ where: { userId: input.userId } });
  }
  await tx.adminAuditLog.create({
    data: {
      adminId: input.adminId,
      action: input.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_RESTORED",
      targetType: "User",
      targetId: input.userId,
      metadata: { previousStatus: user.status, nextStatus: input.status, email: user.email },
    },
  });
  return { kind: "updated" };
}
