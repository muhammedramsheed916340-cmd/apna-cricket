import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BACKEND = "https://tgsoftware-api.online";
const SUPPORTED = ["dream11", "my11circle", "jumbo", "myteam11", "vision11", "myfab11"];

// Send a REAL OTP via the original tgsoftware-api.online backend.
// The fantasy platform sends the OTP via SMS to the mobile number.
// We never generate or display the OTP ourselves.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fantasyApp, mobileNumber } = body as {
      fantasyApp?: string;
      mobileNumber?: string;
    };

    if (!fantasyApp || !mobileNumber) {
      return NextResponse.json(
        { status: "error", message: "fantasyApp and mobileNumber are required" },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(String(mobileNumber))) {
      return NextResponse.json(
        { status: "error", message: "Enter a valid 10-digit mobile number" },
        { status: 400 }
      );
    }

    if (!SUPPORTED.includes(fantasyApp)) {
      return NextResponse.json(
        { status: "error", message: "Unsupported fantasy platform" },
        { status: 400 }
      );
    }

    // Call the real backend — it proxies to Dream11/My11Circle/Jumbo and sends
    // a real SMS OTP. We persist the returned state/challenge in a short-lived
    // cookie so the verify-otp step can include it.
    const upstream = await fetch(`${BACKEND}/api/fantasy/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://teamgeneration.in",
        Referer: "https://teamgeneration.in/",
      },
      body: JSON.stringify({ fantasyApp, mobileNumber }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));

    if (upstream.status !== 200 || data?.status !== "success") {
      return NextResponse.json(
        {
          status: "error",
          message: data?.message || "Failed to send OTP. Try again.",
        },
        { status: upstream.status === 200 ? 400 : upstream.status }
      );
    }

    // Persist state / challenge for the verify step (httpOnly, 10 min)
    const stateData = data.data || {};
    const store = await cookies();
    store.set(
      `tg_otp_${fantasyApp}`,
      Buffer.from(
        JSON.stringify({
          mobileNumber,
          state: stateData.state || null,
          challenge: stateData.challenge || null,
          reasonCode: stateData.reasonCode || null,
          resendAfter: stateData.resend_after || null,
          resendsLeft: stateData.resends_left ?? 5,
          retriesLeft: stateData.retries_left ?? 5,
          createdAt: Date.now(),
        })
      ).toString("base64"),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 600, // 10 minutes
      }
    );

    return NextResponse.json({
      status: "success",
      message: data.message || `OTP sent to ${mobileNumber}`,
      data: {
        otpSent: true,
        reasonCode: stateData.reasonCode || null,
        resendsLeft: stateData.resends_left ?? 5,
        retriesLeft: stateData.retries_left ?? 5,
        resendAfter: stateData.resend_after || null,
        expiresIn: 60,
        // NOTE: no OTP value is returned — the real OTP is delivered via SMS
      },
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
