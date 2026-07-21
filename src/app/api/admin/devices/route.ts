import { NextResponse } from "next/server";
import { getDevices } from "@/lib/license-store";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ status: "fail", error: auth.error }, { status: 401 });
  }
  const devices = getDevices();
  return NextResponse.json({ status: "success", devices });
}
