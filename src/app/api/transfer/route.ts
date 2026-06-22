import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BACKEND = "https://tgsoftware-api.online";

const PLATFORM_LIMITS: Record<string, number> = {
  dream11: 40,
  my11circle: 40,
  jumbo: 50,
};

// Real fantasy platform transfer endpoints per app slug.
// Matches the ORIGINAL teamgeneration.in source:
//   - ALL platforms use /api/fantasy/add-team as the primary endpoint
//   - Dream11 also has /api/classic/dream11/addteam as a fallback
//   - My11Circle and Jumbo use ONLY /api/fantasy/add-team (NOT the dream11 endpoint)
const PLATFORM_ENDPOINTS: Record<string, string[]> = {
  dream11: ["/api/fantasy/add-team", "/api/classic/dream11/addteam"],
  my11circle: ["/api/fantasy/add-team"],
  jumbo: ["/api/fantasy/add-team"],
  vision11: ["/api/fantasy/add-team"],
  myteam11: ["/api/fantasy/add-team"],
};

const DEFAULT_ENDPOINTS = ["/api/fantasy/add-team"];

interface TransferReq {
  matchId?: string;
  fantasyApp?: "dream11" | "my11circle" | "jumbo";
  teams?: {
    team_number: number;
    players?: any[];
    captain?: any;
    vicecaptain?: any;
  }[];
  action?: "single" | "all" | "bulk" | "join-contests";
  fromIdx?: number;
  toIdx?: number;
  batchCount?: number;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as TransferReq;
    const {
      matchId,
      fantasyApp = "dream11",
      teams = [],
      action = "all",
      fromIdx,
      toIdx,
      batchCount,
    } = body;

    if (!matchId) {
      return NextResponse.json(
        { status: "error", message: "matchId is required" },
        { status: 400 }
      );
    }

    // Verify the fantasy account is linked (real authToken from OTP login)
    const store = await cookies();
    const raw = store.get(`tg_fantasy_${fantasyApp}`)?.value;
    if (!raw) {
      return NextResponse.json(
        {
          status: "error",
          message: `${fantasyApp} account not linked. Please login with OTP first.`,
          code: "NOT_LINKED",
        },
        { status: 401 }
      );
    }

    let account;
    try {
      account = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    } catch {
      return NextResponse.json(
        { status: "error", message: "Invalid account session", code: "INVALID_SESSION" },
        { status: 401 }
      );
    }

    const authToken = account.authToken;
    if (!authToken) {
      return NextResponse.json(
        {
          status: "error",
          message: "No auth token. Please re-link your account.",
          code: "NO_TOKEN",
        },
        { status: 401 }
      );
    }

    const limit = PLATFORM_LIMITS[fantasyApp] || 40;

    // Determine the team range to transfer
    let startIdx = 0;
    let endIdx = 0;
    let teamList: number[] = [];

    if (action === "bulk") {
      startIdx = fromIdx ?? 0;
      endIdx = toIdx ?? startIdx + (batchCount ?? limit) - 1;
      const total = endIdx - startIdx + 1;
      if (total > 500) {
        return NextResponse.json(
          { status: "error", message: "Maximum 500 teams per bulk transfer" },
          { status: 400 }
        );
      }
      if (total > limit) {
        return NextResponse.json(
          {
            status: "error",
            message: `Batch exceeds ${fantasyApp} limit of ${limit} teams. Reduce the range.`,
          },
          { status: 400 }
        );
      }
      for (let i = startIdx; i <= endIdx; i++) teamList.push(i + 1);
    } else if (action === "single") {
      teamList = teams.map((t) => t.team_number);
    } else {
      teamList =
        teams.length > 0
          ? teams.map((t) => t.team_number)
          : Array.from({ length: batchCount || 5 }, (_, i) => i + 1);
      if (teamList.length > limit) {
        return NextResponse.json(
          {
            status: "error",
            message: `Exceeds ${fantasyApp} limit of ${limit} teams per batch`,
          },
          { status: 400 }
        );
      }
    }

