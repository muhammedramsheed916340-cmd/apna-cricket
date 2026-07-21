import { NextResponse } from "next/server";
import { getLicense, updateLicense, addLog } from "@/lib/license-store";
import { getLicenseFromNeon, updateLicenseInNeon } from "@/lib/neon-store";

export const dynamic = "force-dynamic";

// ====== Rate limiting (prevent brute force) ======
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

    // Step 1: Check local in-memory store first (fast path)
    let license = getLicense(key) as any;

    // Step 2: If not in local store, check Neon PostgreSQL
    if (!license) {
      console.log("[License Verify] Key not in local store, checking Neon:", key);
      try {
        const neonLicense = await getLicenseFromNeon(key);
        if (neonLicense) {
          console.log("[License Verify] Found in Neon:", key, "plan:", neonLicense.plan, "status:", neonLicense.status);
          // Use Neon data directly — no need to cache in local store
          license = {
            key: neonLicense.key,
            plan: neonLicense.plan || "monthly",
            status: neonLicense.status || "active",
            deviceFp: neonLicense.deviceFp || null,
            expiresAt: neonLicense.expiresAt ? new Date(neonLicense.expiresAt).toISOString() : null,
            usageCount: neonLicense.usageCount || 0,
            lastUsedAt: neonLicense.lastUsedAt ? new Date(neonLicense.lastUsedAt).toISOString() : null,
            boundAt: neonLicense.boundAt ? new Date(neonLicense.boundAt).toISOString() : null,
          };
        }
      } catch (e) {
        console.error("[License Verify] Neon lookup error:", e instanceof Error ? e.message : String(e));
      }
    }

    if (!license) {
      addLog("key_verify", `Invalid key: ${key}`, { deviceFp });
      return NextResponse.json({ status: "fail", message: "❌ Invalid RMSMT License Key" });
    }

    // Step 3: Validate status
    if (license.status === "suspended" || license.status === "revoked") {
      return NextResponse.json({ status: "fail", message: `❌ License ${license.status}. Contact admin.` });
    }

    // Step 4: Validate expiry
    if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
      // Update status to expired in Neon
      await updateLicenseInNeon(key, { status: "expired" });
      return NextResponse.json({ status: "fail", message: "❌ License expired" });
    }

    // Step 5: Check device binding (read-only, do NOT bind)
    if (license.deviceFp && license.deviceFp !== deviceFp) {
      addLog("key_verify", `Device mismatch for ${key}`, { deviceFp, licenseKey: key });
      return NextResponse.json({ status: "fail", message: "❌ License bound to another device" });
    }

    // Step 6: Update usage stats in Neon (non-blocking)
    const newUsageCount = (license.usageCount || 0) + 1;
    updateLicenseInNeon(key, {
      usageCount: newUsageCount,
      lastUsedAt: new Date().toISOString(),
    }).catch(() => {}); // non-blocking

    // Also update local store if present
    try {
      updateLicense(key, {
        usageCount: newUsageCount,
        lastUsedAt: new Date().toISOString(),
      });
    } catch {}

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
