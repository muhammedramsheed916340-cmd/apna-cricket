import { NextResponse } from "next/server";
import { getAllLicenses } from "@/lib/license-store";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

// ====== Firebase Sync API ======
// Syncs ALL local license keys to Firestore.
// Uploads missing keys, updates changed keys.
// Returns progress + success/failure counts.

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json({ status: "fail", error: auth.error }, { status: 401 });
    }

    const allKeys = getAllLicenses();
    console.log("[Firebase Sync] Starting sync for", allKeys.length, "keys");

    const { saveLicenseToFirestore } = await import("@/lib/firestore-collections");

    let synced = 0;
    let failed = 0;
    const failedKeys: string[] = [];

    for (const license of allKeys) {
      const result = await saveLicenseToFirestore({
        key: license.key,
        plan: license.plan,
        status: license.status,
        deviceFp: license.deviceFp || "",
        expiresAt: new Date(license.expiresAt || "").getTime() || 0,
        boundAt: license.boundAt ? new Date(license.boundAt).getTime() : 0,
        activatedAt: 0,
        appVersion: "1.0.0",
      });

      if (result.success) {
        synced++;
      } else {
        failed++;
        failedKeys.push(license.key);
        console.error("[Firebase Sync] Failed for", license.key, ":", result.error);
      }
    }

    console.log("[Firebase Sync] Complete: synced=", synced, "failed=", failed);

    return NextResponse.json({
      status: "success",
      total: allKeys.length,
      synced,
      failed,
      failedKeys: failedKeys.slice(0, 10), // first 10 failed keys
    });
  } catch (e) {
    return NextResponse.json(
      { status: "fail", error: (e as Error).message },
      { status: 500 }
    );
  }
}
