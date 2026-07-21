import { getLicense } from "@/lib/license-store";

// ====== Server-side license verification for premium APIs ======
// This is the AUTHORITATIVE check — called on EVERY premium API request.
// Client-side localStorage is NEVER trusted alone.

interface VerifyResult {
  authorized: boolean;
  plan?: string;
  features?: string[];
  error?: string;
  code?: string;
}

// Feature permissions per plan
const PLAN_FEATURES: Record<string, string[]> = {
  free: ["basic_teams", "limited_features"],
  match_pass: ["20_teams", "unlimited_transfer", "priority_server", "1_match_access"],
  daily: ["40_teams", "dream11", "my11circle", "ai_captain", "live_updates", "24h_access", "join_contest", "smart_mix_join", "premium_research", "auto_replace"],
  weekly: ["40_teams", "dream11", "my11circle", "ai_captain", "live_updates", "7d_access", "join_contest", "smart_mix_join", "premium_research", "auto_replace"],
  monthly: ["40_teams", "dream11", "my11circle", "auto_transfer", "premium_research", "priority_ai", "30d_access", "join_contest", "smart_mix_join", "auto_replace"],
  elite: ["500_teams", "elite_ai", "rank1_strategy", "vip_servers", "premium_support", "fastest_processing", "exclusive_features", "90d_access", "join_contest", "smart_mix_join", "auto_transfer", "auto_replace", "premium_research"],
  free_offer: ["40_teams", "dream11", "my11circle", "auto_transfer", "join_contest", "smart_mix_join", "premium_research", "ai_captain", "auto_replace", "priority_server", "24h_access"],
};

// ====== Verify license by key string ======
// Called by premium API routes after reading the license key from cookie.
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
  if (license.expiresAt && license.expiresAt < now) {
    return {
      authorized: false,
      error: "License expired. Renew to access premium features.",
      code: "EXPIRED",
    };
  }

  const plan = license.plan || "free";
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

  return { authorized: true, plan, features };
}

// ====== Check if a specific feature is allowed for the plan ======
export function isFeatureAllowed(plan: string | undefined, feature: string): boolean {
  if (!plan) return false;
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
  return features.includes(feature);
}
