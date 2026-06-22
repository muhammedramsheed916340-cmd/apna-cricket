import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BACKEND = "https://tgsoftware-api.online";

// Platform endpoint config — EXACT match to original source
const PLATFORM_ENDPOINTS: Record<string, { add: string[]; edit: string[] }> = {
  dream11: {
    add: [`${BACKEND}/api/fantasy/add-team`, `${BACKEND}/api/classic/dream11/addteam`],
    edit: [`${BACKEND}/api/fantasy/edit-team`],
  },
  my11circle: {
    add: [`${BACKEND}/api/fantasy/add-team`],
    edit: [`${BACKEND}/api/fantasy/edit-team`],
  },
  jumbo: {
    add: [`${BACKEND}/api/fantasy/add-team`],
    edit: [`${BACKEND}/api/fantasy/edit-team`],
  },
};
const DEFAULT_ENDPOINTS = {
  add: [`${BACKEND}/api/fantasy/add-team`],
  edit: [`${BACKEND}/api/fantasy/edit-team`],
};

// maxTeams per platform — EXACT match to TeamTransferScreen.tsx line 565
const MAX_TEAMS: Record<string, number> = {
  dream11: 11,
  my11circle: 40,
  jumbo: 40,
};

// Token expiry detection — EXACT match to original
function isConfirmedTokenExpiry(msg: string, data: any): boolean {
  const lower = (msg || "").toLowerCase().trim();
  const confirmed = [
    "invalid token", "token expired", "token is expired", "access token expired",
    "jwt expired", "jwt malformed", "invalid jwt", "authentication failed",
    "auth token invalid", "login required", "user not authenticated",
    "not authenticated", "session expired", "account locked", "expired token",
    "invalid or expired", "proxy returned 400", "proxy returned 401", "proxy returned 403",
  ];
  for (const c of confirmed) if (lower.includes(c)) return true;
  if (data?.validToken === false && data?.status === "fail") return true;
  return false;
}

// Get platform-specific fantasy ID
function getPlatformId(p: any, platform: string): number {
  if (typeof p === "number") return p;
  if (p.fantasyIdList && Array.isArray(p.fantasyIdList)) {
    const found = p.fantasyIdList.find((f: any) => f.name === platform);
    if (found && found.id) return found.id;
  }
  return p.fantasyId || 0;
}

