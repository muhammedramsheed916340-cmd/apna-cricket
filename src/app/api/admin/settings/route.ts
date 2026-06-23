import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ADMIN_PASSWORD, logActivity } from "@/lib/admin/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await db.appSetting.findMany();
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return NextResponse.json({ status: "success", settings: map });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, value, adminPassword } = body;
    if (adminPassword !== ADMIN_PASSWORD) return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });

    const existing = await db.appSetting.findFirst({ where: { key } });
    if (existing) await db.appSetting.update({ where: { id: existing.id }, data: { value } });
    else await db.appSetting.create({ data: { key, value } });

    await logActivity("admin_action", `Setting updated: ${key}`, {});
    return NextResponse.json({ status: "success", message: "Setting updated" });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
