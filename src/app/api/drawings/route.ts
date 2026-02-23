import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  encryptedData: z.string(),
  iv: z.string(),
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
      name: true,
      thumbnail: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(drawings);
}

// POST /api/drawings - Create new drawing
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, encryptedData, iv } = createSchema.parse(body);

    const drawing = await prisma.drawing.create({
      data: {
        name,
        encryptedData,
        iv,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(drawing, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Create drawing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
