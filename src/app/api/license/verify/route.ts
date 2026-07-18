import { NextResponse } from "next/server";
import { getLicense, updateLicense, addLog } from "@/lib/license-store";
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
    const { key, deviceFp } = body;

    if (!key || !deviceFp) {
      return NextResponse.json({ status: "fail", message: "Key and device ID required" });
    }

    const license = getLicense(key);

    if (!license) {
      addLog("key_verify", `Invalid key: ${key}`, { deviceFp });
      return NextResponse.json({ status: "fail", message: "❌ Invalid RMSMT License Key" });
    }

    if (license.status === "suspended") {
      return NextResponse.json({ status: "fail", message: "❌ License suspended. Contact admin." });
    }

    if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
      updateLicense(key, { status: "expired" });
      persistLicenses();
      return NextResponse.json({ status: "fail", message: "❌ License expired" });
    }

    if (license.deviceFp && license.deviceFp !== deviceFp) {
      addLog("key_verify", `Device mismatch for ${key}`, { deviceFp, licenseKey: key });
      return NextResponse.json({ status: "fail", message: "❌ License bound to another device" });
    }

    if (!license.deviceFp) {
      updateLicense(key, {
        deviceFp, boundAt: new Date().toISOString(), status: "used",
        usageCount: license.usageCount + 1, lastUsedAt: new Date().toISOString(),
      });
      persistLicenses();
      addLog("device_bind", `Device bound to ${key}`, { deviceFp, licenseKey: key });
    } else {
      updateLicense(key, {
        usageCount: license.usageCount + 1, lastUsedAt: new Date().toISOString(),
      });
    }

    addLog("key_verify", `✅ Verified: ${key}`, { deviceFp, licenseKey: key });

    return NextResponse.json({
      status: "success",
      message: "✅ RMSMT License Verified Successfully",
      plan: license.plan,
      expiresAt: license.expiresAt,
    });
  } catch (e) {
    return NextResponse.json({ status: "fail", message: (e as Error).message }, { status: 500 });
  }
}
