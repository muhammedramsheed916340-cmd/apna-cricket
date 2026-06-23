import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ADMIN_PASSWORD, getPlanExpiry, logActivity } from "@/lib/admin/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, key, days, adminPassword } = body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });
    }

    const license = await db.licenseKey.findUnique({ where: { key } });
    if (!license) return NextResponse.json({ status: "fail", error: "Key not found" });

    switch (action) {
      case "suspend":
        await db.licenseKey.update({ where: { id: license.id }, data: { status: "suspended" } });
        await logActivity("admin_action", `Suspended: ${key}`, { licenseKey: key });
        break;
      case "activate":
        await db.licenseKey.update({ where: { id: license.id }, data: { status: "active" } });
        await logActivity("admin_action", `Activated: ${key}`, { licenseKey: key });
        break;
      case "delete":
        await db.licenseKey.delete({ where: { id: license.id } });
        await logActivity("admin_action", `Deleted: ${key}`, {});
        return NextResponse.json({ status: "success", message: "Key deleted" });
      case "extend":
        const newExpiry = new Date(license.expiresAt || new Date());
        newExpiry.setDate(newExpiry.getDate() + (days || 30));
        await db.licenseKey.update({ where: { id: license.id }, data: { expiresAt: newExpiry, status: "active" } });
        await logActivity("admin_action", `Extended ${key} by ${days || 30} days`, { licenseKey: key });
        break;
      case "reset_device":
        await db.licenseKey.update({ where: { id: license.id }, data: { deviceFp: null, boundAt: null, status: "active" } });
        await logActivity("admin_action", `Reset device for ${key}`, { licenseKey: key });
        break;
      default:
        return NextResponse.json({ status: "fail", error: "Unknown action" });
    }

    return NextResponse.json({ status: "success", message: `${action} done for ${key}` });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
