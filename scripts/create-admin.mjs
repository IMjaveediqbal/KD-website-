import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || null;

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this command.");
  }
  if (password.length < 14 || password.length > 128) {
    throw new Error("ADMIN_PASSWORD must be between 14 and 128 characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("ADMIN_EMAIL must be a valid email address.");
  }

  const existing = await prisma.adminAccount.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An administrator with this email already exists. Use a controlled password-rotation procedure instead.");
  }

  const passwordHash = await hash(password, 12);
  const admin = await prisma.adminAccount.create({
    data: { email, passwordHash, displayName, status: "ACTIVE" },
    select: { id: true, email: true, displayName: true, createdAt: true },
  });

  console.log("Administrator provisioned:", admin.email);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Administrator provisioning failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
