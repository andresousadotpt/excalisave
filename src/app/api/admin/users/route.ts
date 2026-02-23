import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      _count: {
        select: { drawings: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
