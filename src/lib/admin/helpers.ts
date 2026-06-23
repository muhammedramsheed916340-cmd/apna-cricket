import { db } from "@/lib/db";

export const ADMIN_PASSWORD = "8950888988";
export const LICENSE_PREFIX = "RMSMT";

export function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${LICENSE_PREFIX}-${seg()}-${seg()}-${seg()}`;
}

export async function logActivity(type: string, message: string, extra?: { licenseKey?: string; deviceFp?: string; ip?: string }) {
  try {
    await db.activityLog.create({
      data: { type, message, licenseKey: extra?.licenseKey || null, deviceFp: extra?.deviceFp || null, ip: extra?.ip || null },
    });
  } catch {}
}

export function getPlanExpiry(plan: string): Date {
  const now = new Date();
  switch (plan) {
    case "trial": return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    case "weekly": return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    case "monthly": return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    case "lifetime": return new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000); // 10 years
    default: return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
}
