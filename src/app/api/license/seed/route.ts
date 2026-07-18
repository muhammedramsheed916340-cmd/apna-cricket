import { NextResponse } from "next/server";
import { ADMIN_PASSWORD } from "@/lib/admin/helpers";
import { getLicense, createLicense, countLicenses, addLog } from "@/lib/license-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password");

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });
    }

    const existingCount = countLicenses();
    if (existingCount > 0) {
      return NextResponse.json({ status: "success", message: `Already has ${existingCount} keys`, totalKeys: existingCount });
    }

    const { generateLicenseKey, getPlanExpiry } = await import("@/lib/admin/helpers");
    const keys: string[] = [];
    const expiry = getPlanExpiry("monthly").toISOString();
    for (let i = 0; i < 50; i++) {
      let key = generateLicenseKey();
      while (getLicense(key)) key = generateLicenseKey();
      createLicense(key, "monthly", expiry);
      keys.push(key);
    }
    addLog("admin_action", `Seeded ${keys.length} keys`, {});
    return NextResponse.json({ status: "success", message: `Seeded ${keys.length} keys`, totalKeys: keys.length, keys });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
