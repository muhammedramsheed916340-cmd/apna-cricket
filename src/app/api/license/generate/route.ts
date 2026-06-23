import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ADMIN_PASSWORD, generateLicenseKey, getPlanExpiry, logActivity } from "@/lib/admin/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { count = 1, plan = "monthly", adminPassword } = body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });
    }

    const keys: string[] = [];
    const expiry = getPlanExpiry(plan);

    for (let i = 0; i < Math.min(count, 500); i++) {
      let key = generateLicenseKey();
      // Ensure uniqueness
      while (await db.licenseKey.findUnique({ where: { key } })) {
        key = generateLicenseKey();
      }
      await db.licenseKey.create({
        data: { key, plan, status: "active", expiresAt: expiry, maxDevices: 1 },
      });
      keys.push(key);
    }

    await logActivity("admin_action", `Generated ${keys.length} ${plan} keys`, {});

    return NextResponse.json({ status: "success", keys, count: keys.length });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
