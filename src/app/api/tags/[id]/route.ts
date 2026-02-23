import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serverEncrypt, serverDecrypt } from "@/lib/server-crypto";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
});

// PUT /api/tags/[id] - Update a tag
export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tag = await prisma.tag.findUnique({ where: { id } });

  if (!tag) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (tag.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, color } = updateSchema.parse(body);

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      data.encryptedName = serverEncrypt(name);
    }
    if (color !== undefined) {
      data.color = color;
    }

    const updated = await prisma.tag.update({
      where: { id },
      data,
      include: { _count: { select: { drawings: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      name: serverDecrypt(updated.encryptedName),
      color: updated.color,
      drawingCount: updated._count.drawings,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[tags] Update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[id] - Delete a tag
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tag = await prisma.tag.findUnique({ where: { id } });

  if (!tag) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (tag.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.tag.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
