import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateCollabToken } from "@/lib/collab-token";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = generateCollabToken(session.user.id);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json(
      { error: "Collab service unavailable" },
      { status: 503 }
    );
  }
}
