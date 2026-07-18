import { NextResponse } from "next/server";
import { updateLicense, deleteLicense, getLicense, addLog } from "@/lib/license-store";
import { ADMIN_PASSWORD, getPlanExpiry } from "@/lib/admin/helpers";
import * as fs from "fs";
import * as path from "path";
import { getAllLicenses } from "@/lib/license-store";

export const dynamic = "force-dynamic";

function persistLicenses() {
  try {
    const allKeys = getAllLicenses().map(k => ({
      key: k.key, plan: k.plan, status: k.status, deviceFp: k.deviceFp,
      expiresAt: k.expiresAt, usageCount: k.usageCount, lastUsedAt: k.lastUsedAt, boundAt: k.boundAt,
    }));
    fs.writeFileSync(path.join(process.cwd(), "src/lib/licenses.json"), JSON.stringify(allKeys, null, 2));
    return true;
  } catch { return false; }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, key, days, adminPassword } = body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });
    }

    const license = getLicense(key);
    if (!license) return NextResponse.json({ status: "fail", error: "Key not found" });

    switch (action) {
      case "suspend":
        updateLicense(key, { status: "suspended" });
        break;
      case "activate":
        updateLicense(key, { status: "active" });
        break;
      case "delete":
        deleteLicense(key);
        persistLicenses();
        addLog("admin_action", `Deleted: ${key}`, {});
        return NextResponse.json({ status: "success", message: "Key deleted" });
      case "extend":
        const newExpiry = new Date(license.expiresAt || new Date());
        newExpiry.setDate(newExpiry.getDate() + (days || 30));
        updateLicense(key, { expiresAt: newExpiry.toISOString(), status: "active" });
        break;
      case "reset_device":
        updateLicense(key, { deviceFp: null, boundAt: null, status: "active" });
        break;
      default:
        return NextResponse.json({ status: "fail", error: "Unknown action" });
    }

    persistLicenses();
    addLog("admin_action", `${action}: ${key}`, { licenseKey: key });

    return NextResponse.json({ status: "success", message: `${action} done for ${key}` });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
