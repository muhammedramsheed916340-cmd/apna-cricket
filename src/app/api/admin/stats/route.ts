import { NextResponse } from "next/server";
import { countLicenses, countDevices, countTodayVerifications, countTodayTeamGen } from "@/lib/license-store";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ status: "fail", error: auth.error }, { status: 401 });
  }
  try {
    const totalKeys = countLicenses();
    const activeKeys = countLicenses({ status: "active" });
    const usedKeys = countLicenses({ status: "used" });
    const expiredKeys = countLicenses({ status: "expired" });
    const activeDevices = countDevices();
    const todayVerifications = countTodayVerifications();
    const totalUsers = 0;
    const teamsToday = countTodayTeamGen();

    return NextResponse.json({
      status: "success",
      stats: { totalKeys, activeKeys, usedKeys, expiredKeys, activeDevices, todayVerifications, totalUsers, teamsToday },
    });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
