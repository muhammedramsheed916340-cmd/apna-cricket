import { NextResponse } from "next/server";
import { getAllLicenses } from "@/lib/license-store";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ status: "fail", error: auth.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const plan = url.searchParams.get("plan");

  // Get local keys
  let keys = getAllLicenses();

  // Also try to fetch from Firestore and merge any missing keys
  try {
    const { collection, getDocs } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    const snap = await getDocs(collection(db, "licenses"));
    const firestoreKeys = new Map<string, any>();

    snap.forEach((doc) => {
      const data = doc.data();
      firestoreKeys.set(doc.id, {
        key: data.key || doc.id,
        plan: data.plan || "monthly",
        status: data.status || "active",
        deviceFp: data.deviceFp || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        usageCount: data.usageCount || 0,
        lastUsedAt: data.lastUsedAt ? new Date(data.lastUsedAt).toISOString() : null,
        boundAt: data.boundAt ? new Date(data.boundAt).toISOString() : null,
        activatedAt: data.activatedAt || null,
        createdAt: data.createdAt || null,
        firestoreSynced: true,
      });
    });

    console.log("[License List] Local:", keys.length, "Firestore:", firestoreKeys.size);

    // Merge: add Firestore keys that don't exist locally
    for (const [key, fsKey] of firestoreKeys) {
      if (!keys.find((k) => k.key === key)) {
        keys.push(fsKey);
        console.log("[License List] Added from Firestore:", key);
      }
    }
  } catch (e) {
    console.warn("[License List] Firestore read failed, using local only:", e instanceof Error ? e.message : String(e));
  }

  if (status) keys = keys.filter((k) => k.status === status);
  if (plan) keys = keys.filter((k) => k.plan === plan);

  return NextResponse.json({ status: "success", keys, count: keys.length });
}
