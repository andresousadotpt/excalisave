import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  encryptedData: z.string().optional(),
  iv: z.string().optional(),
  thumbnail: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

// GET /api/drawings/[id]
export async function GET(_req: Request, { params }: Params) {
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

  return NextResponse.json(drawing);
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
    const data = updateSchema.parse(body);

    const updated = await prisma.drawing.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Update drawing error:", error);
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
