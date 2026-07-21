import { NextResponse } from "next/server";
import { generateLicenseKey, getPlanExpiry, ADMIN_PASSWORD } from "@/lib/admin/helpers";
import { createLicense, getLicense, addLog, getAllLicenses, deleteLicense } from "@/lib/license-store";
import { createLicenseInNeon, verifyLicenseInNeon, deleteLicenseFromNeon } from "@/lib/neon-store";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

// Write licenses to JSON file (fallback for cold starts)
function persistLicenses() {
  try {
    const allKeys = getAllLicenses().map(k => ({
      key: k.key,
      plan: k.plan,
      status: k.status,
      deviceFp: k.deviceFp,
      expiresAt: k.expiresAt,
      usageCount: k.usageCount,
      lastUsedAt: k.lastUsedAt,
      boundAt: k.boundAt,
      createdAt: k.createdAt,
      createdBy: k.createdBy,
      updatedAt: k.updatedAt,
    }));
    const filePath = path.join(process.cwd(), "src/lib/licenses.json");
    fs.writeFileSync(filePath, JSON.stringify(allKeys, null, 2));
    return true;
  } catch (e) {
    console.error("[License Generate] Local JSON save FAILED:", (e as Error).message);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { count = 1, plan = "monthly", adminPassword } = body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });
    }

    const keys: string[] = [];
    const failedKeys: string[] = [];
    const errors: string[] = [];
    const expiry = getPlanExpiry(plan);

    // ====== Step 1: Generate + save to Neon (PRIMARY) ======
    for (let i = 0; i < Math.min(count, 500); i++) {
      let key = generateLicenseKey();
      while (getLicense(key)) {
        key = generateLicenseKey();
      }

      // Save to Neon PostgreSQL
      const neonResult = await createLicenseInNeon({
        key,
        plan,
        expiresAt: expiry,
        createdBy: "admin",
      });

      if (!neonResult.success) {
        console.error("[License Generate] Neon save FAILED:", key, "→", neonResult.error);
        failedKeys.push(key);
        errors.push(`${key}: ${neonResult.error}`);
        continue;
      }

      // ====== Step 2: Read-back verify from Neon ======
      const verified = await verifyLicenseInNeon(key);
      if (!verified) {
        console.error("[License Generate] Neon read-back verify FAILED:", key);
        // Rollback from Neon
        await deleteLicenseFromNeon(key);
        failedKeys.push(key);
        errors.push(`${key}: Read-back verification failed`);
        continue;
      }

      console.log("[License Generate] Neon save + verify SUCCESS:", key);

      // Also add to local in-memory store (for fast lookups)
      createLicense(key, plan, expiry.toISOString());

      keys.push(key);
    }

    // ====== Step 3: Persist to local JSON (backup) ======
    const localSaved = persistLicenses();
    console.log("[License Generate] Local JSON backup:", localSaved ? "OK" : "SKIPPED");

    // ====== Step 4: Return result ======
    addLog("admin_action", `Generated ${keys.length}/${count} ${plan} keys (Neon: ${keys.length}, Failed: ${failedKeys.length})`, {});

    // ====== Firebase Sync: sync new keys to Firestore (backup, non-blocking) ======
    if (keys.length > 0) {
      try {
        const { saveLicenseToFirestore } = await import("@/lib/firestore-collections");
        for (const key of keys) {
          const license = getLicense(key);
          if (license) {
            saveLicenseToFirestore({
              key: license.key,
              plan: license.plan,
              status: license.status,
              deviceFp: license.deviceFp || "",
              expiresAt: new Date(license.expiresAt || "").getTime() || 0,
              boundAt: 0,
              activatedAt: 0,
              appVersion: "1.0.0",
            }).then(r => {
              if (r.success) console.log("[License Generate] Firebase sync OK:", key);
              else console.warn("[License Generate] Firebase sync failed:", key, r.error);
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.warn("[License Generate] Firebase sync skipped:", e instanceof Error ? e.message : String(e));
      }
    }

    if (keys.length === 0 && count > 0) {
      return NextResponse.json({
        status: "fail",
        error: errors[0] || "Database insert failed. Check Neon connection.",
        keys: [],
        count: 0,
        neonSaved: 0,
        localSaved,
        failedCount: failedKeys.length,
        errors,
      });
    }

    return NextResponse.json({
      status: "success",
      keys,
      count: keys.length,
      neonSaved: keys.length,
      localSaved,
      firestoreSaved: 0, // Firestore sync is optional/separate
      failedCount: failedKeys.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[License Generate] Exception:", error);
    return NextResponse.json({ status: "fail", error: `Database error: ${error}` }, { status: 500 });
  }
}
