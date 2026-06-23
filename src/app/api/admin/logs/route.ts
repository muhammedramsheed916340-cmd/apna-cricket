import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "today";
  const now = new Date();
  let gte = new Date(0);
  if (filter === "today") { gte = new Date(); gte.setHours(0, 0, 0, 0); }
  else if (filter === "7days") gte = new Date(now.getTime() - 7 * 86400000);
  else if (filter === "30days") gte = new Date(now.getTime() - 30 * 86400000);

  const logs = await db.activityLog.findMany({
    where: { createdAt: { gte } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ status: "success", logs, count: logs.length });
}
