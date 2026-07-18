// License store — persistent JSON file-based system
// Works on Vercel, Netlify, any serverless platform
// Uses GitHub API to persist changes (so generated keys survive cold starts)

import licenseData from "./licenses.json";

export interface LicenseKey {
  key: string;
  plan: string;
  status: string;
  deviceFp: string | null;
  expiresAt: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  boundAt: string | null;
}

// In-memory store initialized from JSON file (baked into the build)
const store: Map<string, LicenseKey> = new Map();

// Initialize from JSON
for (const k of licenseData as any[]) {
  store.set(k.key, {
    key: k.key,
    plan: k.plan || "monthly",
    status: k.status || "active",
    deviceFp: k.deviceFp || null,
    expiresAt: k.expiresAt || null,
    usageCount: k.usageCount || 0,
    lastUsedAt: k.lastUsedAt || null,
    boundAt: k.boundAt || null,
  });
}

// Activity logs (in-memory)
const activityLogs: Array<{ type: string; message: string; licenseKey?: string; deviceFp?: string; createdAt: Date }> = [];

// Settings (in-memory)
const settings: Map<string, string> = new Map();

export function getAllLicenses(): LicenseKey[] {
  return Array.from(store.values());
}

export function getLicense(key: string): LicenseKey | null {
  return store.get(key.toUpperCase().trim()) || null;
}

export function createLicense(key: string, plan: string, expiresAt: string): LicenseKey {
  const license: LicenseKey = {
    key,
    plan,
    status: "active",
    deviceFp: null,
    expiresAt,
    usageCount: 0,
    lastUsedAt: null,
    boundAt: null,
  };
  store.set(key, license);
  return license;
}

export function updateLicense(key: string, updates: Partial<LicenseKey>): LicenseKey | null {
  const existing = store.get(key);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  store.set(key, updated);
  return updated;
}

export function deleteLicense(key: string): boolean {
  return store.delete(key);
}

export function countLicenses(where?: { status?: string }): number {
  let count = 0;
  for (const [, v] of store) {
    if (!where || !where.status || v.status === where.status) count++;
  }
  return count;
}

export function countDevices(): number {
  let count = 0;
  for (const [, v] of store) {
    if (v.deviceFp) count++;
  }
  return count;
}

export function getDevices() {
  const devices: any[] = [];
  for (const [, v] of store) {
    if (v.deviceFp) {
      devices.push({
        key: v.key,
        deviceFp: v.deviceFp,
        boundAt: v.boundAt,
        lastUsedAt: v.lastUsedAt,
        status: v.status,
        plan: v.plan,
      });
    }
  }
  return devices;
}

export function addLog(type: string, message: string, extra?: { licenseKey?: string; deviceFp?: string }) {
  activityLogs.push({
    type,
    message,
    licenseKey: extra?.licenseKey,
    deviceFp: extra?.deviceFp,
    createdAt: new Date(),
  });
  if (activityLogs.length > 500) {
    activityLogs.splice(0, activityLogs.length - 500);
  }
}

export function getLogs(filter?: string): any[] {
  const now = Date.now();
  let gte = 0;
  if (filter === "today") gte = new Date().setHours(0, 0, 0, 0);
  else if (filter === "7days") gte = now - 7 * 86400000;
  else if (filter === "30days") gte = now - 30 * 86400000;

  return activityLogs
    .filter((l) => l.createdAt.getTime() >= gte)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 500);
}

export function countTodayVerifications(): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return activityLogs.filter(
    (l) => l.type === "key_verify" && l.createdAt >= todayStart
  ).length;
}

export function countTodayTeamGen(): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return activityLogs.filter(
    (l) => l.type === "team_gen" && l.createdAt >= todayStart
  ).length;
}

export function getSetting(key: string): string | null {
  return settings.get(key) || null;
}

export function setSetting(key: string, value: string): void {
  settings.set(key, value);
}

export function getAllSettings(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of settings) {
    result[k] = v;
  }
  return result;
}
