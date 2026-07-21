import { NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/license-store";
import { ADMIN_PASSWORD, addLog } from "@/lib/admin/helpers";
import { logActivity } from "@/lib/admin/helpers";
import { requireAdmin } from "@/lib/admin/auth";
import { getAllSettingsFromNeon, saveSettingToNeon } from "@/lib/neon-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ status: "fail", error: auth.error }, { status: 401 });
  }
  // Primary: Load from Neon
  let settings: Record<string, string> = {};
  try {
    settings = await getAllSettingsFromNeon();
    console.log("[Settings] Loaded from Neon:", Object.keys(settings).length, "settings");
  } catch (e) {
    console.error("[Settings] Neon load failed, using local:", e instanceof Error ? e.message : String(e));
    settings = getAllSettings();
  }
  // Merge local settings
  const localSettings = getAllSettings();
  settings = { ...localSettings, ...settings };
  return NextResponse.json({ status: "success", settings });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, value, adminPassword } = body;
    if (adminPassword !== ADMIN_PASSWORD) return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });

    // Save to local
    setSetting(key, value);
    // Save to Neon
    await saveSettingToNeon(key, value);
    addLog("admin_action", `Setting updated: ${key}`, {});
    return NextResponse.json({ status: "success", message: "Setting updated" });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
