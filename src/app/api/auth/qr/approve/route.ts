import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, resetIn } = rateLimit(`qr-approve:${ip}`, 10, 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { token, shortCode } = body as { token?: string; shortCode?: string };

    if (!token && !shortCode) {
      return NextResponse.json(
        { error: "Token or short code is required" },
        { status: 400 }
      );
    }

    const qrToken = token
      ? await prisma.qrLoginToken.findUnique({ where: { token } })
      : await prisma.qrLoginToken.findUnique({
          where: { shortCode: shortCode!.toUpperCase() },
        });

    if (!qrToken) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 404 }
      );
    }

    if (qrToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This code has expired" },
        { status: 410 }
      );
    }

    if (qrToken.status !== "pending") {
      return NextResponse.json(
        { error: "This code has already been used" },
        { status: 409 }
      );
    }

    const authToken = crypto.randomBytes(32).toString("hex");

    await prisma.qrLoginToken.update({
      where: { id: qrToken.id },
      data: {
        status: "approved",
        userId: session.user.id,
        authToken,
      },
    });

    // Truncate user-agent for display
    const deviceInfo = qrToken.userAgent
      ? qrToken.userAgent.slice(0, 100)
      : "Unknown device";

    return NextResponse.json({ success: true, deviceInfo });
  } catch (error) {
    console.error("[qr/approve] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
