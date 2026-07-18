import { NextResponse } from "next/server";
import { getDevices } from "@/lib/license-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const devices = getDevices();
  return NextResponse.json({ status: "success", devices });
}
