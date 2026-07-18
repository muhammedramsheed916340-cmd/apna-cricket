import { NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// In-memory announcements (no database)
const announcements: any[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, id, adminPassword } = body as {
      action?: string;
      id?: string;
      adminPassword?: string;
    };

    if (!(await verifyAdminPassword(adminPassword))) {
      return NextResponse.json({ status: "fail", message: "Unauthorized" }, { status: 401 });
    }

    const ann = announcements.find((a) => a.id === id);
    if (!ann) return NextResponse.json({ status: "fail", message: "Not found" });

    if (action === "toggle") ann.active = !ann.active;
    else if (action === "delete") {
      const idx = announcements.indexOf(ann);
      announcements.splice(idx, 1);
    }

    return NextResponse.json({ status: "success", message: `${action} done` });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
