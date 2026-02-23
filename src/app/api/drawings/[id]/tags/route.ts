import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const setTagsSchema = z.object({
  tagIds: z.array(z.string()),
});

// PUT /api/drawings/[id]/tags - Set all tags for a drawing (replaces existing)
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
    const { tagIds } = setTagsSchema.parse(body);

    // Validate all tags belong to the user
    if (tagIds.length > 0) {
      const validTags = await prisma.tag.count({
        where: { id: { in: tagIds }, userId: session.user.id },
      });
      if (validTags !== tagIds.length) {
        return NextResponse.json(
          { error: "One or more tags not found" },
          { status: 400 }
        );
      }
    }

    // Replace all tags atomically
    await prisma.$transaction([
      prisma.drawingTag.deleteMany({ where: { drawingId: id } }),
      ...tagIds.map((tagId) =>
        prisma.drawingTag.create({ data: { drawingId: id, tagId } })
      ),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[drawings/tags] Set tags error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
