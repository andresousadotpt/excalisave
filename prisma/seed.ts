import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("ADMIN_EMAIL and ADMIN_PASSWORD not set, skipping admin seed");
    return;
  }

  // Only create admin if it doesn't exist
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`Admin user ${adminEmail} already exists, skipping`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Admin doesn't need E2EE key material (they don't create drawings)
  // Use placeholder values
  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      role: "admin",
      emailVerified: true,
      mustChangePassword: true,
      encryptedMasterKey: "",
      masterKeySalt: "",
      masterKeyIv: "",
    },
  });

  console.log(`Admin user ${adminEmail} created (must change password on first login)`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
