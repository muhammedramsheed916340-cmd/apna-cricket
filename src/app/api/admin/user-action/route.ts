import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Body: { action: "ban"|"unban"|"delete", userId: string, adminPassword: string }
export async function POST(req: Request) {
  let ip = "";
  try {
    ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
  } catch {}

  try {
    const body = await req.json().catch(() => ({}));
    const { action, userId, adminPassword } = body as {
      action?: string;
      userId?: string;
      adminPassword?: string;
    };

    if (!(await verifyAdminPassword(adminPassword))) {
      return NextResponse.json(
        { status: "fail", message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!userId || !action) {
      return NextResponse.json(
        { status: "fail", message: "userId and action are required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { status: "fail", message: "User not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "ban":
        await db.user.update({
          where: { id: userId },
          data: { banned: true },
        });
        await db.activityLog.create({
          data: {
            type: "admin_action",
            message: `Admin banned user ${user.email}`,
            ip,
          },
        });
        return NextResponse.json({ status: "success", message: "Banned" });
      case "unban":
        await db.user.update({
          where: { id: userId },
          data: { banned: false },
        });
        await db.activityLog.create({
          data: {
            type: "admin_action",
            message: `Admin unbanned user ${user.email}`,
            ip,
          },
        });
        return NextResponse.json({ status: "success", message: "Unbanned" });
      case "delete":
        await db.user.delete({ where: { id: userId } });
        await db.activityLog.create({
          data: {
            type: "admin_action",
            message: `Admin deleted user ${user.email}`,
            ip,
          },
        });
        return NextResponse.json({ status: "success", message: "Deleted" });
      default:
        return NextResponse.json(
          { status: "fail", message: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (e) {
    return NextResponse.json(
      { status: "fail", message: (e as Error).message },
      { status: 500 }
    );
  }
}
