import { NextResponse } from "next/server";
import { addLog } from "@/lib/admin/helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ====== Free Offer Key System (Neon PostgreSQL) ======
// Free Offer Keys are stored in the LicenseKey table with keyType = "free_offer".
// This ensures permanent persistence in Neon PostgreSQL.

function generateKey(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const segment = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FREE-24H-${segment(4)}-${segment(4)}`;
}

// ====== POST: Generate a new free offer key (admin only) ======
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { adminPassword, validityHours = 24, maxUsers = 100 } = body;

    if (adminPassword !== "8950888988") {
      return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });
    }

    const hours = Math.max(1, Math.min(validityHours, 720));
    const maxU = Math.max(1, Math.min(maxUsers, 1000));
    const key = generateKey();
    const expiryDate = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Step 1: Insert into Neon
    const created = await db.licenseKey.create({
      data: {
        key,
        plan: "free_offer",
        keyType: "free_offer",
        status: "active",
        expiresAt: expiryDate,
        validityHours: hours,
        maxUsers: maxU,
        activationCount: 0,
        createdBy: "admin",
      },
    });
    console.log("[Free Offer] Created in Neon:", created.key);

    // Step 2: Read-back verify
    const verified = await db.licenseKey.findUnique({ where: { key } });
    if (!verified) {
      return NextResponse.json({
        status: "fail",
        error: "Database verification failed — key was not persisted",
      });
    }
    console.log("[Free Offer] Verified in Neon:", verified.key);

    addLog("free_offer", `Generated free offer key: ${key}`, { validityHours: hours, maxUsers: maxU });

    return NextResponse.json({
      status: "success",
      key: created.key,
      validityHours: hours,
      maxUsers: maxU,
      expiryDate: expiryDate.toISOString(),
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Free Offer] Generate error:", error);
    return NextResponse.json({ status: "fail", error: `Database error: ${error}` }, { status: 500 });
  }
}

// ====== GET: List all free offer keys (admin only) ======
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const adminPassword = url.searchParams.get("adminPassword");

    if (adminPassword !== "8950888988") {
      return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });
    }

    // Load from Neon
    const dbKeys = await db.licenseKey.findMany({
      where: { keyType: "free_offer" },
      orderBy: { createdAt: "desc" },
    });

    const keys = dbKeys.map(k => ({
      key: k.key,
      enabled: k.status === "active",
      validityHours: k.validityHours || 24,
      maxUsers: k.maxUsers || 100,
      activationCount: k.activationCount || 0,
      createdAt: k.createdAt?.getTime() || 0,
      expiryDate: k.expiresAt?.getTime() || 0,
      isExpired: k.expiresAt ? k.expiresAt.getTime() < Date.now() : false,
      isFull: (k.activationCount || 0) >= (k.maxUsers || 100),
      remainingSlots: Math.max(0, (k.maxUsers || 100) - (k.activationCount || 0)),
    }));

    return NextResponse.json({ status: "success", keys });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}

// ====== DELETE: Delete a free offer key (admin only) ======
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { adminPassword, key } = body;

    if (adminPassword !== "8950888988") {
      return NextResponse.json({ status: "fail", error: "Unauthorized" }, { status: 401 });
    }

    // Delete from Neon
    await db.licenseKey.delete({ where: { key } });
    console.log("[Free Offer] Deleted from Neon:", key);

    addLog("free_offer", `Deleted free offer key: ${key}`, {});

    return NextResponse.json({ status: "success", message: "Key deleted" });
  } catch (e) {
    return NextResponse.json({ status: "fail", error: (e as Error).message }, { status: 500 });
  }
}
