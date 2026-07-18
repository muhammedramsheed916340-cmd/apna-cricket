import { NextResponse } from "next/server";
import { getLogs } from "@/lib/license-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "today";
  const logs = getLogs(filter);
  return NextResponse.json({ status: "success", logs, count: logs.length });
}
