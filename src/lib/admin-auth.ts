import { db } from "@/lib/db";

// Hard-coded master admin password. This is the single source of truth for
// admin API authentication. The /api/admin/settings POST route can also
// override it via the `admin_password` AppSetting key.
export const MASTER_ADMIN_PASSWORD = "8950888988";

/**
 * Verify the admin password. The setting `admin_password` in the AppSetting
 * table (if present) overrides the hard-coded master password — this allows
 * the dashboard to change credentials at runtime.
 */
export async function verifyAdminPassword(supplied?: string): Promise<boolean> {
  if (!supplied) return false;
  try {
    const setting = await db.appSetting.findUnique({
      where: { key: "admin_password" },
    });
    const expected = setting?.value || MASTER_ADMIN_PASSWORD;
    return supplied === expected;
  } catch {
    return supplied === MASTER_ADMIN_PASSWORD;
  }
}

/**
 * Generate a license key in the format RMSMT-XXXX-XXXX-XXXX.
 * Each segment is 4 chars from [A-Z0-9].
 */
export function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () =>
    Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `RMSMT-${seg()}-${seg()}-${seg()}`;
}

/** Plan → duration in days. Lifetime returns null (no expiry). */
export function planDurationDays(plan: string): number | null {
  switch (plan) {
    case "trial":
      return 1;
    case "weekly":
      return 7;
    case "monthly":
      return 30;
    case "lifetime":
      return null;
    default:
      return 30;
  }
}

/** Get current ISO timestamp + N days (or null for lifetime). */
export function computeExpiry(plan: string, from: Date = new Date()): Date | null {
  const days = planDurationDays(plan);
  if (days === null) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}
