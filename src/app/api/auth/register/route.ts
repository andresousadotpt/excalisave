import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { hashEmail, serverEncrypt } from "@/lib/server-crypto";
import { isRegistrationEnabled } from "@/lib/settings";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const registerSchema = z.object({
  email: z.string().email(),
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
  const { allowed, resetIn } = rateLimit(`register:${ip}`, 5, 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
    );
  }

  if (!(await isRegistrationEnabled())) {
    return NextResponse.json(
      { error: "Registration is currently disabled" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, password, encryptedMasterKey, masterKeySalt, masterKeyIv } =
      registerSchema.parse(body);

    const emailH = hashEmail(email);
    const existing = await prisma.user.findUnique({
      where: { emailHash: emailH },
    });

    // Always return the same response to prevent email enumeration
    if (existing) {
      console.log(`[register] Duplicate registration attempt (hash: ${emailH.slice(0, 8)}...)`);
      return NextResponse.json(
        { success: true, message: "If this email is not yet registered, you will receive a verification email." },
        { status: 201 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const encryptedEmail = serverEncrypt(email.toLowerCase().trim());

    await prisma.user.create({
      data: {
        emailHash: emailH,
        encryptedEmail,
        passwordHash,
        encryptedMasterKey,
        masterKeySalt,
        masterKeyIv,
        verificationToken,
        verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    await sendVerificationEmail(email, verificationToken);

    console.log(`[register] User registered (hash: ${emailH.slice(0, 8)}...)`);

    return NextResponse.json(
      { success: true, message: "If this email is not yet registered, you will receive a verification email." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[register] Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
