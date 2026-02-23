import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serverDecrypt } from "@/lib/server-crypto";

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
      createdAt: true,
      _count: {
        select: { drawings: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const decrypted = users.map((u) => ({
    id: u.id,
    email: serverDecrypt(u.encryptedEmail),
    role: u.role,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    _count: u._count,
  }));

  return NextResponse.json(decrypted);
}
