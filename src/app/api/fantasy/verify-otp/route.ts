import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SUPPORTED = ["dream11", "my11circle", "jumbo"];

// Verify OTP and link the fantasy account.
// Mirrors original: POST /api/fantasy/verify-otp { fantasyApp, mobileNumber, verificationCode }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fantasyApp, mobileNumber, verificationCode } = body as {
      fantasyApp?: string;
      mobileNumber?: string;
      verificationCode?: string;
    };

    if (!fantasyApp || !mobileNumber || !verificationCode) {
      return NextResponse.json(
        {
          status: "error",
          message: "fantasyApp, mobileNumber and verificationCode are required",
        },
        { status: 400 }
      );
    }

    if (!SUPPORTED.includes(fantasyApp)) {
      return NextResponse.json(
        { status: "error", message: "Unsupported fantasy platform" },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(String(verificationCode))) {
      return NextResponse.json(
        { status: "error", message: "Enter a valid 6-digit OTP" },
        { status: 400 }
      );
    }

    // Simulate OTP verification + token issuance
    await new Promise((r) => setTimeout(r, 600));
    const token = `${fantasyApp}_${mobileNumber}_${Date.now().toString(36)}`;

    // Persist account link in a cookie (per-platform)
    const store = await cookies();
    const account = {
      slug: fantasyApp,
      mobileNumber,
      authToken: token,
      linked: true,
      linkedAt: Date.now(),
    };
    store.set(
      `tg_fantasy_${fantasyApp}`,
      Buffer.from(JSON.stringify(account)).toString("base64"),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      }
    );

    return NextResponse.json({
      status: "success",
      message: `${fantasyApp} account linked successfully`,
      data: {
        token,
        account,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
