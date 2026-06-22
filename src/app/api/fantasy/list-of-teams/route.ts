import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BACKEND = "https://tgsoftware-api.online";

const LIST_ENDPOINTS: Record<string, string[]> = {
  dream11: ["/api/fantasy/list-of-teams", "/api/classic/dream11/list-of-teams"],
  my11circle: ["/api/fantasy/list-of-teams", "/api/classic/my11circle/list-of-teams"],
  jumbo: ["/api/fantasy/list-of-teams"],
};

const DEFAULT_ENDPOINTS = ["/api/fantasy/list-of-teams"];

const PLATFORM_LIMITS: Record<string, number> = {
  dream11: 40,
  my11circle: 40,
  jumbo: 50,
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fantasyApp = "dream11", matchId } = body as {
      fantasyApp?: string;
      matchId?: string;
    };

    if (!matchId) {
      return NextResponse.json(
        { status: "fail", error: "matchId is required" },
        { status: 200 }
      );
    }

    const store = await cookies();
    const raw = store.get(`tg_fantasy_${fantasyApp}`)?.value;
    if (!raw) {
      return NextResponse.json({
        status: "fail",
        error: `${fantasyApp} account not linked`,
        code: "NOT_LINKED",
        teams_list: [],
        presentTeamCount: 0,
        maxTeams: PLATFORM_LIMITS[fantasyApp] || 40,
        newSlots: PLATFORM_LIMITS[fantasyApp] || 40,
      });
    }

    let account;
    try {
      account = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    } catch {
      return NextResponse.json({
        status: "fail",
        error: "Invalid session",
        teams_list: [],
      });
    }

    // For Dream11: extract accessToken from JSON wrapper if present
    let authToken = account.authToken;
    if (fantasyApp === "dream11" && authToken && authToken.startsWith("{")) {
      try {
        const parsed = JSON.parse(authToken);
        if (typeof parsed.accessToken === "string") authToken = parsed.accessToken;
        else if (typeof parsed.access_token === "string") authToken = parsed.access_token;
      } catch { /* use as-is */ }
    }

    const payload: Record<string, unknown> = {
      fantasyApp,
      matchId: String(matchId),
      authToken,
    };

    // My11Circle-specific fields
    if (fantasyApp === "my11circle") {
      if (account.my11circleChallenge) payload.my11circleChallenge = account.my11circleChallenge;
      if (account.my11circleUserId) payload.my11circleUserId = account.my11circleUserId;
      if (account.mobileNumber) payload.my11circleMobile = account.mobileNumber;
    }

    const endpoints = LIST_ENDPOINTS[fantasyApp] || DEFAULT_ENDPOINTS;
    let teams_list: any[] = [];
    let lastError = "";

    // BYPASS MODE: No Bearer token needed — works with just authToken
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`${BACKEND}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://teamgeneration.in",
            Referer: "https://teamgeneration.in/",
          },
          body: JSON.stringify(payload),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (data?.status === "success" && Array.isArray(data.teams_list)) {
          teams_list = data.teams_list;
          break;
        }
        // If no teams but status is success (empty account), that's valid
        if (data?.status === "success") {
          teams_list = [];
          break;
        }
        lastError = data?.message || data?.error || "Failed to fetch teams";
        const lower = lastError.toLowerCase();
        if (
          lower.includes("invalid token") ||
          lower.includes("token expired") ||
          lower.includes("session expired") ||
          lower.includes("proxy returned 40")
        ) {
          break;
        }
      } catch (e) {
        lastError = (e as Error).message;
      }
    }

    const maxTeams = PLATFORM_LIMITS[fantasyApp] || 40;
    return NextResponse.json({
      status: "success",
      teams_list,
      presentTeamCount: teams_list.length,
      maxTeams,
      newSlots: Math.max(0, maxTeams - teams_list.length),
      message: teams_list.length > 0
        ? `${teams_list.length} existing teams found`
        : lastError || "No existing teams",
    });
  } catch (e) {
    return NextResponse.json(
      { status: "fail", error: (e as Error).message, teams_list: [] },
      { status: 500 }
    );
  }
}
