import { NextResponse } from "next/server";
import { ADMIN_PASSWORD, addLog } from "@/lib/admin/helpers";

export const dynamic = "force-dynamic";

// In-memory announcements (not persisted across cold starts)
const announcements: any[] = [];

export async function GET() {
  return NextResponse.json({ status: "success", announcements: announcements.filter((a) => a.active) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, message, target, adminPassword } = body;
    if (adminPassword !== ADMIN_PASSWORD) return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });

    const ann = { id: Date.now().toString(), title, message, target: target || "all", active: true, createdAt: new Date().toISOString() };
    announcements.push(ann);
    addLog("admin_action", `Announcement: ${title}`, {});
    return NextResponse.json({ status: "success", announcement: ann });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
