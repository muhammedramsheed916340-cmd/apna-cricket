import { NextResponse } from "next/server";
import { getLogs } from "@/lib/license-store";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ status: "fail", error: auth.error }, { status: 401 });
  }
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "today";
  const logs = getLogs(filter);
  return NextResponse.json({ status: "success", logs, count: logs.length });
}
