import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getAllLicensesFromNeon } from "@/lib/neon-store";
import { getAllLicenses } from "@/lib/license-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ status: "fail", error: auth.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const plan = url.searchParams.get("plan");

  // Primary: Load from Neon PostgreSQL
  let keys: any[] = [];

  try {
    keys = await getAllLicensesFromNeon();
    console.log("[License List] Loaded from Neon:", keys.length, "keys");
  } catch (e) {
    console.error("[License List] Neon load failed, falling back to local:", e instanceof Error ? e.message : String(e));
    // Fallback: Load from local store
    keys = getAllLicenses();
  }

  // Merge any local-only keys (not yet in Neon)
  const localKeys = getAllLicenses();
  const neonKeySet = new Set(keys.map(k => k.key));
  for (const lk of localKeys) {
    if (!neonKeySet.has(lk.key)) {
      keys.push({
        key: lk.key,
        plan: lk.plan,
        status: lk.status,
        deviceFp: lk.deviceFp,
        expiresAt: lk.expiresAt,
        usageCount: lk.usageCount,
        lastUsedAt: lk.lastUsedAt,
        boundAt: lk.boundAt,
        createdAt: lk.createdAt,
        createdBy: lk.createdBy,
        updatedAt: lk.updatedAt,
      });
    }
  }

  if (status) keys = keys.filter((k) => k.status === status);
  if (plan) keys = keys.filter((k) => k.plan === plan);

  return NextResponse.json({ status: "success", keys, count: keys.length });
}
