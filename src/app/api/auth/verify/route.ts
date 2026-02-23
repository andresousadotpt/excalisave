import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getBaseUrl(reqUrl: string) {
  return process.env.APP_URL || process.env.AUTH_URL || new URL(reqUrl).origin;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const baseUrl = getBaseUrl(req.url);

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid-token`);
  }

  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
  });

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid-token`);
  }

  if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
    return NextResponse.redirect(`${baseUrl}/login?error=token-expired`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
    },
  });

  console.log(`[verify] User ${user.id} email verified`);

  return NextResponse.redirect(`${baseUrl}/login?verified=true`);
}
