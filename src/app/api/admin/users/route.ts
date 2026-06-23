import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ status: "success", users });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId } = body;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ status: "fail", error: "User not found" });

    if (action === "ban") await db.user.update({ where: { id: userId }, data: { banned: true } });
    else if (action === "unban") await db.user.update({ where: { id: userId }, data: { banned: false } });
    else if (action === "delete") { await db.user.delete({ where: { id: userId } }); return NextResponse.json({ status: "success", message: "Deleted" }); }
    else if (action === "reset_license") await db.user.update({ where: { id: userId }, data: { licenseKey: null } });
    else if (action === "reset_device") await db.user.update({ where: { id: userId }, data: { deviceFp: null } });

    return NextResponse.json({ status: "success", message: `${action} done` });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
