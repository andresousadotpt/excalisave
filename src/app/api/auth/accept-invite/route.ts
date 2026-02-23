import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  encryptedMasterKey: z.string(),
  masterKeySalt: z.string(),
  masterKeyIv: z.string(),
});

export async function POST(req: Request) {
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
