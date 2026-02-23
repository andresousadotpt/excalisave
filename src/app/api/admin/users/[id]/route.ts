import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  banned: z.boolean().optional(),
  role: z.enum(["user", "admin"]).optional(),
});

// PATCH /api/admin/users/[id] - Update user (ban/unban)
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    // Prevent self-modification
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot modify your own account" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
    });

    console.log(`[admin] User ${id} updated by ${session.user.id}: ${JSON.stringify(data)}`);

    return NextResponse.json({ success: true, banned: updated.banned, role: updated.role });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[admin] Update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete a user
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "admin") {
    return NextResponse.json(
      { error: "Cannot delete another admin" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });

  console.log(`[admin] User ${id} deleted by ${session.user.id}`);

  return NextResponse.json({ success: true });
}
