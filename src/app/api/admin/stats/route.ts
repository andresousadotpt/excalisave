import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalUsers, verifiedUsers, totalDrawings, recentUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.drawing.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

  return NextResponse.json({
    totalUsers,
    verifiedUsers,
    totalDrawings,
    recentUsers,
  });
}
