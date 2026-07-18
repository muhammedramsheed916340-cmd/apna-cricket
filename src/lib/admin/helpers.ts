export const ADMIN_PASSWORD = "8950888988";
export const LICENSE_PREFIX = "RMSMT";

export function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${LICENSE_PREFIX}-${seg()}-${seg()}-${seg()}`;
}

export function getPlanExpiry(plan: string): Date {
  const now = new Date();
  switch (plan) {
    case "trial": return new Date(now.getTime() + 3 * 86400000);
    case "weekly": return new Date(now.getTime() + 7 * 86400000);
    case "monthly": return new Date(now.getTime() + 30 * 86400000);
    case "lifetime": return new Date(now.getTime() + 3650 * 86400000);
    default: return new Date(now.getTime() + 30 * 86400000);
  }
}

// Re-export addLog from license-store
export { addLog } from "@/lib/license-store";