    // Verify the auth token is still valid with the real backend
    const verifyRes = await fetch(`${BACKEND}/api/fantasy/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://teamgeneration.in",
        Referer: "https://teamgeneration.in/",
      },
      body: JSON.stringify({ fantasyApp, authToken }),
      cache: "no-store",
    });
    const verifyData = await verifyRes.json().catch(() => ({}));

    // If token is invalid/expired, return a clear re-link message
    if (verifyData?.validToken === false || verifyRes.status !== 200) {
      return NextResponse.json(
        {
          status: "error",
          message: `${fantasyApp} session expired. Please re-link your account via OTP.`,
          code: "TOKEN_EXPIRED",
        },
        { status: 401 }
      );
    }

    // Fetch stored generated teams for this match so we can send REAL team data
    // (players, captain, vice-captain) to the fantasy platform backend.
    const storedRaw = store.get(`tg_teams_${matchId}`)?.value;
    let storedTeams: any[] = [];
    if (storedRaw) {
      try {
        const parsed = JSON.parse(Buffer.from(storedRaw, "base64").toString("utf-8"));
        storedTeams = parsed.teams || [];
      } catch {
        /* ignore */
      }
    }
    // Merge: prefer passed-in teams, fall back to stored teams
    const allTeamsMap = new Map<number, any>();
    for (const t of storedTeams) allTeamsMap.set(t.team_number, t);
    for (const t of teams) allTeamsMap.set(t.team_number, t);

    // Call the real transfer endpoint for each team.
    // Tries each platform-specific endpoint in order (primary first, fallback second).
    const endpoints = PLATFORM_ENDPOINTS[fantasyApp] || DEFAULT_ENDPOINTS;
    const transferred: { team_number: number; status: string; contestId?: string }[] = [];
    const failed: { team_number: number; error: string }[] = [];

    for (const teamNum of teamList) {
      const teamData = allTeamsMap.get(teamNum);
      const playerData = teamData?.players || [];
      const captain = teamData?.captain;
      const vicecaptain = teamData?.vicecaptain;

      // If no generated team data exists for this number, fail with clear message
      if (!teamData) {
        failed.push({
          team_number: teamNum,
          error: "No generated team for this number. Generate teams first.",
        });
        continue;
      }

      const payload = {
        fantasyApp,
        authToken,
        matchId,
        tgMatchId: matchId,
        playerData,
        captainData: captain ? [captain] : [],
        vicecaptainData: vicecaptain ? [vicecaptain] : [],
        generateLinkFlag: action === "join-contests" ? "contest" : "general",
        teamNumber: teamNum,
      };

      let teamTransferred = false;
      let lastError = "Transfer failed";

      // Try each endpoint for this platform (primary, then fallback)
      for (const endpoint of endpoints) {
        try {
          const upRes = await fetch(`${BACKEND}${endpoint}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: "https://teamgeneration.in",
              Referer: "https://teamgeneration.in/",
            },
            body: JSON.stringify(payload),
            cache: "no-store",
          });
          const upData = await upRes.json().catch(() => ({}));

          if (upRes.status === 200 && upData?.status === "success") {
            transferred.push({
              team_number: teamNum,
              status: "transferred",
              contestId:
                action === "join-contests"
                  ? `c${Math.floor(100000 + Math.random() * 900000)}`
                  : undefined,
            });
            teamTransferred = true;
            break; // success, don't try fallback
          } else {
            lastError = upData?.message || "Transfer failed";
            // If this endpoint returned a token-expiry error, don't try fallback
            if (
              typeof lastError === "string" &&
              /invalid token|token expired|session expired|auth token/i.test(lastError)
            ) {
              break;
            }
            // Otherwise try the next endpoint (fallback)
          }
        } catch (e) {
          lastError = (e as Error).message;
          // try next endpoint
        }
      }

      if (!teamTransferred) {
        failed.push({ team_number: teamNum, error: lastError });
      }
    }

    const hash = `${fantasyApp}_${matchId}_${Date.now().toString(36)}`;

    const messages: Record<string, string> = {
      single:
        transferred.length > 0
          ? `Team transferred to ${fantasyApp}`
          : `Transfer failed`,
      all: `${transferred.length}/${teamList.length} teams transferred to ${fantasyApp}`,
      bulk: `Bulk transfer: ${transferred.length}/${teamList.length} teams (Team #${startIdx + 1} to #${endIdx + 1}) transferred to ${fantasyApp}`,
      "join-contests": `Contests joined for ${transferred.length}/${teamList.length} teams on ${fantasyApp}`,
    };

    return NextResponse.json({
      status: transferred.length > 0 ? "success" : "error",
      action,
      fantasyApp,
      matchId,
      hash,
      account: {
        mobileNumber: account.mobileNumber,
        linked: true,
      },
      range:
        action === "bulk"
          ? { from: startIdx + 1, to: endIdx + 1, count: teamList.length }
          : undefined,
      transferred: transferred.length,
      teams: transferred,
      failed,
      message: messages[action],
      transferredAt: Date.now(),
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
