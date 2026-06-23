import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const devices = await db.licenseKey.findMany({
    where: { deviceFp: { not: null } },
    select: { key: true, deviceFp: true, boundAt: true, lastUsedAt: true, status: true, plan: true },
    orderBy: { boundAt: "desc" },
  });
  return NextResponse.json({ status: "success", devices });
}
