import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveBearerToken } from "@/lib/shared-token";

export const dynamic = "force-dynamic";

const BACKEND = "https://tgsoftware-api.online";

const PLATFORM_LIMITS: Record<string, number> = {
  dream11: 40,
  my11circle: 40,
  jumbo: 50,
};

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
};

const DEFAULT_ENDPOINTS = {
  add: ["/api/fantasy/add-team"],
  edit: ["/api/fantasy/edit-team"],
};

const LIST_ENDPOINTS: Record<string, string[]> = {
  dream11: ["/api/fantasy/list-of-teams", "/api/classic/dream11/list-of-teams"],
  my11circle: ["/api/fantasy/list-of-teams", "/api/classic/my11circle/list-of-teams"],
  jumbo: ["/api/fantasy/list-of-teams"],
};

function isTokenExpired(errorMsg: string, data: any): boolean {
  const lower = (errorMsg || "").toLowerCase();
  const confirmed = [
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
  for (const c of confirmed) if (lower.includes(c)) return true;
  if (data?.validToken === false && data?.status === "fail") return true;
  return false;
}

// Fetch existing teams on the fantasy platform for this match
async function fetchExistingTeams(
  fantasyApp: string,
  matchId: string,
  authToken: string,
  account?: any
): Promise<any[]> {
  // For Dream11: extract accessToken from JSON wrapper if present
  let effectiveAuthToken = authToken;
  if (fantasyApp === "dream11" && effectiveAuthToken.startsWith("{")) {
    try {
      const parsed = JSON.parse(effectiveAuthToken);
      if (typeof parsed.accessToken === "string") effectiveAuthToken = parsed.accessToken;
      else if (typeof parsed.access_token === "string") effectiveAuthToken = parsed.access_token;
    } catch { /* use as-is */ }
  }

  const endpoints = LIST_ENDPOINTS[fantasyApp] || ["/api/fantasy/list-of-teams"];
  const payload: Record<string, unknown> = {
    fantasyApp,
    matchId: String(matchId),
    authToken: effectiveAuthToken,
  };
  // My11Circle-specific fields
  if (fantasyApp === "my11circle" && account) {
    if (account.my11circleChallenge) payload.my11circleChallenge = account.my11circleChallenge;
    if (account.my11circleUserId) payload.my11circleUserId = account.my11circleUserId;
    if (account.mobileNumber) payload.my11circleMobile = account.mobileNumber;
  }
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
        return data.teams_list;
      }
      const lower = (data?.message || "").toLowerCase();
      if (lower.includes("invalid token") || lower.includes("token expired")) break;
    } catch {
      /* try next */
    }
  }
  return [];
}

interface TransferReq {
  matchId?: string;
  fantasyApp?: string;
  teams?: any[];
  // transfer mode: "all" (edit existing + add new), "newOnly" (add only), "custom" (X edit + Y add), "replace" (edit specific team)
  mode?: "all" | "newOnly" | "custom" | "replace";
  customReplaceCount?: number;
  customAddCount?: number;
  replaceTeamId?: number;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as TransferReq;
    const {
      matchId,
      fantasyApp = "dream11",
      teams = [],
      mode = "all",
      customReplaceCount = 0,
      customAddCount = 0,
      replaceTeamId,
    } = body;

