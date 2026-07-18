import { NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// In-memory users (no database)
const users: any[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, userId, adminPassword } = body as {
      action?: string;
      userId?: string;
      adminPassword?: string;
    };

    if (!(await verifyAdminPassword(adminPassword))) {
      return NextResponse.json({ status: "fail", message: "Unauthorized" }, { status: 401 });
    }

    const user = users.find((u) => u.id === userId);
    if (!user) return NextResponse.json({ status: "fail", message: "User not found" });

    if (action === "ban") user.banned = true;
    else if (action === "unban") user.banned = false;
    else if (action === "delete") {
      const idx = users.indexOf(user);
      users.splice(idx, 1);
      return NextResponse.json({ status: "success", message: "Deleted" });
    }
    else if (action === "reset_license") user.licenseKey = null;
    else if (action === "reset_device") user.deviceFp = null;

    return NextResponse.json({ status: "success", message: `${action} done` });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
