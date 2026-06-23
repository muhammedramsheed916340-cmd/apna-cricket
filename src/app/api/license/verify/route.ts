import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/admin/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, deviceFp } = body;

    if (!key || !deviceFp) {
      return NextResponse.json({ status: "fail", message: "Key and device ID required" });
    }

    const license = await db.licenseKey.findUnique({ where: { key: key.toUpperCase().trim() } });

    if (!license) {
      await logActivity("key_verify", `Invalid key: ${key}`, { deviceFp });
      return NextResponse.json({ status: "fail", message: "❌ Invalid RMSMT License Key" });
    }

    if (license.status === "suspended") {
      return NextResponse.json({ status: "fail", message: "❌ License suspended. Contact admin." });
    }

    // Check expiry
    if (license.expiresAt && new Date() > license.expiresAt) {
      await db.licenseKey.update({ where: { id: license.id }, data: { status: "expired" } });
      return NextResponse.json({ status: "fail", message: "❌ License expired" });
    }

    // Device binding check
    if (license.deviceFp && license.deviceFp !== deviceFp) {
      await logActivity("key_verify", `Device mismatch for ${key}`, { deviceFp, licenseKey: key });
      return NextResponse.json({ status: "fail", message: "❌ License bound to another device" });
    }

    // Bind device if not bound
    if (!license.deviceFp) {
      await db.licenseKey.update({
        where: { id: license.id },
        data: { deviceFp, boundAt: new Date(), status: "used", usageCount: { increment: 1 }, lastUsedAt: new Date() },
      });
      await logActivity("device_bind", `Device bound to ${key}`, { deviceFp, licenseKey: key });
    } else {
      await db.licenseKey.update({
        where: { id: license.id },
        data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      });
    }

    await logActivity("key_verify", `✅ Verified: ${key}`, { deviceFp, licenseKey: key });

    return NextResponse.json({
      status: "success",
      message: "✅ RMSMT License Verified Successfully",
      plan: license.plan,
      expiresAt: license.expiresAt,
    });
  } catch (e) {
    return NextResponse.json({ status: "fail", message: (e as Error).message }, { status: 500 });
  }
}
