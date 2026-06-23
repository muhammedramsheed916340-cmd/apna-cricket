import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const plan = url.searchParams.get("plan");

  const where: any = {};
  if (status) where.status = status;
  if (plan) where.plan = plan;

  const keys = await db.licenseKey.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ status: "success", keys, count: keys.length });
}
