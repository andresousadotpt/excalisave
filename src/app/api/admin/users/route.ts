import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashEmail, serverEncrypt, serverDecrypt } from "@/lib/server-crypto";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

// GET /api/admin/users - List all users
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      encryptedEmail: true,
      role: true,
      emailVerified: true,
      banned: true,
      createdAt: true,
      _count: {
        select: { drawings: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = users.map((u) => ({
    id: u.id,
    email: maskEmail(serverDecrypt(u.encryptedEmail)),
    role: u.role,
    emailVerified: u.emailVerified,
    banned: u.banned,
    createdAt: u.createdAt,
    _count: u._count,
  }));

  return NextResponse.json(result);
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// POST /api/admin/users - Admin creates a user (pre-verified, must change password)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password } = createUserSchema.parse(body);

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
    const encryptedEmail = serverEncrypt(email.toLowerCase().trim());

    await prisma.user.create({
      data: {
        emailHash: emailH,
        encryptedEmail,
        passwordHash,
        emailVerified: true,
        mustChangePassword: true,
        encryptedMasterKey: "",
        masterKeySalt: "",
        masterKeyIv: "",
      },
    });

    console.log(`[admin] User created by ${session.user.id} for ${emailH.slice(0, 8)}...`);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[admin] Create user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
