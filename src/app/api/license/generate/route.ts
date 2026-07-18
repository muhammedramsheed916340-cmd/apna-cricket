import { NextResponse } from "next/server";
import { generateLicenseKey, getPlanExpiry, ADMIN_PASSWORD } from "@/lib/admin/helpers";
import { createLicense, getLicense, addLog, getAllLicenses } from "@/lib/license-store";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

// Write licenses to JSON file (works on local dev + Vercel build output)
function persistLicenses() {
  try {
    const allKeys = getAllLicenses().map(k => ({
      key: k.key,
      plan: k.plan,
      status: k.status,
      deviceFp: k.deviceFp,
      expiresAt: k.expiresAt,
      usageCount: k.usageCount,
      lastUsedAt: k.lastUsedAt,
      boundAt: k.boundAt,
    }));
    const filePath = path.join(process.cwd(), "src/lib/licenses.json");
    fs.writeFileSync(filePath, JSON.stringify(allKeys, null, 2));
    return true;
  } catch (e) {
    console.error("[License] Failed to persist:", (e as Error).message);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { count = 1, plan = "monthly", adminPassword } = body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });
    }

    const keys: string[] = [];
    const expiry = getPlanExpiry(plan).toISOString();

    for (let i = 0; i < Math.min(count, 500); i++) {
      let key = generateLicenseKey();
      while (getLicense(key)) {
        key = generateLicenseKey();
      }
      createLicense(key, plan, expiry);
      keys.push(key);
    }

    // Persist to JSON file
    const persisted = persistLicenses();

    addLog("admin_action", `Generated ${keys.length} ${plan} keys (persisted: ${persisted})`, {});

    return NextResponse.json({
      status: "success",
      keys,
      count: keys.length,
      persisted,
    });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
