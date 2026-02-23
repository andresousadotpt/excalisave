import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const librarySchema = z.object({
  encryptedLibrary: z.string().min(1),
  libraryIv: z.string().min(1).max(500),
});

// GET /api/library - Get user's encrypted library
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { encryptedLibrary: true, libraryIv: true },
  });

  if (!user?.encryptedLibrary || !user?.libraryIv) {
    return NextResponse.json({ encryptedLibrary: null, libraryIv: null });
  }

  return NextResponse.json({
    encryptedLibrary: user.encryptedLibrary,
    libraryIv: user.libraryIv,
  });
}

// PUT /api/library - Save user's encrypted library
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { encryptedLibrary, libraryIv } = librarySchema.parse(body);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { encryptedLibrary, libraryIv },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[library] Save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
