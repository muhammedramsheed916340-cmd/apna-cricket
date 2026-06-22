import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  return NextResponse.json({
    status: user ? "success" : "guest",
    user,
  });
}
