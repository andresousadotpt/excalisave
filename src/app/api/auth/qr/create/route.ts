import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Ambiguity-free charset (no 0/O, 1/I/L)
const SHORT_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ2345679";

function generateShortCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => SHORT_CODE_CHARS[b % SHORT_CODE_CHARS.length])
    .join("");
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, resetIn } = rateLimit(`qr-create:${ip}`, 10, 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
    );
  }

  try {
    // Opportunistic cleanup of expired tokens
    await prisma.qrLoginToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const shortCode = generateShortCode();
    const userAgent = req.headers.get("user-agent") || undefined;

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const qrToken = await prisma.qrLoginToken.create({
      data: {
        token,
        shortCode,
        userAgent,
        expiresAt,
      },
    });

    const baseUrl = req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
      : new URL(req.url).origin;

    const qrUrl = `${baseUrl}/approve-login?token=${token}`;

    return NextResponse.json({
      token: qrToken.token,
      shortCode: qrToken.shortCode,
      qrUrl,
      expiresAt: qrToken.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[qr/create] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