// toNumber — EXACT match to original
function toNumber(val: unknown): number | null {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

interface TransferReq {
  authToken?: string;
  matchId?: string;
  captain?: number;
  vice_captain?: number;
  players?: number[];
  fantasyApp?: string;
  sportIndex?: number;
  type?: string;
  id?: string;
  mobileNumber?: string;
  userId?: string;
  my11circleChallenge?: string;
  my11circleUserId?: string;
  my11circleMobile?: string;
  userToken?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as TransferReq;
    let {
      authToken,
      matchId,
      captain,
      vice_captain,
      players,
      fantasyApp = "dream11",
      sportIndex = 0,
      type,
      id,
      mobileNumber,
      my11circleChallenge,
      my11circleUserId,
      my11circleMobile,
      userToken,
    } = body;

    // If authToken not in body, read from cookie (linked account)
    if (!authToken) {
      const store = await cookies();
      const raw = store.get(`tg_fantasy_${fantasyApp}`)?.value;
      if (raw) {
        try {
          const account = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
          authToken = account.authToken;
          // Also load my11circle fields from cookie if not in body
          if (fantasyApp === "my11circle") {
            if (!my11circleChallenge && account.my11circleChallenge) my11circleChallenge = account.my11circleChallenge;
            if (!my11circleUserId && account.my11circleUserId) my11circleUserId = account.my11circleUserId;
            if (!my11circleMobile && account.mobileNumber) my11circleMobile = account.mobileNumber;
          }
          if (!mobileNumber && account.mobileNumber) mobileNumber = account.mobileNumber;
        } catch {}
      }
    }

    // Validation
    if (!authToken) {
      return NextResponse.json({
        status: "fail",
        error: `Account not linked. Please link your ${fantasyApp} account first via OTP verification.`,
        code: "NO_AUTH_TOKEN",
        needsAuth: true,
      });
    }
    if (!matchId) {
      return NextResponse.json({ status: "fail", error: "Match ID is required for transfer", code: "MISSING_MATCH_ID" });
    }

    const captainNum = toNumber(captain);
    const viceCaptainNum = toNumber(vice_captain);

    if (captainNum === null) {
      return NextResponse.json({ status: "fail", error: `Invalid captain ID`, code: "INVALID_CAPTAIN_ID" });
    }
    if (viceCaptainNum === null) {
      return NextResponse.json({ status: "fail", error: `Invalid vice-captain ID`, code: "INVALID_VICE_CAPTAIN_ID" });
    }
    if (!captainNum) {
      return NextResponse.json({ status: "fail", error: "Captain is required", code: "MISSING_CAPTAIN" });
    }
    if (!viceCaptainNum) {
      return NextResponse.json({ status: "fail", error: "Vice-captain is required", code: "MISSING_VICE_CAPTAIN" });
    }

    // Parse player IDs
    let playerIds: number[];
    if (typeof players === "string") {
      playerIds = players.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
    } else if (Array.isArray(players)) {
      playerIds = players.map((p) => typeof p === "number" ? p : parseInt(String(p), 10)).filter((n) => !isNaN(n) && n > 0);
    } else {
      playerIds = [];
    }

    if (playerIds.length === 0) {
      return NextResponse.json({ status: "fail", error: "Players are required", code: "MISSING_PLAYERS" });
    }
    if (playerIds.length < 11) {
      return NextResponse.json({ status: "fail", error: `Need at least 11 players (have ${playerIds.length})`, code: "INSUFFICIENT_PLAYERS" });
    }

    const app = fantasyApp || "dream11";
    const sport = typeof sportIndex === "number" ? sportIndex : 0;
    const operation: "add" | "edit" = type === "edit" ? "edit" : "add";

    if (operation === "edit" && !id) {
      return NextResponse.json({ status: "fail", error: "Team ID is required for edit/replace operations", code: "MISSING_TEAM_ID" });
    }

    // Bearer token — OPTIONAL (bypass mode works without it)
    const bearerToken = userToken || "";

    // Build the BACKEND payload — EXACT match to original source (NO type, NO mobileNumber)
    const preparedToken = String(authToken);
    const payload: Record<string, unknown> = {
      matchId: matchId,
      captain: captainNum,
      vice_captain: viceCaptainNum,
      players: playerIds,
      fantasyApp: app,
      authToken: preparedToken,
      sportIndex: sport,
    };

    // For edit, include id
    if (operation === "edit" && id !== undefined && id !== null) {
      payload.id = id;
    }

    // My11Circle-specific fields
    if (app === "my11circle") {
      if (my11circleChallenge) payload.my11circleChallenge = my11circleChallenge;
      if (my11circleUserId) payload.my11circleUserId = my11circleUserId;
      if (my11circleMobile) payload.my11circleMobile = my11circleMobile;
    }

    if (app === "vision11" && mobileNumber) {
      payload.userId = mobileNumber;
    }

    // Get endpoint chain
    const config = PLATFORM_ENDPOINTS[app] || DEFAULT_ENDPOINTS;
    const endpointChain = operation === "edit" ? config.edit : config.add;

    console.log(`[Transfer] ${app} ${operation.toUpperCase()}: matchId=${matchId}, C=${captainNum}, VC=${viceCaptainNum}, players=${playerIds.length}, id=${id || "N/A"}`);

    // Execute with multi-endpoint fallback
    let lastError = "";
    let lastData: Record<string, unknown> | null = null;

    for (const endpointUrl of endpointChain) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        // Only include Authorization if we have a valid Bearer token
        if (bearerToken && bearerToken.length >= 20) {
          headers["Authorization"] = `Bearer ${bearerToken}`;
        }

        const res = await fetch(endpointUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });

        const responseText = await res.text();
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(responseText);
        } catch {
          lastError = `Server returned non-JSON response (HTTP ${res.status})`;
          continue;
        }

        console.log(`[Transfer] Response: status=${data.status}, message=${data.message || "N/A"}, http=${res.status}`);

        // SUCCESS: ONLY data.status === "success" (EXACT match to original)
        if (data.status === "success") {
          return NextResponse.json({
            status: "success",
            platform: app,
            operation,
            message: `Team ${operation === "edit" ? "replaced" : "added"} on ${app} successfully`,
          });
        }

        // Handle failure
        lastError = (data.message as string) || (data.error as string) || `HTTP ${res.status}`;
        lastData = data;

        // Token expiry → stop immediately
        if (isConfirmedTokenExpiry(lastError, data)) {
          return NextResponse.json({
            status: "fail",
            error: `Session expired on ${app}. Please re-link your account via OTP.`,
            code: "TOKEN_EXPIRED",
            needsReauth: true,
            backendError: lastError,
          });
        }

        // Deadline passed
        const lowerMsg = lastError.toLowerCase();
        if (lowerMsg.includes("deadline") || lowerMsg.includes("match expired") || lowerMsg.includes("match started")) {
          return NextResponse.json({
            status: "fail",
            error: "Match deadline has passed.",
            code: "DEADLINE_PASSED",
            backendError: lastError,
          });
        }

        // Team limit reached
        if (lowerMsg.includes("limit") || lowerMsg.includes("maximum") || lowerMsg.includes("already")) {
          return NextResponse.json({
            status: "fail",
            error: `Team limit reached on ${app}.`,
            code: "TEAM_LIMIT_REACHED",
            backendError: lastError,
          });
        }

        // Rate limiting
        if (lowerMsg.includes("still processing") || lowerMsg.includes("try again later")) {
          return NextResponse.json({
            status: "fail",
            error: "We are still processing your last request. Please try again later.",
            code: "RATE_LIMITED",
            retryable: true,
            backendError: lastError,
          });
        }

        // 404 → try next endpoint
        if (res.status === 404) continue;
        // Other errors → try next endpoint
        continue;

      } catch (fetchErr) {
        const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        lastError = errMsg.includes("timeout") ? "Transfer request timed out" : `Network error: ${errMsg}`;
        continue;
      }
    }

    // All endpoints failed
    return NextResponse.json({
      status: "fail",
      error: lastError || "Transfer failed. Please try again.",
      code: "TRANSFER_FAILED",
      backendError: lastError,
    });

  } catch (e) {
    return NextResponse.json(
      { status: "fail", error: (e as Error).message },
      { status: 500 }
    );
  }
}
