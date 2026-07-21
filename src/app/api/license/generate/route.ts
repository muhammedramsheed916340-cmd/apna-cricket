import { NextResponse } from "next/server";
import { generateLicenseKey, getPlanExpiry, ADMIN_PASSWORD } from "@/lib/admin/helpers";
import { createLicense, getLicense, addLog, getAllLicenses } from "@/lib/license-store";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

// Write licenses to JSON file (works on local dev + Vercel build output)
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
    console.log("[License Generate] Local DB saved:", allKeys.length, "keys to", filePath);
    return true;
  } catch (e) {
    console.error("[License Generate] Local DB save FAILED:", (e as Error).message);
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
    const expiry = getPlanExpiry(plan).toISOString();

    // ====== Step 1: Generate keys in local store ======
    for (let i = 0; i < Math.min(count, 500); i++) {
      let key = generateLicenseKey();
      while (getLicense(key)) {
        key = generateLicenseKey();
      }
      createLicense(key, plan, expiry);
      keys.push(key);
      console.log("[License Generate] Created key:", key, "plan:", plan);
    }

    // ====== Step 2: Persist to local JSON file (MANDATORY) ======
    const localSaved = persistLicenses();
    console.log("[License Generate] Local DB save:", localSaved ? "SUCCESS" : "FAILED");

    if (!localSaved) {
      // Local save failed → rollback all generated keys
      const { deleteLicense } = await import("@/lib/license-store");
      for (const key of keys) {
        deleteLicense(key);
      }
      return NextResponse.json({
        status: "fail",
        error: "Local database save failed. Keys not generated.",
        keys: [],
        count: 0,
        localSaved: false,
        firestoreSaved: 0,
        failedCount: keys.length,
      });
    }

    // ====== Step 3: Save each key to Firestore (MANDATORY) ======
    // Local save succeeded → now sync to Firestore
    // If Firestore fails → rollback from local store too
    const { saveLicenseToFirestore } = await import("@/lib/firestore-collections");
    const { deleteLicense } = await import("@/lib/license-store");

    const validKeys: string[] = [];

    for (const key of keys) {
      const license = getLicense(key);
      if (!license) {
        failedKeys.push(key);
        continue;
      }

      console.log("[License Generate] Saving to Firestore:", key);
      const result = await saveLicenseToFirestore({
        key: license.key,
        plan: license.plan,
        status: license.status,
        deviceFp: license.deviceFp || "",
        expiresAt: new Date(license.expiresAt || "").getTime() || 0,
        boundAt: 0,
        activatedAt: 0,
        appVersion: "1.0.0",
      });

      if (result.success) {
        console.log("[License Generate] Firestore save SUCCESS (verified):", key);
        validKeys.push(key);
      } else {
        console.error("[License Generate] Firestore save FAILED for:", key, "→", result.error);
        // Rollback: delete from local store + re-persist JSON
        deleteLicense(key);
        failedKeys.push(key);
      }
    }

    // Re-persist JSON after any rollbacks
    if (failedKeys.length > 0) {
      persistLicenses();
    }

    addLog("admin_action", `Generated ${validKeys.length}/${keys.length} ${plan} keys (Local: ${localSaved}, Firestore: ${validKeys.length}/${keys.length})`, {});

    // ====== Step 4: Return ONLY successfully saved keys (local + Firestore) ======
    if (validKeys.length === 0 && keys.length > 0) {
      return NextResponse.json({
        status: "fail",
        error: "Firestore save failed for all keys. Keys rolled back from local DB.",
        keys: [],
        count: 0,
        localSaved: false,
        firestoreSaved: 0,
        failedCount: failedKeys.length,
      });
    }

    return NextResponse.json({
      status: "success",
      keys: validKeys,
      count: validKeys.length,
      localSaved: true,
      firestoreSaved: validKeys.length,
      failedCount: failedKeys.length,
    });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
