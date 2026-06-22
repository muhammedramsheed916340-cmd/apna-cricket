import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BACKEND = "https://tgsoftware-api.online";

// GET existing teams for a match from the fantasy platform.
// Matches original teamgeneration.in: POST /api/fantasy/list-of-teams
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

    // Read the linked account's authToken from cookie
    const store = await cookies();
    const raw = store.get(`tg_fantasy_${fantasyApp}`)?.value;
    if (!raw) {
      return NextResponse.json({
        status: "fail",
        error: `${fantasyApp} account not linked`,
        code: "NOT_LINKED",
        teams_list: [],
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

    const payload = {
      fantasyApp,
      matchId: String(matchId),
      authToken: account.authToken,
    };

    const endpoints = LIST_ENDPOINTS[fantasyApp] || DEFAULT_ENDPOINTS;
    let teams_list: any[] = [];
    let lastError = "";

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
        lastError = data?.message || data?.error || "Failed to fetch teams";
        // Token expiry -> stop
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

    return NextResponse.json({
      status: teams_list.length > 0 ? "success" : "fail",
      teams_list,
      presentTeamCount: teams_list.length,
      maxTeams: PLATFORM_LIMITS[fantasyApp] || 40,
      newSlots: Math.max(0, (PLATFORM_LIMITS[fantasyApp] || 40) - teams_list.length),
      message: teams_list.length > 0 ? `${teams_list.length} existing teams found` : lastError,
    });
  } catch (e) {
    return NextResponse.json(
      { status: "fail", error: (e as Error).message, teams_list: [] },
      { status: 500 }
    );
  }
}
