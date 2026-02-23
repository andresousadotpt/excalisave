import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isSuperAdmin } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  banned: z.boolean().optional(),
  role: z.enum(["user", "admin", "super_admin"]).optional(),
});

// PATCH /api/admin/users/[id] - Update user (ban/unban)
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
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

    // Role change authorization
    if (data.role !== undefined) {
      // Cannot modify super_admin's role
      if (user.role === "super_admin") {
        return NextResponse.json(
          { error: "Cannot modify a super admin's role" },
          { status: 403 }
        );
      }
      // Only super_admin can assign/remove super_admin role
      if (data.role === "super_admin" && !isSuperAdmin(session.user.role)) {
        return NextResponse.json(
          { error: "Only super admins can assign super admin role" },
          { status: 403 }
        );
      }
      // Only super_admin can change another admin's role
      if (isAdminRole(user.role) && !isSuperAdmin(session.user.role)) {
        return NextResponse.json(
          { error: "Only super admins can change another admin's role" },
          { status: 403 }
        );
      }
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
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
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

  if (user.role === "super_admin") {
    return NextResponse.json(
      { error: "Cannot delete a super admin" },
      { status: 400 }
    );
  }

  if (isAdminRole(user.role) && !isSuperAdmin(session.user.role)) {
    return NextResponse.json(
      { error: "Only super admins can delete other admins" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });

  console.log(`[admin] User ${id} deleted by ${session.user.id}`);

  return NextResponse.json({ success: true });
}
