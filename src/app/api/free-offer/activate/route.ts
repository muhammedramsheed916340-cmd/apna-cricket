import { NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/license-store";
import { addLog } from "@/lib/admin/helpers";

export const dynamic = "force-dynamic";

// ====== Free Offer Key Activation ======
// Validates: key exists, enabled, not expired, count < 100, device not previously activated
// On success: creates a temporary license with PRO features for 24h

interface FreeOfferKey {
  key: string;
  enabled: boolean;
  validityHours: number;
  maxUsers: number;
  activationCount: number;
  createdAt: number;
  expiryDate: number;
  activatedDevices: { deviceId: string; userId: string; activatedAt: number; expiryAt: number }[];
}

function getFreeOfferKeys(): FreeOfferKey[] {
  const settings = getAllSettings();
  try {
    const raw = settings.free_offer_keys as string;
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveFreeOfferKeys(keys: FreeOfferKey[]): void {
  setSetting("free_offer_keys", JSON.stringify(keys));
}

// PRO plan features (unlocked for 24h by free offer key)
const PRO_FEATURES = [
  "40_teams",
  "dream11",
  "my11circle",
  "auto_transfer",
  "join_contest",
  "smart_mix_join",
  "premium_research",
  "ai_captain",
  "auto_replace",
  "priority_server",
  "24h_access",
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { key, deviceFp, userId } = body;

    if (!key || !deviceFp) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "Key and device ID required",
      });
    }

    const keys = getFreeOfferKeys();
    const offerKey = keys.find(k => k.key === key.toUpperCase().trim());

    // 1. Key exists
    if (!offerKey) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "Invalid free offer key",
        code: "INVALID_KEY",
      });
    }

    // 2. Key enabled
    if (!offerKey.enabled) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "This free offer key has been disabled",
        code: "DISABLED",
      });
    }

    // 3. Key not expired
    const now = Date.now();
    if (now > offerKey.expiryDate) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "This free offer key has expired",
        code: "EXPIRED",
      });
    }

    // 4. Activation count < maxUsers
    if (offerKey.activationCount >= offerKey.maxUsers) {
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "This free offer key has reached maximum activations (100/100)",
        code: "MAX_REACHED",
      });
    }

    // 5. Device not previously activated
    const existingActivation = offerKey.activatedDevices.find(d => d.deviceId === deviceFp);
    if (existingActivation) {
      // Check if previous activation still valid
      if (now < existingActivation.expiryAt) {
        // Return existing activation details
        return NextResponse.json({
          status: "success",
          valid: true,
          plan: "free_offer",
          features: PRO_FEATURES,
          expiresAt: existingActivation.expiryAt,
          activatedAt: existingActivation.activatedAt,
          message: "Free offer already active on this device",
          remainingTime: Math.max(0, existingActivation.expiryAt - now),
        });
      }
      // Previous activation expired — allow re-activation? No, one device = one activation
      return NextResponse.json({
        status: "fail",
        valid: false,
        message: "This device has already used this free offer key",
        code: "DEVICE_USED",
      });
    }

    // ====== All checks passed — activate ======
    const activatedAt = now;
    const expiryAt = now + offerKey.validityHours * 60 * 60 * 1000;

    // Add device to activated list
    offerKey.activatedDevices.push({
      deviceId: deviceFp,
      userId: userId || "unknown",
      activatedAt,
      expiryAt,
    });
    offerKey.activationCount += 1;

    // Save updated key
    const keyIndex = keys.findIndex(k => k.key === offerKey.key);
    keys[keyIndex] = offerKey;
    saveFreeOfferKeys(keys);

    addLog("free_offer", `Activated free offer key: ${offerKey.key}`, {
      deviceFp,
      activationCount: offerKey.activationCount,
      expiryAt,
    });

    return NextResponse.json({
      status: "success",
      valid: true,
      plan: "free_offer",
      features: PRO_FEATURES,
      expiresAt: expiryAt,
      activatedAt,
      message: "Free offer key activated! PRO features unlocked for 24 hours.",
      remainingTime: offerKey.validityHours * 60 * 60 * 1000,
      activationCount: offerKey.activationCount,
      maxUsers: offerKey.maxUsers,
    });
  } catch (e) {
    return NextResponse.json(
      { status: "fail", valid: false, message: (e as Error).message },
      { status: 500 }
    );
  }
}
