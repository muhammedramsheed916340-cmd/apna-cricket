import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLicense } from "@/lib/license-store";
import { getLicenseFromNeon } from "@/lib/neon-store";

export const dynamic = "force-dynamic";

// ====== Server-side license verification endpoint ======
// Called by subscription-context.checkAndLock() on app start.
// Checks local store first, then Neon PostgreSQL.
// Returns: { valid, plan, features, expiresAt }

interface VerifyResult {
  valid: boolean;
  plan: string | null;
  features: string[];
  expiresAt: number | null;
  deviceMatch: boolean;
  serverStatus: "online";
  message: string;
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["basic_teams", "limited_features"],
  match_pass: ["20_teams", "unlimited_transfer", "priority_server", "1_match_access"],
  daily: ["40_teams", "dream11", "my11circle", "ai_captain", "live_updates", "24h_access", "join_contest", "smart_mix_join", "premium_research", "auto_replace"],
  weekly: ["40_teams", "dream11", "my11circle", "ai_captain", "live_updates", "7d_access", "join_contest", "smart_mix_join", "premium_research", "auto_replace"],
  monthly: ["40_teams", "dream11", "my11circle", "auto_transfer", "premium_research", "priority_ai", "30d_access", "join_contest", "smart_mix_join", "auto_replace"],
  elite: ["500_teams", "elite_ai", "rank1_strategy", "vip_servers", "premium_support", "fastest_processing", "exclusive_features", "90d_access", "join_contest", "smart_mix_join", "auto_transfer", "auto_replace", "premium_research"],
  free_offer: ["40_teams", "dream11", "my11circle", "auto_transfer", "join_contest", "smart_mix_join", "premium_research", "ai_captain", "auto_replace", "priority_server", "24h_access"],
  lifetime: ["500_teams", "elite_ai", "rank1_strategy", "vip_servers", "premium_support", "fastest_processing", "exclusive_features", "join_contest", "smart_mix_join", "auto_transfer", "auto_replace", "premium_research"],
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { key, deviceFp } = body;

    if (!key || !deviceFp) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "Key and device ID required",
      });
    }

    // Step 1: Check local store
    let license = getLicense(key) as any;

    // Step 2: If not in local store, check Neon PostgreSQL
    if (!license) {
      console.log("[Subscription Verify] Key not in local store, checking Neon:", key);
      try {
        const neonLicense = await getLicenseFromNeon(key);
        if (neonLicense) {
          console.log("[Subscription Verify] Found in Neon:", key, "plan:", neonLicense.plan, "status:", neonLicense.status);
          license = {
            key: neonLicense.key,
            plan: neonLicense.plan || "monthly",
            status: neonLicense.status || "active",
            deviceFp: neonLicense.deviceFp || null,
            expiresAt: neonLicense.expiresAt ? new Date(neonLicense.expiresAt).toISOString() : null,
            usageCount: neonLicense.usageCount || 0,
            boundAt: neonLicense.boundAt ? new Date(neonLicense.boundAt).toISOString() : null,
          };
        }
      } catch (e) {
        console.error("[Subscription Verify] Neon lookup error:", e instanceof Error ? e.message : String(e));
      }
    }

    if (!license) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "Invalid license key",
        code: "INVALID_KEY",
      });
    }

    // Check if revoked/suspended
    if (license.status === "revoked" || license.status === "suspended") {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: `License ${license.status}`,
        code: license.status.toUpperCase(),
      });
    }

    // Check expiry
    const now = Date.now();
    const expiresAtMs = license.expiresAt ? new Date(license.expiresAt).getTime() : 0;
    if (expiresAtMs && expiresAtMs < now) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "License expired",
        code: "EXPIRED",
        expiresAt: expiresAtMs,
      });
    }

    // Check device binding
    const deviceMatch = !license.deviceFp || license.deviceFp === deviceFp;
    if (!deviceMatch) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "License bound to different device",
        code: "DEVICE_MISMATCH",
      });
    }

    // License valid — return features
    const plan = license.plan || "free";
    const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

    const result: VerifyResult = {
      valid: true,
      plan,
      features,
      expiresAt: expiresAtMs || null,
      deviceMatch: true,
      serverStatus: "online",
      message: "License valid",
    };

    // Set httpOnly cookie for premium API verification
    const cookieStore = await cookies();
    cookieStore.set("tg_license_key", key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });

    return NextResponse.json({
      status: "success",
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      { status: "fail", valid: false, message: (e as Error).message },
      { status: 500 }
    );
  }
}

// GET — check subscription settings (public, for feature lock UI)
export async function GET() {
  try {
    const plans = [
      { id: "free", name: "FREE", price: "₹0", duration: "Forever", features: PLAN_FEATURES.free },
      { id: "match_pass", name: "MATCH PASS", price: "₹49", duration: "1 Match", features: PLAN_FEATURES.match_pass },
      { id: "daily", name: "DAILY PRO", price: "₹99", duration: "24 Hours", features: PLAN_FEATURES.daily },
      { id: "monthly", name: "PRO", price: "₹499", duration: "30 Days", features: PLAN_FEATURES.monthly },
      { id: "elite", name: "ELITE AI", price: "₹1499", duration: "90 Days", features: PLAN_FEATURES.elite },
    ];

    return NextResponse.json({
      status: "success",
      subscriptionEnabled: true,
      freePlanFeatures: PLAN_FEATURES.free,
      plans,
    });
  } catch (e) {
    return NextResponse.json(
      { status: "fail", message: (e as Error).message },
      { status: 500 }
    );
  }
}
