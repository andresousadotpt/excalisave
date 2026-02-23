import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY env var is required");
  if (key.length === 64) return Buffer.from(key, "hex");
  return Buffer.from(key, "base64");
}

function serverEncrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("ADMIN_EMAIL and ADMIN_PASSWORD not set, skipping admin seed");
    return;
  }

  const emailH = hashEmail(adminEmail);
  const existing = await prisma.user.findUnique({
    where: { emailHash: emailH },
  });

  if (existing) {
    // Ensure encryptedEmail is properly encrypted (fix legacy plaintext)
    const parts = existing.encryptedEmail.split(":");
    if (parts.length !== 3) {
      const encryptedEmail = serverEncrypt(adminEmail.toLowerCase().trim());
      await prisma.user.update({
        where: { id: existing.id },
        data: { encryptedEmail },
      });
      console.log(`Admin user ${adminEmail} encryptedEmail fixed`);
    } else {
      console.log(`Admin user ${adminEmail} already exists, skipping`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const encryptedEmail = serverEncrypt(adminEmail.toLowerCase().trim());

  await prisma.user.create({
    data: {
      emailHash: emailH,
      encryptedEmail,
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

async function seedSettings() {
  // Only insert if the setting doesn't already exist (DB value is prioritized)
  const existing = await prisma.setting.findUnique({
    where: { key: "registration_enabled" },
  });

  if (!existing) {
    const value = process.env.REGISTRATION_ENABLED !== "false" ? "true" : "false";
    await prisma.setting.create({
      data: { key: "registration_enabled", value },
    });
    console.log(`Setting registration_enabled = ${value} (from env)`);
  } else {
    console.log(`Setting registration_enabled already exists (${existing.value}), skipping`);
  }
}

async function run() {
  await main();
  await seedSettings();
}

run()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
