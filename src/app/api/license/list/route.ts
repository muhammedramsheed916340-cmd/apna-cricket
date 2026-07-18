import { NextResponse } from "next/server";
import { getAllLicenses } from "@/lib/license-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const plan = url.searchParams.get("plan");

  let keys = getAllLicenses();
  if (status) keys = keys.filter((k) => k.status === status);
  if (plan) keys = keys.filter((k) => k.plan === plan);

  return NextResponse.json({ status: "success", keys, count: keys.length });
}
