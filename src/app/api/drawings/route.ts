import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serverEncrypt, serverDecrypt } from "@/lib/server-crypto";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  encryptedData: z.string().max(15_000_000),
  iv: z.string().max(100),
  projectId: z.string().optional(),
});

// GET /api/drawings - List user's drawings
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
      thumbnail: true,
      projectId: true,
      tags: {
        select: { tag: { select: { id: true } } },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const decrypted = drawings.map((d) => ({
    id: d.id,
    name: serverDecrypt(d.encryptedName),
    thumbnail: d.thumbnail,
    projectId: d.projectId,
    tagIds: d.tags.map((t) => t.tag.id),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));

  return NextResponse.json(decrypted);
}

// POST /api/drawings - Create new drawing
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, encryptedData, iv, projectId } = createSchema.parse(body);

    // Validate project ownership if provided
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || project.userId !== session.user.id) {
        return NextResponse.json({ error: "Project not found" }, { status: 400 });
      }
    }

    const drawing = await prisma.drawing.create({
      data: {
        encryptedName: serverEncrypt(name),
        encryptedData,
        iv,
        userId: session.user.id,
        projectId: projectId ?? null,
      },
      select: {
        id: true,
        encryptedName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        id: drawing.id,
        name: serverDecrypt(drawing.encryptedName),
        createdAt: drawing.createdAt,
        updatedAt: drawing.updatedAt,
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
    console.error("[drawings] Create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
