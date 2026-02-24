import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, resetIn } = rateLimit(`qr-status:${ip}`, 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
    );
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ status: "not_found" });
  }

  try {
    const qrToken = await prisma.qrLoginToken.findUnique({
      where: { token },
    });

    if (!qrToken) {
      return NextResponse.json({ status: "not_found" });
    }

    if (qrToken.expiresAt < new Date()) {
      return NextResponse.json({ status: "expired" });
    }

    return NextResponse.json({ status: qrToken.status });
  } catch (error) {
    console.error("[qr/status] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
