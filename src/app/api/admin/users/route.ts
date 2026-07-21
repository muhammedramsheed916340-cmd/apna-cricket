import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

// In-memory users (no database needed)
const users: any[] = [];

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ status: "fail", error: auth.error }, { status: 401 });
  }
  return NextResponse.json({ status: "success", users });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId } = body;
    const user = users.find((u) => u.id === userId);
    if (!user) return NextResponse.json({ status: "fail", error: "User not found" });

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
