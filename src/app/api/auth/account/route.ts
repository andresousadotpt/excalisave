import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serverDecrypt } from "@/lib/server-crypto";

const deleteSchema = z.object({
  password: z.string(),
});

// GET /api/auth/account - Export all user data (GDPR)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      drawings: {
        select: {
          id: true,
          encryptedName: true,
          encryptedData: true,
          iv: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const exportData = {
    account: {
      id: user.id,
      email: serverDecrypt(user.encryptedEmail),
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    encryptionKeys: {
      encryptedMasterKey: user.encryptedMasterKey,
      masterKeySalt: user.masterKeySalt,
      masterKeyIv: user.masterKeyIv,
    },
    drawings: user.drawings.map((d) => ({
      id: d.id,
      name: serverDecrypt(d.encryptedName),
      encryptedData: d.encryptedData,
      iv: d.iv,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
    exportedAt: new Date().toISOString(),
  };

  console.log(`[account] Data export for user ${session.user.id}`);

  return NextResponse.json(exportData);
}

// DELETE /api/auth/account - Delete own account (GDPR right to erasure)
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { password } = deleteSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "admin") {
      return NextResponse.json(
        { error: "Admin accounts cannot be self-deleted. Contact another admin." },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 400 }
      );
    }

    // Cascade delete handles drawings
    await prisma.user.delete({ where: { id: session.user.id } });

    console.log(`[account] User ${session.user.id} deleted their account`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[account] Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
