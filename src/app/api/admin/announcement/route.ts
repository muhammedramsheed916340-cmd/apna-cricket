import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ADMIN_PASSWORD, logActivity } from "@/lib/admin/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const announcements = await db.announcement.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ status: "success", announcements });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, message, target, adminPassword } = body;
    if (adminPassword !== ADMIN_PASSWORD) return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });

    const ann = await db.announcement.create({ data: { title, message, target: target || "all", active: true } });
    await logActivity("admin_action", `Announcement: ${title}`, {});
    return NextResponse.json({ status: "success", announcement: ann });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
