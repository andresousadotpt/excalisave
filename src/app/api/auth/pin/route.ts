import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const pinSchema = z.object({
  pin: z.string().regex(/^[a-zA-Z0-9]{8}$/, "PIN must be exactly 8 alphanumeric characters"),
  encryptedMasterKeyPin: z.string().min(1),
  masterKeyPinSalt: z.string().min(1),
  masterKeyPinIv: z.string().min(1),
});

// POST /api/auth/pin - Set or update PIN-wrapped master key
export async function POST(req: Request) {
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
        encryptedMasterKeyPin,
        masterKeyPinSalt,
        masterKeyPinIv,
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