    if (!matchId) {
      return NextResponse.json(
        { status: "error", message: "matchId is required" },
        { status: 400 }
      );
    }

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
        { status: "error", message: "No auth token", code: "NO_TOKEN" },
        { status: 401 }
      );
    }

    // Resolve the Bearer token (shared Google JWT from DB, or user token)
    // The tgsoftware-api.online backend requires Authorization: Bearer <jwt>
    // for add-team/edit-team endpoints. Without it, transfers return "Something Went Wrong!"
    const bearerToken = await resolveBearerToken(undefined);
    console.log(`[Transfer][BEARER] ${bearerToken ? `Available (len: ${bearerToken.length})` : "NONE — bypass mode"}`);

    const maxTeams = PLATFORM_LIMITS[fantasyApp] || 40;

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
    const selectedTeams = (teams.length > 0 ? teams : storedTeams).slice(0, maxTeams);

    if (selectedTeams.length === 0) {
      return NextResponse.json({
        status: "error",
        message: "No generated teams to transfer. Generate teams first.",
        code: "NO_TEAMS",
      });
    }

    // Fetch existing teams on the platform (for replace logic)
    const existingTeams = await fetchExistingTeams(fantasyApp, matchId, authToken, account);
    const presentTeamCount = existingTeams.length;
    const newSlots = Math.max(0, maxTeams - presentTeamCount);

    // Decide how many to edit (replace) vs add (new) based on mode
    let teamsToEdit: number;
    let teamsToAdd: number;
    if (mode === "newOnly") {
      teamsToEdit = 0;
      teamsToAdd = Math.min(selectedTeams.length, newSlots);
    } else if (mode === "custom") {
      teamsToEdit = Math.min(
        Math.max(0, customReplaceCount),
        presentTeamCount,
        selectedTeams.length
      );
      teamsToAdd = Math.min(
        Math.max(0, customAddCount),
        newSlots,
        selectedTeams.length - teamsToEdit
      );
    } else if (mode === "replace") {
      // Replace a specific team ID
      teamsToEdit = 1;
      teamsToAdd = 0;
    } else {
      // mode === "all" (default): edit existing, add rest as new
      teamsToEdit = Math.min(presentTeamCount, selectedTeams.length);
      teamsToAdd = selectedTeams.length - teamsToEdit;
    }

    const config = PLATFORM_ENDPOINTS[fantasyApp] || DEFAULT_ENDPOINTS;
    const transferred: any[] = [];
    const failed: any[] = [];
    const totalToProcess = teamsToEdit + teamsToAdd;

    // Helper: get the platform-specific fantasy ID for a player
    const getPlatformId = (p: any, platform: string): number => {
      if (typeof p === "number") return p;
      // Check fantasyIdList for the specific platform
      if (p.fantasyIdList && Array.isArray(p.fantasyIdList)) {
        const found = p.fantasyIdList.find(
          (f: any) => f.name === platform
        );
        if (found && found.id) return found.id;
      }
      // Fall back to default fantasyId (Dream11)
      return p.fantasyId || 0;
    };

    // Platform-specific delay between transfers to avoid rate limiting
    // (My11Circle is especially strict: "We are still processing your last request")
    const transferDelay = fantasyApp === "my11circle" ? 800 : fantasyApp === "jumbo" ? 500 : 200;

    for (let i = 0; i < totalToProcess; i++) {
      // Delay between teams (skip on first team)
      if (i > 0) await new Promise((r) => setTimeout(r, transferDelay));

      const team = selectedTeams[i];
      const isEdit = i < teamsToEdit;

      // Extract numeric player IDs FOR THIS PLATFORM (not just Dream11)
      const playerIds: number[] = (team.players || [])
        .map((p: any) => getPlatformId(p, fantasyApp))
        .filter((id: number) => id > 0);

      if (playerIds.length < 11) {
        failed.push({
          team_number: team.team_number,
          error: `Only ${playerIds.length} players with ${fantasyApp} IDs (need 11). Some players may not be available on ${fantasyApp}.`,
        });
        continue;
      }

      const captainPlayer = team.captain;
      const vcPlayer = team.vicecaptain;
      const captainId =
        typeof captainPlayer === "object"
          ? getPlatformId(captainPlayer, fantasyApp)
          : captainPlayer || 0;
      const viceCaptainId =
        typeof vcPlayer === "object"
          ? getPlatformId(vcPlayer, fantasyApp)
          : vcPlayer || 0;

      if (!captainId || !viceCaptainId) {
        failed.push({
          team_number: team.team_number,
          error: "Invalid captain/vice-captain IDs.",
        });
        continue;
      }

      // Debug: log the platform-specific IDs being sent
      console.log(`[Transfer][${fantasyApp}] Team ${team.team_number}: players=${JSON.stringify(playerIds)}, captain=${captainId}, vice_captain=${viceCaptainId}`);

      // For edit: use the existing team's ID (or the specified replaceTeamId)
      let existingTeamId: string | number | undefined;
      if (isEdit) {
        if (mode === "replace" && replaceTeamId) {
          existingTeamId = replaceTeamId;
        } else if (existingTeams[i]) {
          existingTeamId = existingTeams[i].team_id;
        }
      }

      // For Dream11: if authToken is a JSON wrapper, extract the accessToken
      // (matching original teamgeneration.in behavior)
      let effectiveAuthToken = authToken;
      if (fantasyApp === "dream11" && effectiveAuthToken.startsWith("{")) {
        try {
          const parsed = JSON.parse(effectiveAuthToken);
          if (typeof parsed.accessToken === "string" && parsed.accessToken.length > 20) {
            effectiveAuthToken = parsed.accessToken;
          } else if (typeof parsed.access_token === "string" && parsed.access_token.length > 20) {
            effectiveAuthToken = parsed.access_token;
          }
        } catch {
          /* use as-is */
        }
      }

      const payload: Record<string, unknown> = {
        matchId,
        captain: captainId,
        vice_captain: viceCaptainId,
        players: playerIds,
        fantasyApp,
        authToken: effectiveAuthToken,
        sportIndex: 0,
        type: isEdit ? "edit" : "new",
      };
      if (isEdit && existingTeamId !== undefined) {
        payload.id = existingTeamId;
        payload.team_id = existingTeamId;
        payload.team_number = existingTeamId;
      }
      // My11Circle-specific fields
      if (fantasyApp === "my11circle") {
        if (account.my11circleChallenge) payload.my11circleChallenge = account.my11circleChallenge;
        if (account.my11circleUserId) payload.my11circleUserId = account.my11circleUserId;
        if (account.mobileNumber) payload.my11circleMobile = account.mobileNumber;
      }
      if (account.mobileNumber) payload.mobileNumber = account.mobileNumber;

      const endpointChain = isEdit ? config.edit : config.add;
      let teamTransferred = false;
      let lastError = "Transfer failed";

      for (const endpoint of endpointChain) {
        try {
          // Build headers — include Authorization Bearer if available
          // The backend REQUIRES this for add-team/edit-team endpoints
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Origin: "https://teamgeneration.in",
            Referer: "https://teamgeneration.in/",
          };
          if (bearerToken && bearerToken.length >= 20) {
            headers["Authorization"] = `Bearer ${bearerToken}`;
          }
          const upRes = await fetch(`${BACKEND}${endpoint}`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
          });
          const upData = await upRes.json().catch(() => ({}));

          if (upData?.status === "success") {
            transferred.push({
              team_number: team.team_number,
              status: "transferred",
              operation: isEdit ? "edit" : "add",
              existingTeamId: existingTeamId,
            });
            teamTransferred = true;
            break;
          } else {
            lastError = upData?.message || upData?.error || "Transfer failed";
            if (isTokenExpired(lastError, upData)) break;
            const lower = lastError.toLowerCase();
            if (lower.includes("still processing") || lower.includes("try again later")) break;
          }
        } catch (e) {
          lastError = (e as Error).message;
        }
      }

      if (!teamTransferred) {
        failed.push({ team_number: team.team_number, error: lastError });
      }
    }

    const hash = `${fantasyApp}_${matchId}_${Date.now().toString(36)}`;
    const verb = teamsToEdit > 0 ? "replaced/added" : "transferred";

    return NextResponse.json({
      status: transferred.length > 0 ? "success" : "error",
      fantasyApp,
      matchId,
      hash,
      account: { mobileNumber: account.mobileNumber, linked: true },
      mode,
      existingTeamsCount: presentTeamCount,
      newSlots,
      teamsToEdit,
      teamsToAdd,
      transferred: transferred.length,
      teams: transferred,
      failed,
      message: `${transferred.length}/${totalToProcess} teams ${verb} (${teamsToEdit} edit, ${teamsToAdd} new)`,
      transferredAt: Date.now(),
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
