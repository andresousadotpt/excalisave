import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { hashEmail, serverEncrypt } from "@/lib/server-crypto";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  encryptedMasterKey: z.string(),
  masterKeySalt: z.string(),
  masterKeyIv: z.string(),
});

export async function POST(req: Request) {
  if (process.env.REGISTRATION_ENABLED === "false") {
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
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
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
      },
    });

    await sendVerificationEmail(email, verificationToken);

    return NextResponse.json(
      { success: true, message: "Check your email to verify your account" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
