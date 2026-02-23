import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serverEncrypt, serverDecrypt } from "@/lib/server-crypto";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  encryptedData: z.string().max(15_000_000).optional(),
  iv: z.string().max(100).optional(),
  thumbnail: z.string().max(2_000_000).nullable().optional(),
  projectId: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

// GET /api/drawings/[id]
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const drawing = await prisma.drawing.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, encryptedName: true, color: true } },
      tags: { select: { tag: { select: { id: true, encryptedName: true, color: true } } } },
    },
  });

  if (!drawing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (drawing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ...drawing,
    name: serverDecrypt(drawing.encryptedName),
    encryptedName: undefined,
    project: drawing.project
      ? { id: drawing.project.id, name: serverDecrypt(drawing.project.encryptedName), color: drawing.project.color }
      : null,
    tags: drawing.tags.map((t) => ({
      id: t.tag.id,
      name: serverDecrypt(t.tag.encryptedName),
      color: t.tag.color,
    })),
  });
}

// PUT /api/drawings/[id]
export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const drawing = await prisma.drawing.findUnique({ where: { id } });

  if (!drawing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (drawing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, projectId, ...rest } = updateSchema.parse(body);

    const data: Record<string, unknown> = { ...rest };
    if (name !== undefined) {
      data.encryptedName = serverEncrypt(name);
    }
    if (projectId !== undefined) {
      if (projectId !== null) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.userId !== session.user.id) {
          return NextResponse.json({ error: "Project not found" }, { status: 400 });
        }
      }
      data.projectId = projectId;
    }

    const updated = await prisma.drawing.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...updated,
      name: serverDecrypt(updated.encryptedName),
      encryptedName: undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[drawings] Update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/drawings/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const drawing = await prisma.drawing.findUnique({ where: { id } });

  if (!drawing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (drawing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.drawing.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
