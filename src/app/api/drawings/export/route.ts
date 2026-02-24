import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serverDecrypt } from "@/lib/server-crypto";

// GET /api/drawings/export - Export all drawings for backup
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const drawings = await prisma.drawing.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      encryptedName: true,
      encryptedData: true,
      iv: true,
      project: {
        select: { encryptedName: true },
      },
    },
  });

  const result = drawings.map((d) => ({
    id: d.id,
    name: serverDecrypt(d.encryptedName),
    encryptedData: d.encryptedData,
    iv: d.iv,
    projectName: d.project ? serverDecrypt(d.project.encryptedName) : null,
  }));

  return NextResponse.json(result);
}
