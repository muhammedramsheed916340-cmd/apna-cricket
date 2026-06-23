import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Body: { action: "toggle"|"delete", id: string, adminPassword: string }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, id, adminPassword } = body as {
      action?: string;
      id?: string;
      adminPassword?: string;
    };

    if (!(await verifyAdminPassword(adminPassword))) {
      return NextResponse.json(
        { status: "fail", message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!id || !action) {
      return NextResponse.json(
        { status: "fail", message: "id and action are required" },
        { status: 400 }
      );
    }

    const ann = await db.announcement.findUnique({ where: { id } });
    if (!ann) {
      return NextResponse.json(
        { status: "fail", message: "Announcement not found" },
        { status: 404 }
      );
    }

    if (action === "toggle") {
      const updated = await db.announcement.update({
        where: { id },
        data: { active: !ann.active },
      });
      await db.activityLog.create({
        data: {
          type: "admin_action",
          message: `Admin ${updated.active ? "enabled" : "disabled"} announcement "${ann.title}"`,
        },
      });
      return NextResponse.json({ status: "success", announcement: updated });
    }
    if (action === "delete") {
      await db.announcement.delete({ where: { id } });
      await db.activityLog.create({
        data: {
          type: "admin_action",
          message: `Admin deleted announcement "${ann.title}"`,
        },
      });
      return NextResponse.json({ status: "success", message: "Deleted" });
    }

    return NextResponse.json(
      { status: "fail", message: "Unknown action" },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json(
      { status: "fail", message: (e as Error).message },
      { status: 500 }
    );
  }
}
