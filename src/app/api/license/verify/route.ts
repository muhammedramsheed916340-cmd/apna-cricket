import { NextResponse } from "next/server";
import { getLicense, updateLicense, addLog } from "@/lib/license-store";
import * as fs from "fs";
import * as path from "path";
import { getAllLicenses } from "@/lib/license-store";

export const dynamic = "force-dynamic";

// ====== Rate limiting (prevent brute force) ======
// Max 10 verification attempts per IP per 60 seconds
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

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
    // Rate limit check
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { status: "fail", message: "Too many attempts. Please wait a minute." },
        { status: 429 }
      );
    }

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

    // NOTE: Do NOT bind device here. Device binding happens ONLY in /api/license/activate.
    // This endpoint is for verification only (read-only check).
    // Just update usage stats.
    updateLicense(key, {
      usageCount: license.usageCount + 1, lastUsedAt: new Date().toISOString(),
    });

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
