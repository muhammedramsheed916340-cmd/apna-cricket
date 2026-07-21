import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyLicenseKeyAsync } from "@/lib/license-verify";

export const dynamic = "force-dynamic";

const BACKEND = "https://tgsoftware-api.online";

// Fetch free contests available for the user's transferred teams
// Mirrors original: POST /api/{platform}/contest/all-free-status
export async function POST(req: Request) {
  try {
    // ====== SERVER-SIDE LICENSE VERIFICATION (mandatory) ======
    const cookieStore = await cookies();
    const licenseKey = cookieStore.get("tg_license_key")?.value || "";
    const licenseCheck = await verifyLicenseKeyAsync(licenseKey);
    if (!licenseCheck.authorized) {
      return NextResponse.json(
        { status: "fail", error: licenseCheck.error, code: licenseCheck.code },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { fantasyApp = "dream11", matchId, authToken, allTeamIds, userToken } = body;

    if (!matchId) {
      return NextResponse.json({ status: "fail", error: "matchId is required" });
    }
    if (!authToken) {
      const store = await cookies();
      const raw = store.get(`tg_fantasy_${fantasyApp}`)?.value;
      if (raw) {
        try {
          const account = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
          if (account.authToken) {
            return handleContestFetch(fantasyApp, matchId, account.authToken, allTeamIds, userToken);
          }
        } catch {}
      }
      return NextResponse.json({
        status: "fail",
        error: `Account not linked. Please link your ${fantasyApp} account first.`,
        code: "NO_AUTH_TOKEN",
        needsAuth: true,
      });
    }

    return handleContestFetch(fantasyApp, matchId, authToken, allTeamIds, userToken);
  } catch (e) {
    return NextResponse.json(
      { status: "fail", error: (e as Error).message },
      { status: 500 }
    );
  }
}

async function handleContestFetch(
  fantasyApp: string,
  matchId: string,
  authToken: string,
  allTeamIds: number[],
  userToken: string
) {
  const platform = fantasyApp === "dream11" ? "dream11" : "my11circle";
  const endpoint = `${BACKEND}/api/${platform}/contest/all-free-status`;

  const payload = {
    authToken: String(authToken),
    matchId: String(matchId),
    allTeamIds: Array.isArray(allTeamIds)
      ? allTeamIds.map((id) => parseInt(String(id), 10)).filter((n) => !isNaN(n) && n > 0)
      : [],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userToken) {
    headers["Authorization"] = `Bearer ${userToken}`;
  }

  console.log(`[Contests] Fetch ${platform}: matchId=${matchId}, teams=${payload.allTeamIds.length}`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({
        status: "fail",
        error: `Server returned non-JSON (HTTP ${res.status})`,
      });
    }

    if (data.status === "success") {
      const contests = (data.contests as any[]) || [];
      console.log(`[Contests] Success: ${contests.length} free contests found`);
      return NextResponse.json({
        status: "success",
        contests,
        platform,
      });
    }

    const msg = ((data.message as string) || (data.error as string) || "").toLowerCase();
    if (msg.includes("token") || msg.includes("auth") || msg.includes("session")) {
      return NextResponse.json({
        status: "fail",
        error: `Session expired on ${platform}. Re-link via OTP.`,
        code: "TOKEN_EXPIRED",
        needsReauth: true,
      });
    }

    return NextResponse.json({
      status: "fail",
      error: (data.message as string) || (data.error as string) || "Failed to fetch contests",
      contests: [],
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      status: "fail",
      error: errMsg.includes("timeout") ? "Request timed out" : `Network error: ${errMsg}`,
      contests: [],
    });
  }
}
