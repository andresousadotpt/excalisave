import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128).refine(
    (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw),
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  ),
  encryptedMasterKey: z.string(),
  masterKeySalt: z.string(),
  masterKeyIv: z.string(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, resetIn } = rateLimit(`invite:${ip}`, 5, 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
    );
  }

  try {
    const body = await req.json();
    const { token, password, encryptedMasterKey, masterKeySalt, masterKeyIv } =
      acceptInviteSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 400 }
      );
    }

    if (user.inviteTokenExpiresAt && user.inviteTokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invite link has expired. Please ask your admin for a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        encryptedMasterKey,
        masterKeySalt,
        masterKeyIv,
        inviteToken: null,
      },
    });

    console.log(`[accept-invite] User ${user.id} accepted invite and set password`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[accept-invite] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
