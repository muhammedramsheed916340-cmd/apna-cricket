import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import CryptoJS from "crypto-js";

export const dynamic = "force-dynamic";

const BACKEND = "https://tgsoftware-api.online";
const AES_KEY = "coder_bobby_Apna Cricket_tg_software";
const SUPPORTED = ["dream11", "my11circle", "jumbo", "myteam11", "vision11", "myfab11"];

function decryptAES(encrypted: string): string {
  try {
    return CryptoJS.AES.decrypt(encrypted, AES_KEY).toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}

// Extract the actual auth token from the backend response
function extractRealToken(rawToken: string): string {
  if (!rawToken || rawToken.length < 5) return rawToken;
  if (rawToken.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawToken);
      if (typeof parsed.accessToken === "string" && parsed.accessToken.length > 5) return parsed.accessToken;
      if (typeof parsed.access_token === "string" && parsed.access_token.length > 5) return parsed.access_token;
      if (typeof parsed.token === "string" && parsed.token.length > 5) return parsed.token;
      if (typeof parsed.authToken === "string" && parsed.authToken.length > 5) return parsed.authToken;
      return rawToken;
    } catch {
      return rawToken;
    }
  }
  return rawToken;
}

function findTokenDeep(obj: unknown, depth = 0): string | null {
  if (depth > 5 || !obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  for (const key of ["token", "authToken", "access_token", "accessToken"]) {
    const val = record[key];
    if (typeof val === "string" && val.length > 5) return val;
  }
  for (const val of Object.values(record)) {
    if (val && typeof val === "object") {
      const found = findTokenDeep(val, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Verify the REAL OTP entered by the user against the original backend.
// Stores the FULL raw token (matching original APK behavior).
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
        { status: "error", message: "fantasyApp, mobileNumber and verificationCode are required" },
        { status: 400 }
      );
    }

    if (!SUPPORTED.includes(fantasyApp)) {
      return NextResponse.json(
        { status: "error", message: "Unsupported fantasy platform" },
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

    // Build the payload EXACTLY matching the original APK format
    const payload: Record<string, string | number> = {
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

    const responseText = await upstream.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json({
        status: "fail",
        error: "Unexpected response from verification server.",
      });
    }

    if (data.status !== "success") {
      store.delete(`tg_otp_${fantasyApp}`);
      return NextResponse.json({
        status: "error",
        message: (data.message as string) || "Invalid OTP. Please try again.",
      });
    }

    // Try to decrypt the data field if it's an encrypted string
    let rd: unknown = data.data || data;
    if (typeof data.data === "string" && data.data) {
      const decrypted = decryptAES(data.data);
      if (decrypted) {
        try {
          rd = JSON.parse(decrypted);
        } catch {
          rd = { rawDecrypted: decrypted };
        }
      }
    }

    // Extract the auth token - store FULL raw token (matching original APK)
    const rawToken = findTokenDeep(rd) || findTokenDeep(data);

    if (!rawToken) {
      return NextResponse.json({
        status: "error",
        message: "Verification succeeded but no auth token returned. Please try again.",
      });
    }

    const extractedAccessToken = extractRealToken(rawToken);
    const rdRecord = typeof rd === "object" && rd !== null ? (rd as Record<string, unknown>) : {};
    const my11circleChallenge = rdRecord.my11circleChallenge || null;
    const my11circleUserId = rdRecord.my11circleUserId || null;

    // Persist the linked account with the FULL raw token (original APK stores this)
    const account = {
      slug: fantasyApp,
      mobileNumber,
      authToken: rawToken, // FULL raw token (JSON wrapper preserved)
      accessToken: extractedAccessToken, // extracted JWT for reference
      linked: true,
      linkedAt: Date.now(),
      my11circleChallenge: my11circleChallenge as string | null,
      my11circleUserId: my11circleUserId as string | null,
    };

    store.set(
      `tg_fantasy_${fantasyApp}`,
      Buffer.from(JSON.stringify(account)).toString("base64"),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );
    store.delete(`tg_otp_${fantasyApp}`);

    return NextResponse.json({
      status: "success",
      message: (data.message as string) || `${fantasyApp} account linked successfully`,
      data: {
        token: rawToken,
        accessToken: extractedAccessToken,
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
