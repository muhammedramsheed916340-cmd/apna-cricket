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
    }));
    const filePath = path.join(process.cwd(), "src/lib/licenses.json");
    fs.writeFileSync(filePath, JSON.stringify(allKeys, null, 2));
    return true;
  } catch (e) {
    console.error("[License] Failed to persist:", (e as Error).message);
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

    // ====== Step 2: Persist to JSON file ======
    const persisted = persistLicenses();
    console.log("[License Generate] Persisted to JSON:", persisted);

    // ====== Step 3: Save each key to Firestore (MANDATORY) ======
    // If Firestore save fails for a key → rollback that key from local store
    // → key NOT returned to user → user never sees a key that isn't in Firestore
    const { saveLicenseToFirestore } = await import("@/lib/firestore-collections");

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
        // Rollback: delete from local store so it doesn't appear in list
        const { deleteLicense } = await import("@/lib/license-store");
        deleteLicense(key);
        failedKeys.push(key);
      }
    }

    // Re-persist JSON after any rollbacks
    if (failedKeys.length > 0) {
      persistLicenses();
    }

    addLog("admin_action", `Generated ${validKeys.length}/${keys.length} ${plan} keys (Firestore verified, ${failedKeys.length} failed)`, {});

    // ====== Step 4: Return ONLY successfully saved keys ======
    if (validKeys.length === 0 && keys.length > 0) {
      return NextResponse.json({
        status: "fail",
        error: "Firestore save failed for all keys. Check Firebase rules and try again.",
        keys: [],
        count: 0,
        persisted,
        firestoreSaved: 0,
        failedCount: failedKeys.length,
      });
    }

    return NextResponse.json({
      status: "success",
      keys: validKeys,
      count: validKeys.length,
      persisted,
      firestoreSaved: validKeys.length,
      failedCount: failedKeys.length,
    });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
