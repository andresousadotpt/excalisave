import { prisma } from "@/lib/prisma";

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function isRegistrationEnabled(): Promise<boolean> {
  const value = await getSetting("registration_enabled");
  if (value !== null) return value === "true";
  // Fallback to env var if no DB setting exists
  return process.env.REGISTRATION_ENABLED !== "false";
}
