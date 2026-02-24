import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { serverEncrypt } from "@/lib/server-crypto";

const pinSchema = z.object({
  encryptedMasterKeyPin: z.string().min(1).max(500),
  masterKeyPinSalt: z.string().min(1).max(500),
  masterKeyPinIv: z.string().min(1).max(500),
});

// POST /api/auth/pin - Set or update PIN-wrapped master key
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, resetIn } = rateLimit(`pin:${ip}`, 5, 60 * 1000);
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
    const { encryptedMasterKeyPin, masterKeyPinSalt, masterKeyPinIv } = pinSchema.parse(body);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        encryptedMasterKeyPin: serverEncrypt(encryptedMasterKeyPin),
        masterKeyPinSalt: serverEncrypt(masterKeyPinSalt),
        masterKeyPinIv: serverEncrypt(masterKeyPinIv),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[auth/pin] Set PIN error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/pin - Remove PIN
export async function DELETE(req: Request) {
  const ip = getClientIp(req);
  const { allowed, resetIn } = rateLimit(`pin:${ip}`, 5, 60 * 1000);
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

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      encryptedMasterKeyPin: null,
      masterKeyPinSalt: null,
      masterKeyPinIv: null,
    },
  });

  return NextResponse.json({ success: true });
}
