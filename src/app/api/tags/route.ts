import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serverEncrypt, serverDecrypt } from "@/lib/server-crypto";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

// GET /api/tags - List user's tags
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { drawings: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = tags.map((t) => ({
    id: t.id,
    name: serverDecrypt(t.encryptedName),
    color: t.color,
    drawingCount: t._count.drawings,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  return NextResponse.json(result);
}

// POST /api/tags - Create a tag
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, color } = createSchema.parse(body);

    const tag = await prisma.tag.create({
      data: {
        encryptedName: serverEncrypt(name),
        color: color ?? null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        id: tag.id,
        name,
        color: tag.color,
        drawingCount: 0,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[tags] Create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
