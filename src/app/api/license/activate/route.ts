import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLicense, updateLicense } from "@/lib/license-store";
import { addLog } from "@/lib/admin/helpers";

export const dynamic = "force-dynamic";

// ====== License Activation API ======
// Activates a license key: verifies it, binds to device, saves to Firestore.
// Activation is ONLY complete after Firestore write succeeds.
// If Firestore write fails → activation fails, localStorage NOT updated.

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { key, deviceFp, appVersion } = body;

    if (!key || !deviceFp) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "Key and device ID required",
      });
    }

    const licenseKey = String(key).toUpperCase().trim();
    const deviceId = String(deviceFp);

    // ====== Step 1: Verify license exists in local store ======
    const license = getLicense(licenseKey);

    if (!license) {
      addLog("key_activate", `Invalid key: ${licenseKey}`, { deviceId });
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "Invalid license key",
        code: "INVALID_KEY",
      });
    }

    // ====== Step 2: Check if revoked/suspended ======
    if (license.status === "revoked" || license.status === "suspended") {
      addLog("key_activate", `Revoked/suspended key: ${licenseKey}`, { deviceId });
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: `License ${license.status}`,
        code: license.status.toUpperCase(),
      });
    }

    // ====== Step 3: Check expiry ======
    const now = Date.now();
    if (license.expiresAt && license.expiresAt < now) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "License expired",
        code: "EXPIRED",
      });
    }

    // ====== Step 4: Check device binding (prevent duplicate activation) ======
    if (license.deviceFp && license.deviceFp !== deviceId) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "License already bound to different device",
        code: "DEVICE_MISMATCH",
      });
    }

    // ====== Step 5: Update local store (bind device) ======
    const activatedAt = now;
    updateLicense(licenseKey, {
      deviceFp: deviceId,
      status: "used",
      boundAt: activatedAt,
      activatedAt,
      usageCount: (license.usageCount || 0) + 1,
      lastUsedAt: now,
    });

    // ====== Step 6: Save to Firestore (server-side) — MANDATORY ======
    // This is the CRITICAL step — activation only completes if Firestore write succeeds.
    let firestoreSuccess = false;
    let firestoreError = "";

    try {
      console.log("[License Activate] Step 6: Importing Firestore modules...");
      const { saveLicenseToFirestore, saveDeviceToFirestore, testFirestoreConnection } = await import("@/lib/firestore-collections");

      // Step 6a: Test Firestore connection first
      console.log("[License Activate] Step 6a: Testing Firestore connection...");
      const connTest = await testFirestoreConnection();
      console.log("[License Activate] Connection test:", JSON.stringify(connTest));

      if (!connTest.connected) {
        firestoreError = `Firestore connection failed: ${connTest.error || "unknown"}`;
        console.error("[License Activate] Firestore connection FAILED:", firestoreError);
      } else {
        // Step 6b: Save license to Firestore
        const licenseData = {
          key: licenseKey,
          plan: license.plan || "free",
          status: "active",
          deviceFp: deviceId,
          expiresAt: license.expiresAt || 0,
          boundAt: activatedAt,
          activatedAt,
          appVersion: appVersion || "1.0.0",
        };

        console.log("[License Activate] Step 6b: Saving license to Firestore:", JSON.stringify(licenseData));
        const result = await saveLicenseToFirestore(licenseData);

        if (result.success) {
          console.log("[License Activate] License saved to Firestore successfully");

          // Step 6c: Also save device record
          console.log("[License Activate] Step 6c: Saving device record...");
          const deviceResult = await saveDeviceToFirestore({
            deviceId,
            licenseKey,
            plan: license.plan || "free",
            boundAt: activatedAt,
          });

          if (deviceResult.success) {
            console.log("[License Activate] Device record saved successfully");
            firestoreSuccess = true;
          } else {
            // License saved but device record failed — still count as success
            // (device record is secondary)
            console.warn("[License Activate] Device record save failed (non-blocking):", deviceResult.error);
            firestoreSuccess = true;
          }
        } else {
          firestoreError = result.error || "Firestore write failed (no error detail)";
          console.error("[License Activate] License save to Firestore FAILED:", firestoreError);
        }
      }
    } catch (e) {
      firestoreError = e instanceof Error ? e.message : String(e);
      console.error("[License Activate] Firestore EXCEPTION:", firestoreError);
      console.error("[License Activate] Full exception:", e);
    }

    // ====== Step 7: Firestore save is MANDATORY — server is single source of truth ======
    // If Firestore write fails → activation FAILS. No local fallback. No premium unlock.
    if (!firestoreSuccess) {
      // Rollback local store change (un-bind device)
      updateLicense(licenseKey, {
        deviceFp: license.deviceFp || null,
        status: license.status || "active",
        boundAt: license.boundAt || null,
        activatedAt: license.activatedAt || null,
      });

      addLog("key_activate", `License activation FAILED (Firestore): ${licenseKey}`, {
        deviceId,
        plan: license.plan,
        error: firestoreError,
      });

      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "Server activation failed. Please try again.",
        code: "DB_WRITE_FAILED",
        error: firestoreError,
      });
    }

    // ====== Step 8: Firestore save succeeded → complete activation ======
    addLog("key_activate", `License activated (Firestore saved): ${licenseKey}`, {
      deviceId,
      plan: license.plan,
      firestoreSaved: true,
    });

    // Set httpOnly cookie for server-side premium API verification
    const cookieStore = await cookies();
    cookieStore.set("tg_license_key", licenseKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90, // 90 days
    });

    // Return success with plan + features
    const PLAN_FEATURES: Record<string, string[]> = {
      free: ["basic_teams", "limited_features"],
      match_pass: ["20_teams", "unlimited_transfer", "priority_server", "1_match_access"],
      daily: ["40_teams", "dream11", "my11circle", "ai_captain", "live_updates", "24h_access", "join_contest", "smart_mix_join", "premium_research", "auto_replace"],
      weekly: ["40_teams", "dream11", "my11circle", "ai_captain", "live_updates", "7d_access", "join_contest", "smart_mix_join", "premium_research", "auto_replace"],
      monthly: ["40_teams", "dream11", "my11circle", "auto_transfer", "premium_research", "priority_ai", "30d_access", "join_contest", "smart_mix_join", "auto_replace"],
      elite: ["500_teams", "elite_ai", "rank1_strategy", "vip_servers", "premium_support", "fastest_processing", "exclusive_features", "90d_access", "join_contest", "smart_mix_join", "auto_transfer", "auto_replace", "premium_research"],
      free_offer: ["40_teams", "dream11", "my11circle", "auto_transfer", "join_contest", "smart_mix_join", "premium_research", "ai_captain", "auto_replace", "priority_server", "24h_access"],
    };

    const plan = license.plan || "free";
    const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

    return NextResponse.json({
      status: "success",
      valid: true,
      plan,
      features,
      expiresAt: license.expiresAt || null,
      activatedAt,
      message: "License activated successfully. Server verification passed.",
      firestoreSaved: true,
    });
  } catch (e) {
    console.error("[License Activate] Error:", e);
    return NextResponse.json(
      { status: "fail", valid: false, message: (e as Error).message },
      { status: 500 }
    );
  }
}
