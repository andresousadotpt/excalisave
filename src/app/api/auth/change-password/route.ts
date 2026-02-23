import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(128).refine(
    (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw),
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  ),
  encryptedMasterKey: z.string().optional(),
  masterKeySalt: z.string().optional(),
  masterKeyIv: z.string().optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, resetIn } = rateLimit(`chpw:${ip}`, 5, 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword, encryptedMasterKey, masterKeySalt, masterKeyIv } =
      changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    const updateData: Record<string, unknown> = {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
      // Clear PIN material — PIN was derived from old password's master key wrapping
      encryptedMasterKeyPin: null,
      masterKeyPinSalt: null,
      masterKeyPinIv: null,
    };

    // If E2EE key material is provided, update it too (re-encrypted with new password)
    if (encryptedMasterKey && masterKeySalt && masterKeyIv) {
      updateData.encryptedMasterKey = encryptedMasterKey;
      updateData.masterKeySalt = masterKeySalt;
      updateData.masterKeyIv = masterKeyIv;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    console.log(`[change-password] Password changed for user ${session.user.id} (key material: ${encryptedMasterKey ? "updated" : "unchanged"})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[change-password] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
