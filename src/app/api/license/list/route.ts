import { NextResponse } from "next/server";
import { getAllLicenses } from "@/lib/license-store";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Require admin auth — license keys are sensitive (would allow full bypass)
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ status: "fail", error: auth.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const plan = url.searchParams.get("plan");

  let keys = getAllLicenses();
  if (status) keys = keys.filter((k) => k.status === status);
  if (plan) keys = keys.filter((k) => k.plan === plan);

  return NextResponse.json({ status: "success", keys, count: keys.length });
}
