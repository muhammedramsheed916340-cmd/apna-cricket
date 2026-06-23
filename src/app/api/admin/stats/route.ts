import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const totalKeys = await db.licenseKey.count();
    const activeKeys = await db.licenseKey.count({ where: { status: "active" } });
    const usedKeys = await db.licenseKey.count({ where: { status: "used" } });
    const expiredKeys = await db.licenseKey.count({ where: { status: "expired" } });
    const activeDevices = await db.licenseKey.count({ where: { deviceFp: { not: null } } });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayVerifications = await db.activityLog.count({ where: { type: "key_verify", createdAt: { gte: todayStart } } });
    const totalUsers = await db.user.count();
    const teamsToday = await db.activityLog.count({ where: { type: "team_gen", createdAt: { gte: todayStart } } });

    return NextResponse.json({
      status: "success",
      stats: { totalKeys, activeKeys, usedKeys, expiredKeys, activeDevices, todayVerifications, totalUsers, teamsToday },
    });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
