import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/license-store";

export const dynamic = "force-dynamic";

// ====== Public endpoint: fetch + validate admin-saved JWT ======
// This endpoint is PUBLIC (no admin password required) because the user's
// "Connect Account" button needs to auto-fetch the admin-saved JWT.
//
// SECURITY:
// - Returns ONLY whether a valid JWT exists (true/false) + the token itself
//   so it can be saved to user's localStorage for API calls.
// - The JWT is NOT a secret of the app — it's the user's OWN backend session
//   token that the admin saved for shared use.
// - Does NOT return any other admin settings.

function isValidJWT(token: string): boolean {
  if (!token || token.trim().length < 20) return false;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0);
}

export async function GET() {
  try {
    const settings = getAllSettings();
    const jwt = (settings.jwt_token as string) || (settings.user_token as string) || "";

    if (!jwt) {
      return NextResponse.json({
        status: "fail",
        available: false,
        message: "No JWT saved in admin settings. Ask admin to save JWT first.",
      });
    }

    if (!isValidJWT(jwt)) {
      return NextResponse.json({
        status: "fail",
        available: false,
        message: "Admin JWT is invalid. Admin must save a valid JWT.",
      });
    }

    return NextResponse.json({
      status: "success",
      available: true,
      token: jwt,
      message: "Valid JWT available",
    });
  } catch (e) {
    return NextResponse.json(
      { status: "fail", available: false, message: (e as Error).message },
      { status: 500 }
    );
  }
}
