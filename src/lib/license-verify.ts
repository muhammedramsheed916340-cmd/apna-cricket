import { getLicense } from "@/lib/license-store";
import { getLicenseFromNeon } from "./neon-store";
import { db } from "./db";

// ====== Server-side license verification for premium APIs ======
// Checks: cookie → local store → Neon PostgreSQL
// This is the AUTHORITATIVE check — called on EVERY premium API request.

interface VerifyResult {
  authorized: boolean;
  plan?: string;
  features?: string[];
  error?: string;
  code?: string;
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

// ====== Verify license (async — checks Neon if not in local store) ======
export async function verifyLicenseKeyAsync(licenseKey: string): Promise<VerifyResult> {
  if (!licenseKey) {
    return {
      authorized: false,
      error: "License key required. Activate a license to access premium features.",
      code: "NO_LICENSE",
    };
  }

  // Step 1: Check local in-memory store (fast)
  let license = getLicense(licenseKey) as any;

  // Step 2: If not in local store, check Neon PostgreSQL
  if (!license) {
    console.log("[License Verify] Key not in local store, checking Neon:", licenseKey);
    try {
      const neonLicense = await getLicenseFromNeon(licenseKey);
      if (neonLicense) {
        console.log("[License Verify] Found in Neon:", licenseKey, "plan:", neonLicense.plan);
        license = {
          key: neonLicense.key,
          plan: neonLicense.plan || "monthly",
          status: neonLicense.status || "active",
          deviceFp: neonLicense.deviceFp || null,
          expiresAt: neonLicense.expiresAt ? new Date(neonLicense.expiresAt).toISOString() : null,
        };
      }
    } catch (e) {
      console.error("[License Verify] Neon lookup error:", e instanceof Error ? e.message : String(e));
    }
  }

  if (!license) {
    return {
      authorized: false,
      error: "Invalid license key.",
      code: "INVALID_KEY",
    };
  }

  if (license.status === "revoked" || license.status === "suspended") {
    return {
      authorized: false,
      error: `License ${license.status}. Contact admin.`,
      code: license.status.toUpperCase(),
    };
  }

  const now = Date.now();
  if (license.expiresAt) {
    const expTime = typeof license.expiresAt === "string" ? new Date(license.expiresAt).getTime() : license.expiresAt;
    if (expTime && expTime < now) {
      return {
        authorized: false,
        error: "License expired. Renew to access premium features.",
        code: "EXPIRED",
      };
    }
  }

  const plan = license.plan || "free";
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

  return { authorized: true, plan, features };
}

// ====== Sync version (for backwards compat — only checks local store) ======
export function verifyLicenseKey(licenseKey: string): VerifyResult {
  if (!licenseKey) {
    return {
      authorized: false,
      error: "License key required. Activate a license to access premium features.",
      code: "NO_LICENSE",
    };
  }

  const license = getLicense(licenseKey);

  if (!license) {
    return {
      authorized: false,
      error: "Invalid license key.",
      code: "INVALID_KEY",
    };
  }

  if (license.status === "revoked" || license.status === "suspended") {
    return {
      authorized: false,
      error: `License ${license.status}. Contact admin.`,
      code: license.status.toUpperCase(),
    };
  }

  const now = Date.now();
  if (license.expiresAt) {
    const expTime = typeof license.expiresAt === "string" ? new Date(license.expiresAt).getTime() : license.expiresAt;
    if (expTime && expTime < now) {
      return {
        authorized: false,
        error: "License expired. Renew to access premium features.",
        code: "EXPIRED",
      };
    }
  }

  const plan = license.plan || "free";
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

  return { authorized: true, plan, features };
}

export function isFeatureAllowed(plan: string | undefined, feature: string): boolean {
  if (!plan) return false;
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
  return features.includes(feature);
}
