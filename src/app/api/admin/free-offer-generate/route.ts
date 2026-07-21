import { NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/license-store";
import { addLog } from "@/lib/admin/helpers";

export const dynamic = "force-dynamic";

// ====== Free Offer Key System ======
// Admin generates a free offer key (e.g. FREE-24H-ABCD-XYZ1)
// Up to 100 users can activate it for 24 hours of PRO features.
// After 24h or 100 activations, key automatically expires.

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

// Get all free offer keys from settings
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

// Generate a free offer key
function generateKey(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const segment = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FREE-24H-${segment(4)}-${segment(4)}`;
}

// ====== POST: Generate a new free offer key (admin only) ======
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { adminPassword, validityHours = 24, maxUsers = 100, planFeatures } = body;

    // Verify admin password
    if (adminPassword !== "8950888988") {
      return NextResponse.json(
        { status: "fail", error: "Unauthorized" },
        { status: 401 }
      );
    }

    const hours = Math.max(1, Math.min(validityHours, 720)); // 1h to 30d
    const maxU = Math.max(1, Math.min(maxUsers, 1000)); // 1 to 1000

    const newKey: FreeOfferKey = {
      key: generateKey(),
      enabled: true,
      validityHours: hours,
      maxUsers: maxU,
      activationCount: 0,
      createdAt: Date.now(),
      expiryDate: Date.now() + hours * 60 * 60 * 1000,
      activatedDevices: [],
    };

    const keys = getFreeOfferKeys();
    keys.push(newKey);
    saveFreeOfferKeys(keys);

    addLog("free_offer", `Generated free offer key: ${newKey.key}`, { validityHours: hours, maxUsers: maxU });

    return NextResponse.json({
      status: "success",
      key: newKey.key,
      validityHours: hours,
      maxUsers: maxU,
      expiryDate: newKey.expiryDate,
    });
  } catch (e) {
    return NextResponse.json(
      { status: "fail", error: (e as Error).message },
      { status: 500 }
    );
  }
}

// ====== GET: List all free offer keys (admin only) ======
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const adminPassword = url.searchParams.get("adminPassword");

    if (adminPassword !== "8950888988") {
      return NextResponse.json(
        { status: "fail", error: "Unauthorized" },
        { status: 401 }
      );
    }

    const keys = getFreeOfferKeys().map(k => ({
      key: k.key,
      enabled: k.enabled,
      validityHours: k.validityHours,
      maxUsers: k.maxUsers,
      activationCount: k.activationCount,
      createdAt: k.createdAt,
      expiryDate: k.expiryDate,
      isExpired: Date.now() > k.expiryDate,
      isFull: k.activationCount >= k.maxUsers,
      remainingSlots: Math.max(0, k.maxUsers - k.activationCount),
    }));

    return NextResponse.json({ status: "success", keys });
  } catch (e) {
    return NextResponse.json(
      { status: "fail", error: (e as Error).message },
      { status: 500 }
    );
  }
}

// ====== DELETE: Disable/delete a free offer key (admin only) ======
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { adminPassword, key } = body;

    if (adminPassword !== "8950888988") {
      return NextResponse.json(
        { status: "fail", error: "Unauthorized" },
        { status: 401 }
      );
    }

    const keys = getFreeOfferKeys();
    const filtered = keys.filter(k => k.key !== key);
    saveFreeOfferKeys(filtered);

    addLog("free_offer", `Deleted free offer key: ${key}`, {});

    return NextResponse.json({ status: "success", message: "Key deleted" });
  } catch (e) {
    return NextResponse.json(
      { status: "fail", error: (e as Error).message },
      { status: 500 }
    );
  }
}

// Export helper for activation route
export { getFreeOfferKeys, saveFreeOfferKeys, type FreeOfferKey };
