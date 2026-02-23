import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serverEncrypt, serverDecrypt } from "@/lib/server-crypto";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

// GET /api/projects - List user's projects
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { drawings: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = projects.map((p) => ({
    id: p.id,
    name: serverDecrypt(p.encryptedName),
    color: p.color,
    drawingCount: p._count.drawings,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return NextResponse.json(result);
}

// POST /api/projects - Create a project
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, color } = createSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        encryptedName: serverEncrypt(name),
        color: color ?? null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        id: project.id,
        name,
        color: project.color,
        drawingCount: 0,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
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
    console.error("[projects] Create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
