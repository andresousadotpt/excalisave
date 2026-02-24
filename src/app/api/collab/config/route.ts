import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.COLLAB_URL || "";
  return NextResponse.json({ url });
}
