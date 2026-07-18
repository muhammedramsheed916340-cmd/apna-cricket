import { NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/license-store";
import { ADMIN_PASSWORD, addLog } from "@/lib/admin/helpers";
import { logActivity } from "@/lib/admin/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = getAllSettings();
  return NextResponse.json({ status: "success", settings });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, value, adminPassword } = body;
    if (adminPassword !== ADMIN_PASSWORD) return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });

    setSetting(key, value);
    addLog("admin_action", `Setting updated: ${key}`, {});
    return NextResponse.json({ status: "success", message: "Setting updated" });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
