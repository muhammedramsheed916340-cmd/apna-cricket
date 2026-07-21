import { NextResponse } from "next/server";
import { addLog } from "@/lib/admin/helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ====== Free Offer Key Activation (Neon PostgreSQL) ======
// Validates: key exists, enabled, not expired, count < maxUsers, device not previously activated

const PRO_FEATURES = [
  "40_teams", "dream11", "my11circle", "auto_transfer", "join_contest",
  "smart_mix_join", "premium_research", "ai_captain", "auto_replace",
  "priority_server", "24h_access",
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { key, deviceFp, userId } = body;

    if (!key || !deviceFp) {
      return NextResponse.json({ status: "fail", valid: false, message: "Key and device ID required" });
    }

    // Step 1: Find key in Neon
    const offerKey = await db.licenseKey.findUnique({
      where: { key: key.toUpperCase().trim() },
    });

    if (!offerKey || offerKey.keyType !== "free_offer") {
      return NextResponse.json({ status: "fail", valid: false, message: "Invalid free offer key", code: "INVALID_KEY" });
    }

    // Step 2: Check enabled
    if (offerKey.status !== "active") {
      return NextResponse.json({ status: "fail", valid: false, message: `Free offer key is ${offerKey.status}`, code: "DISABLED" });
    }

    // Step 3: Check not expired
    const now = Date.now();
    if (offerKey.expiresAt && offerKey.expiresAt.getTime() < now) {
      await db.licenseKey.update({ where: { key: offerKey.key }, data: { status: "expired" } });
      return NextResponse.json({ status: "fail", valid: false, message: "This free offer key has expired", code: "EXPIRED" });
    }

    // Step 4: Check activation count
    const maxUsers = offerKey.maxUsers || 100;
    const currentCount = offerKey.activationCount || 0;
    if (currentCount >= maxUsers) {
      return NextResponse.json({ status: "fail", valid: false, message: `Maximum activations reached (${maxUsers}/${maxUsers})`, code: "MAX_REACHED" });
    }

    // Step 5: Check device not already bound
    if (offerKey.deviceFp && offerKey.deviceFp === deviceFp) {
      // Already activated on this device — check if still valid
      if (offerKey.boundAt) {
        const expiryAt = offerKey.boundAt.getTime() + (offerKey.validityHours || 24) * 60 * 60 * 1000;
        if (now < expiryAt) {
          return NextResponse.json({
            status: "success", valid: true, plan: "free_offer", features: PRO_FEATURES,
            expiresAt: expiryAt, activatedAt: offerKey.boundAt.getTime(),
            message: "Free offer already active on this device",
            remainingTime: Math.max(0, expiryAt - now),
          });
        }
      }
      return NextResponse.json({ status: "fail", valid: false, message: "This device has already used this free offer key", code: "DEVICE_USED" });
    }

    if (offerKey.deviceFp && offerKey.deviceFp !== deviceFp) {
      return NextResponse.json({ status: "fail", valid: false, message: "Free offer key bound to different device", code: "DEVICE_MISMATCH" });
    }

    // Step 6: Activate — bind device + increment count
    const activatedAt = now;
    const expiryAt = now + (offerKey.validityHours || 24) * 60 * 60 * 1000;

    await db.licenseKey.update({
      where: { key: offerKey.key },
      data: {
        deviceFp,
        boundAt: new Date(activatedAt),
        activationCount: currentCount + 1,
        status: "used",
      },
    });

    // Verify update
    const updated = await db.licenseKey.findUnique({ where: { key: offerKey.key } });
    if (!updated || updated.activationCount !== currentCount + 1) {
      return NextResponse.json({ status: "fail", valid: false, message: "Database update verification failed", code: "DB_VERIFY_FAILED" });
    }

    addLog("free_offer", `Activated free offer key: ${offerKey.key}`, { deviceFp, activationCount: updated.activationCount });

    return NextResponse.json({
      status: "success", valid: true, plan: "free_offer", features: PRO_FEATURES,
      expiresAt: expiryAt, activatedAt,
      message: "Free offer key activated! PRO features unlocked.",
      remainingTime: (offerKey.validityHours || 24) * 60 * 60 * 1000,
      activationCount: updated.activationCount, maxUsers,
    });
  } catch (e) {
    return NextResponse.json({ status: "fail", valid: false, message: (e as Error).message }, { status: 500 });
  }
}
