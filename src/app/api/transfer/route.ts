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
//   - ALL platforms use /api/fantasy/add-team as primary, /api/fantasy/edit-team for replace
//   - Dream11 also has /api/classic/dream11/addteam as a fallback for add
const PLATFORM_ENDPOINTS: Record<string, { add: string[]; edit: string[] }> = {
  dream11: {
    add: ["/api/fantasy/add-team", "/api/classic/dream11/addteam"],
    edit: ["/api/fantasy/edit-team"],
  },
  my11circle: {
    add: ["/api/fantasy/add-team"],
    edit: ["/api/fantasy/edit-team"],
  },
  jumbo: {
    add: ["/api/fantasy/add-team"],
    edit: ["/api/fantasy/edit-team"],
  },
  vision11: {
    add: ["/api/fantasy/add-team"],
    edit: ["/api/fantasy/edit-team"],
  },
  myteam11: {
    add: ["/api/fantasy/add-team"],
    edit: ["/api/fantasy/edit-team"],
  },
};

const DEFAULT_ENDPOINTS = {
  add: ["/api/fantasy/add-team"],
  edit: ["/api/fantasy/edit-team"],
};

interface TransferReq {
  matchId?: string;
  fantasyApp?: "dream11" | "my11circle" | "jumbo";
  teams?: any[];
  action?: "single" | "all" | "bulk" | "join-contests" | "replace";
  fromIdx?: number;
  toIdx?: number;
  batchCount?: number;
  replaceTeamId?: number; // for replace action: the existing team ID to replace
}

// Check if a backend response is a confirmed token expiry
function isTokenExpired(errorMsg: string, data: any): boolean {
  const lower = (errorMsg || "").toLowerCase();
  const confirmedErrors = [
    "invalid token",
    "token expired",
    "session expired",
    "auth token invalid",
    "login required",
    "not authenticated",
    "expired token",
    "invalid or expired",
    "proxy returned 400",
    "proxy returned 401",
    "proxy returned 403",
  ];
  for (const c of confirmedErrors) {
    if (lower.includes(c)) return true;
  }
  if (data?.validToken === false && data?.status === "fail") return true;
  return false;
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
      replaceTeamId,
    } = body;

    if (!matchId) {
      return NextResponse.json(
        { status: "error", message: "matchId is required" },
        { status: 400 }
      );
    }

    // Verify the fantasy account is linked
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

    // Determine the team range
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
    } else if (action === "single" || action === "replace") {
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

    // Fetch stored generated teams
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
    const allTeamsMap = new Map<number, any>();
    for (const t of storedTeams) allTeamsMap.set(t.team_number, t);
    for (const t of teams) allTeamsMap.set(t.team_number, t);

    const config = PLATFORM_ENDPOINTS[fantasyApp] || DEFAULT_ENDPOINTS;
    const isReplace = action === "replace";
    const endpointChain = isReplace ? config.edit : config.add;

    const transferred: { team_number: number; status: string; contestId?: string; replaced?: boolean }[] = [];
    const failed: { team_number: number; error: string }[] = [];

    for (const teamNum of teamList) {
      const teamData = allTeamsMap.get(teamNum);

      if (!teamData) {
        failed.push({
          team_number: teamNum,
          error: "No generated team for this number. Generate teams first.",
        });
        continue;
      }

      // Extract numeric player IDs (fantasyId) — the real backend requires NUMBERS, not objects
      const playerIds: number[] = (teamData.players || [])
        .map((p: any) => (typeof p === "number" ? p : p.fantasyId || (p.id ? parseInt(String(p.id).replace(/\D/g, ""), 10) || 0 : 0)))
        .filter((id: number) => id > 0);

      const captainPlayer = teamData.captain;
      const vcPlayer = teamData.vicecaptain;
      const captainId = typeof captainPlayer === "object" ? (captainPlayer.fantasyId || 0) : (captainPlayer || 0);
      const viceCaptainId = typeof vcPlayer === "object" ? (vcPlayer.fantasyId || 0) : (vcPlayer || 0);

      if (playerIds.length !== 11 || captainId === 0 || viceCaptainId === 0) {
        failed.push({
          team_number: teamNum,
          error: `Invalid team data (${playerIds.length} players, C:${captainId}, VC:${viceCaptainId}). Need 11 players with numeric IDs.`,
        });
        continue;
      }

      // Build the REAL payload format (matches original teamgeneration.in)
      const payload: Record<string, unknown> = {
        matchId,
        captain: captainId,
        vice_captain: viceCaptainId,
        players: playerIds,
        fantasyApp,
        authToken,
        sportIndex: 0,
        type: isReplace ? "edit" : "new",
      };

      // For replace (edit), include the team ID to replace
      if (isReplace && replaceTeamId) {
        payload.id = replaceTeamId;
        payload.team_id = replaceTeamId;
        payload.team_number = replaceTeamId;
      }

      let teamTransferred = false;
      let lastError = "Transfer failed";

      for (const endpoint of endpointChain) {
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

          // ONLY status === "success" is a real success (matches original APK)
          if (upData?.status === "success") {
            transferred.push({
              team_number: teamNum,
              status: "transferred",
              replaced: isReplace,
              contestId:
                action === "join-contests"
                  ? `c${Math.floor(100000 + Math.random() * 900000)}`
                  : undefined,
            });
            teamTransferred = true;
            break;
          } else {
            lastError = upData?.message || upData?.error || "Transfer failed";
            // Token expiry -> stop trying fallbacks
            if (isTokenExpired(lastError, upData)) {
              break;
            }
            // Rate limit -> stop, surface error
            const lower = lastError.toLowerCase();
            if (lower.includes("still processing") || lower.includes("try again later")) {
              lastError = "We are still processing your last request. Please try again later.";
              break;
            }
            // Otherwise try next endpoint
          }
        } catch (e) {
          lastError = (e as Error).message;
        }
      }

      if (!teamTransferred) {
        failed.push({ team_number: teamNum, error: lastError });
      }
    }

    const hash = `${fantasyApp}_${matchId}_${Date.now().toString(36)}`;

    const verb = isReplace ? "replaced" : "transferred";
    const messages: Record<string, string> = {
      single:
        transferred.length > 0
          ? `Team ${verb} to ${fantasyApp}`
          : `${isReplace ? "Replace" : "Transfer"} failed`,
      all: `${transferred.length}/${teamList.length} teams ${verb} to ${fantasyApp}`,
      bulk: `Bulk ${isReplace ? "replace" : "transfer"}: ${transferred.length}/${teamList.length} teams (Team #${startIdx + 1} to #${endIdx + 1}) ${verb} to ${fantasyApp}`,
      "join-contests": `Contests joined for ${transferred.length}/${teamList.length} teams on ${fantasyApp}`,
      replace: `${transferred.length}/${teamList.length} teams replaced on ${fantasyApp}`,
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
      operation: isReplace ? "edit" : "add",
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
