import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Send OTP to mobile number for the chosen fantasy platform.
// Mirrors original: POST /api/fantasy/send-otp { fantasyApp, mobileNumber }
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

    const supported = ["dream11", "my11circle", "jumbo"];
    if (!supported.includes(fantasyApp)) {
      return NextResponse.json(
        { status: "error", message: "Unsupported fantasy platform" },
        { status: 400 }
      );
    }

    // Simulate OTP dispatch (in production this calls the platform's API)
    await new Promise((r) => setTimeout(r, 700));
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));

    return NextResponse.json({
      status: "success",
      message: `OTP sent to ${mobileNumber} for ${fantasyApp}`,
      data: {
        otpSent: true,
        // Return the OTP in dev mode so the UI can display it (in production
        // the OTP is delivered via SMS and never returned in the response).
        devOtp: otpCode,
        reasonCode: fantasyApp === "my11circle" ? "CHALLENGE_OK" : null,
        expiresIn: 60,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
