import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getSetting, setSetting } from "@/lib/settings";
import { isAdminRole } from "@/lib/roles";

// GET /api/admin/settings - Get all settings
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const registrationEnabled = await getSetting("registration_enabled");

  return NextResponse.json({
    registration_enabled: registrationEnabled ?? (process.env.REGISTRATION_ENABLED !== "false" ? "true" : "false"),
  });
}

const updateSchema = z.object({
  registration_enabled: z.enum(["true", "false"]).optional(),
});

// PATCH /api/admin/settings - Update settings
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.registration_enabled !== undefined) {
      await setSetting("registration_enabled", data.registration_enabled);
      console.log(`[admin] Registration ${data.registration_enabled === "true" ? "enabled" : "disabled"} by ${session.user.id}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[admin] Settings update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
