// ====== Neon PostgreSQL License Store ======
// Primary database: Neon PostgreSQL via Prisma
// Firestore: backup/sync only (optional)
//
// All license operations go through this file.
// Local JSON store (licenses.json) is kept as fallback for cold starts only.

import { db } from "./db";
import type { LicenseKey as LicenseKeyInterface } from "./license-store";

// ====== Create a license in Neon ======
export async function createLicenseInNeon(data: {
  key: string;
  plan: string;
  status?: string;
  expiresAt: Date;
  createdBy?: string;
}): Promise<{ success: boolean; error?: string; license?: any }> {
  try {
    const license = await db.licenseKey.create({
      data: {
        key: data.key,
        plan: data.plan,
        status: data.status || "active",
        expiresAt: data.expiresAt,
        createdBy: data.createdBy || "admin",
      },
    });
    console.log("[Neon] License created:", license.key);
    return { success: true, license };
  } catch (e: any) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Neon] Create license error:", error);
    if (error.includes("Unique constraint")) {
      return { success: false, error: "Duplicate key — license already exists" };
    }
    return { success: false, error: `Database insert failed: ${error}` };
  }
}

// ====== Read license from Neon ======
export async function getLicenseFromNeon(key: string): Promise<any | null> {
  try {
    const license = await db.licenseKey.findUnique({
      where: { key: key.toUpperCase().trim() },
    });
    return license;
  } catch (e) {
    console.error("[Neon] Get license error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ====== Update license in Neon ======
export async function updateLicenseInNeon(
  key: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert dates
    const data: any = { ...updates };
    if (data.expiresAt && typeof data.expiresAt === "string") {
      data.expiresAt = new Date(data.expiresAt);
    }
    if (data.boundAt && typeof data.boundAt === "string") {
      data.boundAt = new Date(data.boundAt);
    }
    if (data.lastUsedAt && typeof data.lastUsedAt === "string") {
      data.lastUsedAt = new Date(data.lastUsedAt);
    }

    await db.licenseKey.update({
      where: { key: key.toUpperCase().trim() },
      data,
    });
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Neon] Update license error:", error);
    return { success: false, error: `Database update failed: ${error}` };
  }
}

// ====== Delete license from Neon ======
export async function deleteLicenseFromNeon(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.licenseKey.delete({
      where: { key: key.toUpperCase().trim() },
    });
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Neon] Delete license error:", error);
    return { success: false, error: `Database delete failed: ${error}` };
  }
}

// ====== Get all licenses from Neon ======
export async function getAllLicensesFromNeon(): Promise<any[]> {
  try {
    const licenses = await db.licenseKey.findMany({
      orderBy: { createdAt: "desc" },
    });
    return licenses;
  } catch (e) {
    console.error("[Neon] Get all licenses error:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

// ====== Read-back verify after insert ======
export async function verifyLicenseInNeon(key: string): Promise<boolean> {
  try {
    const license = await db.licenseKey.findUnique({
      where: { key: key.toUpperCase().trim() },
    });
    return license !== null;
  } catch (e) {
    console.error("[Neon] Verify license error:", e instanceof Error ? e.message : String(e));
    return false;
  }
}

// ====== Save JWT token to Neon ======
export async function saveJwtToNeon(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.jwtToken.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    console.log("[Neon] JWT saved:", key);
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Neon] Save JWT error:", error);
    return { success: false, error: `Database JWT save failed: ${error}` };
  }
}

// ====== Get JWT token from Neon ======
export async function getJwtFromNeon(key: string): Promise<string | null> {
  try {
    const token = await db.jwtToken.findUnique({ where: { key } });
    return token?.value || null;
  } catch (e) {
    console.error("[Neon] Get JWT error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ====== Save setting to Neon ======
export async function saveSettingToNeon(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Neon] Save setting error:", error);
    return { success: false, error: `Database setting save failed: ${error}` };
  }
}

// ====== Get setting from Neon ======
export async function getSettingFromNeon(key: string): Promise<string | null> {
  try {
    const setting = await db.setting.findUnique({ where: { key } });
    return setting?.value || null;
  } catch (e) {
    console.error("[Neon] Get setting error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ====== Get all settings from Neon ======
export async function getAllSettingsFromNeon(): Promise<Record<string, string>> {
  try {
    const settings = await db.setting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  } catch (e) {
    console.error("[Neon] Get all settings error:", e instanceof Error ? e.message : String(e));
    return {};
  }
}

// ====== Add admin log to Neon ======
export async function addLogToNeon(data: {
  type: string;
  message: string;
  licenseKey?: string;
  deviceFp?: string;
  ip?: string;
}): Promise<void> {
  try {
    await db.adminLog.create({ data });
  } catch (e) {
    console.error("[Neon] Add log error:", e instanceof Error ? e.message : String(e));
  }
}

// ====== Get logs from Neon ======
export async function getLogsFromNeon(filter: string): Promise<any[]> {
  try {
    const now = new Date();
    let where: any = {};

    if (filter === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where = { createdAt: { gte: start } };
    } else if (filter === "7days") {
      where = { createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } };
    } else if (filter === "30days") {
      where = { createdAt: { gte: new Date(now.getTime() - 30 * 86400000) } };
    }

    return await db.adminLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch (e) {
    console.error("[Neon] Get logs error:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

// ====== Count licenses for stats ======
export async function countLicensesInNeon(): Promise<{
  total: number;
  active: number;
  used: number;
  expired: number;
}> {
  try {
    const [total, active, used, expired] = await Promise.all([
      db.licenseKey.count(),
      db.licenseKey.count({ where: { status: "active" } }),
      db.licenseKey.count({ where: { status: "used" } }),
      db.licenseKey.count({ where: { status: "expired" } }),
    ]);
    return { total, active, used, expired };
  } catch (e) {
    console.error("[Neon] Count licenses error:", e instanceof Error ? e.message : String(e));
    return { total: 0, active: 0, used: 0, expired: 0 };
  }
}
