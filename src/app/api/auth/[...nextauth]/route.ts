import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const { GET } = handlers;

// Wrap POST with rate limiting for login attempts
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, resetIn } = rateLimit(`auth:${ip}`, 10, 60 * 1000);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) },
      }
    );
  }

  return handlers.POST(req);
}
