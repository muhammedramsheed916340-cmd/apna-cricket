import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BACKEND = "https://tgsoftware-api.online";
const SUPPORTED = ["dream11", "my11circle", "jumbo", "myteam11", "vision11", "myfab11"];

// Verify the REAL OTP entered by the user (delivered via SMS) against the
// original tgsoftware-api.online backend. On success, stores the real
// authToken issued by the fantasy platform.
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

    if (!/^\d{4,6}$/.test(String(verificationCode))) {
      return NextResponse.json(
        { status: "error", message: "Enter a valid OTP" },
        { status: 400 }
      );
    }

    // Retrieve the state/challenge saved during send-otp
    const store = await cookies();
    const rawState = store.get(`tg_otp_${fantasyApp}`)?.value;
    let stateObj: any = {};
    if (rawState) {
      try {
        stateObj = JSON.parse(Buffer.from(rawState, "base64").toString("utf-8"));
      } catch {
        /* ignore */
      }
    }

    // Build the verify payload exactly like the original app
    const payload: Record<string, unknown> = {
      fantasyApp,
      mobileNumber,
      verificationCode,
    };
    if (stateObj.state) payload.state = stateObj.state;
    if (stateObj.challenge) payload.challenge = stateObj.challenge;
    if (stateObj.reasonCode) payload.reasonCode = stateObj.reasonCode;

    const upstream = await fetch(`${BACKEND}/api/fantasy/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://teamgeneration.in",
        Referer: "https://teamgeneration.in/",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));

    if (upstream.status !== 200 || data?.status !== "success") {
      // Clear the OTP state on failure so a fresh send-otp is required
      store.delete(`tg_otp_${fantasyApp}`);
      return NextResponse.json(
        {
          status: "error",
          message: data?.message || "Invalid OTP. Please try again.",
        },
        { status: 400 }
      );
    }

    const verified = data.data || {};
    const token = verified.token || "";

    // Persist the linked account (real token from the fantasy platform)
    const account = {
      slug: fantasyApp,
      mobileNumber,
      authToken: token,
      linked: true,
      linkedAt: Date.now(),
      my11circleChallenge: verified.my11circleChallenge || null,
      my11circleUserId: verified.my11circleUserId || null,
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
    // Clear the OTP state
    store.delete(`tg_otp_${fantasyApp}`);

    return NextResponse.json({
      status: "success",
      message: data.message || `${fantasyApp} account linked successfully`,
      data: {
        token,
        account: {
          slug: fantasyApp,
          mobileNumber,
          linked: true,
          linkedAt: Date.now(),
        },
      },
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
