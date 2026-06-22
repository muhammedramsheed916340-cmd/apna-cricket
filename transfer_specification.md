# Fantasy Transfer — COMPLETE Specification (Task 24)

This document is an exhaustive, code-quoted specification of how fantasy team transfer works in `/tmp/real3/src/`. Every fact below is taken verbatim from the source files (no guessing, no summarization).

Backend base URL (every file): `https://tgsoftware-api.online`
AES key (every file that decrypts): `coder_bobby_believer01_tg_software`

---

## 1. File-by-file analysis

### 1.1 `/tmp/real3/src/app/api/fantasy/send-otp/route.ts`

**HTTP method:** `POST`
**This route's URL (frontend → Next.js):** `/api/fantasy/send-otp`
**Backend URL called:** `POST https://tgsoftware-api.online/api/fantasy/send-otp`

**Request payload (frontend → this route):**
```ts
{ fantasyApp: string, mobileNumber: string }
```
Field types: `fantasyApp` = string (e.g. `"dream11"`, `"my11circle"`, `"jumbo"`); `mobileNumber` = string (10 digits).

**Validation:**
```ts
if (!fantasyApp || !mobileNumber) {
  return NextResponse.json(
    { error: "fantasyApp and mobileNumber are required" },
    { status: 400 }
  );
}
```

**Headers sent to backend:**
```ts
{ "Content-Type": "application/json" }
```
(No Authorization header is sent on this endpoint.)

**Backend fetch:**
```ts
const res = await fetch(`${BACKEND_URL}/api/fantasy/send-otp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ fantasyApp, mobileNumber }),
  signal: AbortSignal.timeout(20000),
});
const data = await res.json();
```

**Response handling:** Pass-through — returns the backend response as-is, with the backend's HTTP status.
```ts
return NextResponse.json(data, { status: res.status });
```
Inline comment documents the expected backend response shapes:
- `dream11` → `{ status: "success", data: { state: "...", retries_left: 5, resends_left: 5, resend_after: ... }, message: "..." }`
- `my11circle` → `{ status: "success", data: {}, message: "OTP successfully sent to ..." }`
- `jumbo` → `{ status: "success", message: "OTP successfully sent to ..." }`

**Success:** backend returns `status: "success"` (or `data`/`state` is truthy).
**Failure:** network/timeout → `{ status: "fail", error: "Failed to send OTP. Please check your connection and try again." }` (HTTP 200).

---

### 1.2 `/tmp/real3/src/app/api/fantasy/verify-otp/route.ts`

**HTTP method:** `POST`
**This route's URL:** `/api/fantasy/verify-otp`
**Backend URL:** `POST https://tgsoftware-api.online/api/fantasy/verify-otp`

**Request payload (frontend → this route):**
```ts
{
  fantasyApp: string,                 // e.g. "dream11"
  mobileNumber: string,               // 10-digit
  otp?: string,                       // 6-digit (legacy alias)
  verificationCode?: string,          // 6-digit (preferred)
  // Platform-specific, sourced from send-otp response:
  state?: string,                     // dream11
  reasonCode?: string|number,         // my11circle
  challenge?: string,                 // my11circle
  loginAuthToken?: string,            // myteam11 (sent as Loginauthtoken)
  userId?: string,                    // vision11
}
```
Code:
```ts
const code = verificationCode || otp;
if (!fantasyApp || !mobileNumber || !code) {
  return NextResponse.json(
    { error: "fantasyApp, mobileNumber, and verification code are required" },
    { status: 400 }
  );
}
```

**Payload built for backend (matches original APK):**
```ts
const payload: Record<string, string | number> = {
  fantasyApp,
  mobileNumber,
  verificationCode: code,
};
if (fantasyApp === "dream11" && state) payload.state = state;
if (fantasyApp === "my11circle") {
  if (reasonCode) payload.reasonCode = reasonCode;
  if (challenge) payload.challenge = challenge;
}
if (fantasyApp === "myteam11" && loginAuthToken) {
  payload.Loginauthtoken = loginAuthToken;     // Capital "L" — original APK quirk
}
if (fantasyApp === "vision11" && userId) payload.userId = userId;
```

**Headers sent to backend:**
```ts
{ "Content-Type": "application/json" }
```
(No Authorization header.)

**Backend fetch:**
```ts
const res = await fetch(`${BACKEND_URL}/api/fantasy/verify-otp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(25000),
});
const responseText = await res.text();
```

**Response parsing:** Read text first, then JSON.parse. If `data.data` is a string, decrypt with AES (`coder_bobby_believer01_tg_software`) and JSON.parse the result.
```ts
let rd: unknown = data.data || data;
if (typeof data.data === "string" && data.data) {
  const decrypted = decryptAES(data.data);
  if (decrypted) {
    try { rd = JSON.parse(decrypted); }
    catch { rd = { rawDecrypted: decrypted }; }
  }
}
```

**Token extraction (`findTokenDeep` + `extractRealToken`):**
- `findTokenDeep` recurses up to depth 5, checking keys in order: `token`, `authToken`, `access_token`, `accessToken`. Returns the first string longer than 5 chars.
- `extractRealToken(rawToken)`:
  - If token starts with `{`, JSON.parse and look for `accessToken`, `access_token`, `token`, `authToken` in that order.
  - Otherwise, return the raw string as-is.

**CRITICAL:** The route returns the **raw, full token** (including the JSON wrapper if present) — NOT the extracted `accessToken`:
```ts
return NextResponse.json({
  status: "success",
  token: rawToken,                  // FULL raw token (JSON wrapper preserved)
  accessToken: extractedAccessToken, // Extracted JWT for reference
  data: rd,
  my11circleChallenge: my11circleChallenge as string | null,
  my11circleUserId: my11circleUserId as string | null,
  message: (data.message as string) || "Account linked successfully",
}, { status: 200 });
```
The comment block (lines 194–202) explicitly states:
> The backend's add-team endpoint expects the FULL JSON token like:
>   `{"accessToken":"eyJ...","refreshToken":"...","idToken":"..."}`
> NOT just the extracted accessToken JWT.

**Success:** `token` field is non-empty (raw token returned).
**Failure:**
- Non-JSON response → `{ status: "fail", error: "Unexpected response from verification server. Please try again.", code: "INVALID_RESPONSE" }`
- Backend returns `status: "fail"` or `"error"` → `{ status: "fail", error: <msg>, message: <msg> }`
- Success with no token → returns `{ status: "success", data: rd, message: ... }` (frontend must extract token itself).

**My11Circle extra extraction:** Pulls `my11circleChallenge` and `my11circleUserId` out of `rd` (top-level or `rd.data`).

---

### 1.3 `/tmp/real3/src/app/api/fantasy/list-of-teams/route.ts`

**HTTP method:** `POST`
**This route's URL:** `/api/fantasy/list-of-teams`
**Backend URLs (per platform, run in parallel via `Promise.any`):**
```ts
const LIST_ENDPOINTS: Record<string, string[]> = {
  dream11: [
    `${BACKEND_URL}/api/fantasy/list-of-teams`,
    `${BACKEND_URL}/api/classic/dream11/list-of-teams`,
  ],
  my11circle: [
    `${BACKEND_URL}/api/fantasy/list-of-teams`,
    `${BACKEND_URL}/api/classic/my11circle/list-of-teams`,
  ],
  jumbo: [
    `${BACKEND_URL}/api/fantasy/list-of-teams`,
  ],
};
const DEFAULT_ENDPOINTS = [`${BACKEND_URL}/api/fantasy/list-of-teams`];
```

**Request payload (frontend → this route):**
```ts
{
  fantasyApp: string,
  matchId: string | number,
  authToken: string,
  userId?: string,                  // vision11
  my11circleChallenge?: string,
  my11circleUserId?: string,
  my11circleMobile?: string,
  userToken?: string,               // Google OAuth JWT — used as Bearer
}
```
Validation: `fantasyApp`, `matchId`, `authToken` all required (else HTTP 200 + `{ status:"fail", error:"..." }`).

**Payload built for backend:**
```ts
const payload: Record<string, unknown> = {
  fantasyApp,
  matchId: String(matchId),
  authToken,
};
if (fantasyApp === "vision11" && userId) payload.userId = userId;
if (fantasyApp === "my11circle") {
  if (my11circleChallenge) payload.my11circleChallenge = String(my11circleChallenge);
  if (my11circleUserId)    payload.my11circleUserId    = String(my11circleUserId);
  if (my11circleMobile)    payload.my11circleMobile    = String(my11circleMobile);
}
```

**Headers — BEARER IS SENT HERE:**
```ts
const effectiveToken = await resolveBearerToken(userToken);
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${effectiveToken}`,
};
```
`effectiveToken` is `userToken` if longer than 20 chars, else shared pool token, else empty string.
Even with empty `effectiveToken`, the header is still sent as `Authorization: Bearer ` (empty after space).

**Parallel fetch (Promise.any):** Each endpoint gets a 10-second timeout.
- HTTP 404 → reject that endpoint, try others.
- Non-JSON → reject.
- `data.status === "success"` → decrypt `data.data` if string, extract `teams_list` from `rd.teams_list || data.teams_list`. Resolve `{type:"success", teamsList, endpointUrl}`.
- Token-related error message (`invalid token`, `token expired`, `auth`) → resolve `{type:"token_error", errorMsg, endpointUrl}` (returns immediately, doesn't try others).
- Other errors → reject (let other endpoints try).

**Success response:**
```ts
{ status: "success", teams_list: [...] }
```
Each team is `{ team_id: string, captain: number, vice_captain: number, player_list: number[] }` (per top-of-file comment).

**Failure modes:**
- Token error → `{ status: "fail", error: <msg>, teams_list: [] }`
- All endpoints fail → `{ status: "fail", error: "Could not fetch existing teams. Transfer will create new teams instead.", teams_list: [] }` (intentional — lets transfer proceed in "add" mode).

---

### 1.4 `/tmp/real3/src/app/api/fantasy/classic-addteam/route.ts`

**HTTP method:** `POST`
**This route's URL:** `/api/fantasy/classic-addteam`
**Backend URL:** platform-specific:
```ts
if (fantasyApp === "dream11")    endpoint = `${BACKEND_URL}/api/classic/dream11/addteam`;
else if (fantasyApp === "my11circle") endpoint = `${BACKEND_URL}/api/classic/my11circle/addteam`;
else if (fantasyApp === "jumbo")      endpoint = `${BACKEND_URL}/api/classic/jumbo/addteam`;
else                                   endpoint = `${BACKEND_URL}/api/classic/dream11/addteam`;
```

**Request payload (frontend → this route):**
```ts
{
  fantasyApp: string,
  tgMatchId: string,
  playerData: <opaque>,
  captainData: <opaque>,
  vicecaptainData: <opaque>,
}
```
All five fields required (else HTTP 400).

**Payload built for backend:**
```ts
const payload = {
  tgMatchId,
  playerData,
  captainData,
  vicecaptainData,
  generateLinkFlag: "general",
};
```

**Headers:** `{ "Content-Type": "application/json" }` only (NO Authorization).

**Response parsing:** If `data.data` is a string, decrypt via `decryptString` (AES key from `tg-api.ts`) and extract `parsed.link`. Falls back to `data.data.link` if it's already an object.

**Success:**
```ts
return NextResponse.json({
  status: data.status || (res.ok ? "success" : "error"),
  link,
  message: data.message || "",
}, { status: res.status });
```

**NOTE:** This route generates a *transfer link* — it does NOT directly create a team on the platform. Used by the classic-share-link flow.

---

### 1.5 `/tmp/real3/src/app/api/fantasy/auth-verify/route.ts`

**HTTP method:** `POST`
**This route's URL:** `/api/fantasy/auth-verify`
**Backend URL:** `POST https://tgsoftware-api.online/api/fantasy/auth/verify`

**Request payload (frontend → this route):**
```ts
{
  fantasyApp: string,
  authToken: string,
  matchId?: string | number,
  userToken?: string,                  // Bearer JWT
  my11circleChallenge?: string,
  my11circleUserId?: string,
  my11circleMobile?: string,
}
```
Validation: `fantasyApp` and `authToken` required.

**Payload built for backend:**
```ts
const payload: Record<string, string | null> = { fantasyApp, authToken };
if (matchId) payload.matchId = String(matchId);
if (fantasyApp === "my11circle") {
  if (my11circleChallenge) payload.my11circleChallenge = String(my11circleChallenge);
  if (my11circleUserId)    payload.my11circleUserId    = String(my11circleUserId);
  if (my11circleMobile)    payload.my11circleMobile    = String(my11circleMobile);
}
```

**Headers (Bearer is sent):**
```ts
headers: {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${await resolveBearerToken(body.userToken)}`,
},
```

**Backend fetch (8s timeout):**
```ts
const res = await fetch(`${BACKEND_URL}/api/fantasy/auth/verify`, {
  method: "POST",
  headers,
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(8000),
});
```

**Response parsing:**
- Non-JSON → `{ validToken: null, retryable: true, message: "Could not verify token - server returned unexpected response" }`
- HTTP 401/403 → `{ validToken: false, error: "Token expired or invalid", needsReauth: true }`
- Otherwise → pass through backend response as-is.

**Success:** `data.validToken === true` (and optionally `data.updateUiToken === true` with `data.authToken` containing a refreshed token).
**Failure:** `data.validToken === false`, OR HTTP 401/403, OR `data.status === "fail"`.

---

### 1.6 `/tmp/real3/src/app/api/fantasy/check-auth/route.ts`

**HTTP method:** `POST`
**This route's URL:** `/api/fantasy/check-auth`
**Backend URLs:** platform-specific "teams" listing:
```ts
if (app === "dream11")         endpoint = `${BACKEND_URL}/api/classic/dream11/teams`;
else if (app === "my11circle") endpoint = `${BACKEND_URL}/api/classic/my11circle/teams`;
else                            endpoint = `${BACKEND_URL}/api/classic/dream11/teams`;
```

**Request payload (frontend → this route):**
```ts
{ authToken: string, fantasyApp?: string, mobileNumber?: string }
```
Validation: `authToken` required and `10 < token.length < 5000` (else `INVALID_TOKEN_FORMAT`).

**Payload built for backend:**
```ts
{ authToken, mobileNumber: mobileNumber || "" }
```

**Headers:** `{ "Content-Type": "application/json" }` only (NO Authorization).

**Response parsing:** If backend returns `status: "success"` → token is valid. If error message contains `token`, `auth`, `session`, or `expired` → `TOKEN_EXPIRED` + `needsReauth: true`. Otherwise returns format-based validation (`valid: isValidFormat`).

**NOTE:** This route is a secondary validator, used to surface token-expiry warnings. The primary path is `auth-verify` + reactive error handling in the transfer route.

---

### 1.7 `/tmp/real3/src/lib/shared-token.ts`

**Purpose:** Manage a shared Google JWT pool so users without their own Google OAuth can still hit Bearer-protected endpoints.

**Storage:** Prisma `AppSetting` table, encrypted-at-rest (per docstring).
- Key `shared_google_jwt` → the JWT string.
- Key `shared_google_jwt_expiry` → ISO timestamp.

**Functions:**
- `getSharedToken()` — returns the JWT string, or null if missing/expired/shorter than 20 chars.
- `setSharedToken(token, expiryDays=30)` — upserts both keys.
- `clearSharedToken()` — sets both keys to `""`.
- `resolveBearerToken(userToken?)` — **the key function**:
```ts
export async function resolveBearerToken(userToken?: string | null): Promise<string> {
  if (userToken && userToken.length > 20) return userToken;   // 1. User's own JWT
  const shared = await getSharedToken();                       // 2. Shared pool
  if (shared) return shared;
  return userToken || "";                                       // 3. Empty string
}
```
- `hasSharedToken()` — boolean for frontend status display.

---

### 1.8 `/tmp/real3/src/lib/tg-api.ts`

**Exports used by the transfer flow:**
- `decryptString(encrypted)` — `CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)`, returns `""` on error. `ENCRYPTION_KEY = "coder_bobby_believer01_tg_software"`.
- `decryptJSON<T>(encrypted)` — `decryptString` + `JSON.parse`.
- `fetchMatches(sport)` — `GET https://tgsoftware-api.online/api/fantasy/matches/${sport}`, expects `{ status:"success", data:[encryptedMatchStrings] }`. Each match is AES-encrypted JSON. Filters out matches older than 6 hours.
- `fetchMatchDetail(matchId)` — `GET /api/fantasy/match/${matchId}`, returns `{ status, data: RawMatchDetail }` (NOT encrypted at top level — but `match_time`, team names/images, and player objects ARE individually AES-encrypted).
- `generateTransferUrl(platform, matchId, players, captainIndex, viceCaptainIndex)` — builds a *deep-link URL* (e.g. `https://dream11.com/teams/create?match=...&players=...&captain=...&vice_captain=...`). Used for the share-link flow only.

**Sport role maps:**
```ts
const CRICKET_ROLES = ["WK", "BAT", "AL", "BOWL"];
const FOOTBALL_ROLES = ["GK", "DEF", "MID", "FWD"];
const BASKETBALL_ROLES = ["GK", "DEF", "MID", "FWD"];
const KABADDI_ROLES = ["DEF", "ALL", "RAID"];
const SPORT_INDEX_MAP = { 0:"cricket", 1:"football", 2:"basketball", 3:"kabaddi" };
```

**RawPlayer** (the decrypted player shape from the backend):
```ts
interface RawPlayer {
  name: string; image: string; playing: number; last_play: number;
  last_play_text: string; role: number; credits: number; points: number;
  selected_by: number; captain_percentage: number; vice_captain_percentage: number;
  team_index: number; team_name: string; player_fixed_id: number; pl_id: number;
  player_type: string;
  fantasy_id_list: Array<{ name: string; id: number }>;  // <-- the source of platform-specific fantasy IDs
  player_index: number;
}
```
The frontend extracts each player's per-platform fantasy ID from `fantasy_id_list[].id` where `fantasy_id_list[].name === platform`.

---

### 1.9 `/tmp/real3/src/components/OTPDialog.tsx` (handleSendOTP + handleVerifyOTP)

**`handleSendOTP()` (lines 42–65):**

Frontend → `/api/fantasy/send-otp`:
```ts
const res = await fetch("/api/fantasy/send-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ fantasyApp, mobileNumber }),
});
const data = await res.json();
```

Mobile number validation: must be ≥ 10 digits (`mobileNumber.length < 10` blocks).

Success condition:
```ts
if (res.ok && (data.status === "success" || data.state || data.data)) {
```
On success, the platform-specific data is pulled from `rd = data.data || data`:
- `rd.state` → saved as `otpState` (dream11)
- `rd.reasonCode` → saved as `reasonCode` (my11circle)
- `rd.challenge` → saved as `challenge` (my11circle)
- `rd.login_auth_token` → saved as `loginAuthToken` (myteam11)
- `rd.userId` → saved as `userId` (vision11)

Then advances `step` to `2`, sets 60-second resend cooldown.

**`handleVerifyOTP()` (lines 67–120):**

OTP validation: must be ≥ 6 digits.

Frontend → `/api/fantasy/verify-otp` payload:
```ts
const payload: Record<string, string | number | null | undefined> = {
  fantasyApp,
  mobileNumber,
  verificationCode: otp,
};
if (fantasyApp === "dream11" && otpState) payload.state = otpState;
if (fantasyApp === "my11circle") {
  if (reasonCode) payload.reasonCode = reasonCode;
  if (challenge)  payload.challenge  = challenge;
}
if (fantasyApp === "myteam11" && loginAuthToken) {
  payload.Loginauthtoken = loginAuthToken;       // Capital "L" (matches original APK)
}
if (fantasyApp === "vision11" && userId) payload.userId = userId;

const res = await fetch("/api/fantasy/verify-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const data = await res.json();
const rd = data.data || data;
```

Token extraction (frontend):
```ts
let token = data.token || rd.token || data.authToken || rd.authToken;
const my11circleChallengeFromResp = data.my11circleChallenge || rd.my11circleChallenge;
const my11circleUserIdFromResp    = data.my11circleUserId    || rd.my11circleUserId;
```

On success (`token` truthy) the `FantasyAccount` is built and saved to localStorage:
```ts
onLinked({
  mobileNumber,
  authToken: token,                 // FULL raw token (may be a JSON string)
  linkedAt: new Date().toISOString(),
  my11circleChallenge: my11circleChallengeFromResp || challenge || undefined,
  my11circleUserId:    my11circleUserIdFromResp    || undefined,
  userId: userId || rd.userId || undefined,
});
```

On failure:
```ts
const msg = data.error || data.message || rd.error || rd.message || "Invalid OTP. Please check and try again.";
setErrorMsg(msg);
setRetryCount(prev => prev + 1);
```

`FantasyAccount` shape (from `types.ts`):
```ts
interface FantasyAccount {
  mobileNumber: string;
  authToken: string;             // The token used in every transfer
  linkedAt: string;              // ISO timestamp
  my11circleChallenge?: string;
  my11circleUserId?: string;
  userId?: string;               // vision11
}
```

---

### 1.10 `/tmp/real3/src/components/TeamTransferScreen.tsx` (buildTransferPayloads + executeTransferBatch)

**Constants & state (lines 21–40):**
```ts
const [existingTeams, setExistingTeams] = useState<Array<{
  team_id: string; captain: number; vice_captain: number; player_list: number[];
}>>([]);
const maxTeams = platform === "dream11" ? 11 : 40;   // dream11 = 11, others = 40
const newSlots = Math.max(0, maxTeams - presentTeamCount);
```

**`getUserToken()` (lines 137–139):**
```ts
const getUserToken = useCallback((): string => {
  try { return localStorage.getItem("user_token") || ""; } catch { return ""; }
}, []);
```

**`fetchExistingTeams()` (lines 61–91):**
```ts
const res = await fetch("/api/fantasy/list-of-teams", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fantasyApp: platform,
    matchId,
    authToken: currentAccount.authToken,
    userId: currentAccount.userId,
    userToken: getUserToken(),
  }),
});
const data = await res.json();
if (data.status === "success" && Array.isArray(data.teams_list)) {
  setExistingTeams(data.teams_list);
}
```

**`addPlatformFields()` (lines 152–167):**
```ts
if (platform === "my11circle" && currentAccount) {
  if (currentAccount.my11circleChallenge) payload.my11circleChallenge = currentAccount.my11circleChallenge;
  if (currentAccount.my11circleUserId)    payload.my11circleUserId    = currentAccount.my11circleUserId;
  if (currentAccount.mobileNumber)        payload.my11circleMobile    = currentAccount.mobileNumber;
}
if (platform === "vision11" && currentAccount?.userId) {
  payload.userId = currentAccount.userId;
}
```

**`buildTransferPayloads(mode)` (lines 169–248):**

Three modes:
- `"all"` (default): edit `min(presentTeamCount, selectedTeams.length)` teams, add the rest as new.
- `"newSlotsOnly"`: only add new teams, capped at `newSlots`.
- `"custom"`: edit `customReplaceCount` + add `customAddCount` (X+Y ≤ selCount).

Per-team payload build:
```ts
const playerIds = team.players
  .map(p => p.fantasyId)
  .filter((id): id is number => id !== null && id !== undefined);

// VALIDATION: skip teams with < 11 fantasy IDs
if (playerIds.length < 11) { continue; }

const captainPlayer      = team.players.find(p => p.isCaptain);
const viceCaptainPlayer  = team.players.find(p => p.isViceCaptain);

// Captain/VC are FANTASY IDs (numbers), NOT array indices
const rawCaptainId      = captainPlayer?.fantasyId || playerIds[0] || 0;
const rawViceCaptainId  = viceCaptainPlayer?.fantasyId || playerIds[1] || 0;
const captainId     = typeof rawCaptainId     === "number" ? rawCaptainId     : parseInt(String(rawCaptainId), 10);
const viceCaptainId = typeof rawViceCaptainId === "number" ? rawViceCaptainId : parseInt(String(rawViceCaptainId), 10);

// VALIDATION: captain/VC must be non-zero numbers
if (!captainId || isNaN(captainId) || !viceCaptainId || isNaN(viceCaptainId)) { continue; }

const payload: Record<string, unknown> = {
  matchId,
  captain: captainId,            // NUMBER — critical
  vice_captain: viceCaptainId,   // NUMBER — critical
  players: playerIds,            // number[] of fantasy IDs
  fantasyApp: platform,
  authToken: currentAccount?.authToken,
  sportIndex,
  type: isEdit ? "edit" : "new", // "edit" or "new"
  userToken: getUserToken(),     // Google OAuth JWT (optional)
};

if (isEdit && existingTeams[i]) {
  payload.id = existingTeams[i].team_id;
}

addPlatformFields(payload);
```

**`buildReplacePayloads()` (lines 282–343):** Same as above, but `type: "edit"` always, and `payload.id` is the *user-selected* existing team ID (not the i-th one).

**`executeTransferBatch(payloads)` (lines 579–763):**

Parallel batch size: `5` teams at a time.
Per-platform delay between batches:
```ts
const delay = platform === "dream11" ? 200 : platform === "my11circle" ? 800 : 500;
```

Per-team request:
```ts
const res = await fetch("/api/fantasy/transfer", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ...payload, skipPreVerify: true }),
});
const data = await res.json();

if (data.status === "success") {
  successCount++;
  return { success: true, index: i };
}
```

Error code handling (frontend):
- `TOKEN_EXPIRED` → try `tryRefreshToken()` once via `/api/fantasy/auth-verify`. If refresh succeeds, update `payloads[j].authToken` for all remaining teams and retry. If refresh fails → fail remaining teams.
- `NO_AUTH_TOKEN` → fail this team, mark `tokenExpired: true`.
- `NO_BEARER_TOKEN` → fail this team (legacy safety net).
- `DEADLINE_PASSED` → fail this team + remaining (deadline is global).
- `TEAM_LIMIT_REACHED` → fail this team + remaining.
- `MISSING_PLAYERS`, `MISSING_CAPTAIN`, `MISSING_VICE_CAPTAIN`, `INSUFFICIENT_PLAYERS`, `MISSING_MATCH_ID`, `INVALID_CAPTAIN_ID`, `INVALID_VICE_CAPTAIN_ID` → fail this team, no retry.
- Other → retry once, then fail.

After batch:
```ts
setTransferResult({ success: successCount, fail: failCount, errors: errorMsgs });
```
On any success → toast "Transfer Complete! ✅", refetch existing teams after 1s.
On `confirmedTokenExpiry` → toast "Session Expired 🔐" (does NOT clear account data).
On all-fail with proxy/token-format errors → toast "Transfer Failed — Re-link Required 🔄".

**`tryRefreshToken()` (lines 518–572):** Calls `/api/fantasy/auth-verify` with `{ fantasyApp, authToken, matchId, [my11circle fields] }`. If `verifyData.validToken === false` → return null. If `verifyData.updateUiToken && verifyData.authToken` → update localStorage + state, return the new token. Otherwise return the existing token.

---

### 1.11 `/tmp/real3/src/app/api/fantasy/transfer/route.ts` (the FULL 707-line file)

**HTTP method:** `POST`
**This route's URL:** `/api/fantasy/transfer`
**Backend URLs (per platform, sequential with fallback):**
```ts
const PLATFORM_ENDPOINTS: Record<string, EndpointConfig> = {
  dream11: {
    addEndpoints: [
      `${BACKEND_URL}/api/fantasy/add-team`,
      `${BACKEND_URL}/api/classic/dream11/addteam`,   // 2nd-chance fallback
    ],
    editEndpoints: [ `${BACKEND_URL}/api/fantasy/edit-team` ],
    delayBetweenRetries: 2000,
  },
  my11circle: {
    addEndpoints: [ `${BACKEND_URL}/api/fantasy/add-team` ],
    editEndpoints: [ `${BACKEND_URL}/api/fantasy/edit-team` ],
    delayBetweenRetries: 3000,
  },
  jumbo: {
    addEndpoints: [ `${BACKEND_URL}/api/fantasy/add-team` ],
    editEndpoints: [ `${BACKEND_URL}/api/fantasy/edit-team` ],
    delayBetweenRetries: 2000,
  },
  vision11: {
    addEndpoints: [ `${BACKEND_URL}/api/fantasy/add-team` ],
    editEndpoints: [ `${BACKEND_URL}/api/fantasy/edit-team` ],
    delayBetweenRetries: 2000,
  },
  myteam11: {
    addEndpoints: [ `${BACKEND_URL}/api/fantasy/add-team` ],
    editEndpoints: [ `${BACKEND_URL}/api/fantasy/edit-team` ],
    delayBetweenRetries: 2000,
  },
};
const DEFAULT_CONFIG: EndpointConfig = {
  addEndpoints:    [ `${BACKEND_URL}/api/fantasy/add-team` ],
  editEndpoints:   [ `${BACKEND_URL}/api/fantasy/edit-team` ],
  delayBetweenRetries: 2000,
};
```

**Request payload (frontend → this route) — ALL fields read from body:**
```ts
const {
  authToken,            // string — fantasy platform token (REQUIRED)
  matchId,              // string | number (REQUIRED)
  captain,              // number (REQUIRED, converted via toNumber)
  vice_captain,         // number (REQUIRED, converted via toNumber)
  players,              // number[] | comma-string (REQUIRED, ≥11 items)
  fantasyApp,           // string (default "dream11")
  sportIndex,           // number (default 0)
  type,                 // "edit" | "new" (default "add" → "new")
  id,                   // string (REQUIRED if type="edit")
  mobileNumber,         // string (optional, added if present)
  userId,               // string (vision11 only)
  my11circleChallenge,  // string (my11circle only)
  my11circleUserId,     // string (my11circle only)
  my11circleMobile,     // string (my11circle only)
  userToken,            // string — Google OAuth JWT (used as Bearer)
  skipPreVerify,        // boolean (defaults to true at frontend)
} = body;
```

**Validation (`validateTransferParams`, lines 84–120):**
- `authToken` missing → `NO_AUTH_TOKEN` + `needsAuth: true`
- `matchId` missing → `MISSING_MATCH_ID`
- `captain` falsy or 0 → `MISSING_CAPTAIN`
- `vice_captain` falsy or 0 → `MISSING_VICE_CAPTAIN`
- `players` not array or empty → `MISSING_PLAYERS`
- `players.length < 11` → `INSUFFICIENT_PLAYERS`
- `fantasyApp` missing → `MISSING_FANTASY_APP`
- `type === "edit" && !id` → `MISSING_TEAM_ID`

**Captain/VC type coercion (`toNumber`, lines 190–197):**
```ts
function toNumber(val: unknown): number | null {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }
  return null;
}
```
If `captain` or `vice_captain` cannot be coerced → returns `INVALID_CAPTAIN_ID` / `INVALID_VICE_CAPTAIN_ID`.

**Player IDs parsing (lines 284–323):** Accepts comma-separated string OR array. Each item is parsed via `parseInt` (string items only). Final `numericPlayerIds` is `number[]` with all zeros filtered out.

**Bearer token resolution (line 277):**
```ts
const bearerToken = await resolveBearerToken(userToken);
```
Same logic as in `shared-token.ts`: user JWT (if > 20 chars) → shared pool → empty string.

**BYPASS MODE (lines 342–351):** If `bearerToken` is empty or shorter than 20 chars, the route does NOT abort. It logs a warning and continues — the transfer is attempted without an `Authorization` header.

**Pre-verification gate (lines 356–374):**
```ts
if (skipPreVerify !== true && !skipPreVerify) {
  const tokenValid = await preVerifyToken(preparedToken, app, String(matchId), bearerToken);
  if (tokenValid === false) {
    return NextResponse.json({
      status: "fail",
      error: `Your ${app} session has expired. Please re-link your account via OTP verification before transferring teams.`,
      code: "TOKEN_EXPIRED",
      needsReauth: true,
    }, { status: 200 });
  }
}
```
Frontend always sends `skipPreVerify: true`, so this is normally skipped.

**`preVerifyToken()` (lines 203–249):** Calls `POST https://tgsoftware-api.online/api/fantasy/auth/verify` with `{ fantasyApp, authToken, matchId }` and `Authorization: Bearer ${bearerToken}` (8s timeout). Skipped entirely if `bearerToken.length < 20`. Returns `true`/`false`/`null` (null = can't verify, don't block).

**Final payload built (lines 376–403):**
```ts
const payload: Record<string, unknown> = {
  matchId,
  captain: captainNum,
  vice_captain: viceCaptainNum,
  players: numericPlayerIds,
  fantasyApp: app,
  authToken: preparedToken,        // String(authToken)
  sportIndex: sport,
};

if (operation === "edit" && id !== undefined && id !== null) {
  payload.id = id;
}

if (app === "my11circle") {
  if (my11circleChallenge) payload.my11circleChallenge = my11circleChallenge;
  if (my11circleUserId)    payload.my11circleUserId    = my11circleUserId;
  if (my11circleMobile)    payload.my11circleMobile    = my11circleMobile;
}

if (app === "vision11" && userId) {
  payload.userId = userId;
}

if (mobileNumber) {
  payload.mobileNumber = mobileNumber;
}
```

**NOTE:** `type` and `userToken` are NOT forwarded to the backend — they are consumed by this route.

**Headers sent to backend (lines 433–436):**
```ts
const headers: Record<string, string> = { "Content-Type": "application/json" };
if (bearerToken && bearerToken.length >= 20) {
  headers["Authorization"] = `Bearer ${bearerToken}`;
}
```
So `Authorization` is **conditionally omitted** if no Bearer is available (bypass mode).

**Fetch (lines 437–442):**
```ts
const res = await fetch(endpointUrl, {
  method: "POST",
  headers,
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(15000),   // 15s
});
```

**Response handling per endpoint (lines 446–548):**
1. Read response as text, then JSON.parse.
2. Non-JSON or HTML/404 → log + skip to next endpoint.
3. Call `isTransferSuccess(res.status, data)`.

**`isTransferSuccess()` (lines 68–79) — STRICT success criterion:**
```ts
function isTransferSuccess(_httpStatus: number, data: Record<string, unknown>): {
  success: boolean;
  confidence: 'definite' | 'tentative';
} {
  // ONLY explicit `status: "success"` is a real success (matches original APK)
  if (data.status === "success") {
    return { success: true, confidence: 'definite' };
  }
  // Everything else is a failure — including HTTP 201 + "Something Went Wrong!"
  return { success: false, confidence: 'definite' };
}
```
**IMPORTANT:** This was a deliberate fix. The comment block (lines 53–67) explains:
> The original APK ONLY counts `data.status === "success"` as success.
> Everything else — including HTTP 201 + `{status:"fail", message:"Something Went Wrong!"}` — is a FAILURE.
> The team was NOT created on the platform.
> Previously this code incorrectly treated HTTP 201 + "Something Went Wrong!" as a "tentative success". That was a false assumption — the backend returns 201 when the platform rejected the request (missing/expired Bearer token, invalid authToken, etc).

**On success (lines 476–499):**
- Decrypt `data.data` if it's an AES-encrypted string.
- Return:
```ts
{
  status: "success",
  method: endpointUrl.includes("classic") ? "classic" : "fantasy",
  endpoint: endpointUrl,
  platform: app,
  operation: operation,
  data: responseData || null,
  httpStatus: res.status,
  confidence: transferResult.confidence,
  message: "Team added on <app> successfully" | "Team replaced on <app> successfully",
}
```

**On failure — confirmed token expiry check (`isConfirmedTokenExpiry`, lines 19–51):**
The following error strings (case-insensitive, substring match) trigger immediate `TOKEN_EXPIRED`:
- `invalid token`, `token expired`, `token is expired`, `access token expired`
- `jwt expired`, `jwt malformed`, `invalid jwt`
- `authentication failed`, `auth token invalid`
- `login required`, `user not authenticated`, `not authenticated`, `session expired`
- `account locked`, `expired token`, `invalid or expired`
- `proxy returned 400`, `proxy returned 401`, `proxy returned 403`
- Also: `data.validToken === false && data.status === "fail"` → true

On confirmed expiry → return `{ status:"fail", code:"TOKEN_EXPIRED", needsReauth:true, backendError: lastError }`.

**On failure — deadline (lines 521–529):**
Error message contains `deadline`, `match expired`, or `match started` → `DEADLINE_PASSED`.

**On failure — team limit (lines 532–539):**
Error message contains `limit`, `maximum`, or `already` → `TEAM_LIMIT_REACHED`.

**On HTTP 404 (lines 542–545):** skip to next endpoint in the chain.

**Edit-fallback-to-add (lines 561–650):**
If `operation === "edit"` and all edit endpoints failed (and the failure was NOT a confirmed token expiry), the route tries the add endpoints as a fallback:
```ts
const fallbackPayload = { ...payload };
delete fallbackPayload.id;
fallbackPayload.type = "new";

for (const fallbackUrl of addEndpoints) {
  // POST with Authorization header (forced here, even in bypass mode)
  const fallbackRes = await fetch(fallbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${bearerToken}`,   // <-- NOTE: forced here even if empty
    },
    body: JSON.stringify(fallbackPayload),
    signal: AbortSignal.timeout(30000),
  });
  // ... same isTransferSuccess check ...
}
```
**Quirk:** The fallback branch always sets `Authorization: Bearer <bearerToken>` — even if `bearerToken` is empty (which would send `Authorization: Bearer ` literally). This is an inconsistency vs. the main branch (which omits the header in bypass mode).

**Final failure response (lines 661–695):**
Friendly error mapping:
- `"All proxy attempts failed"` → "The <app> server rejected the transfer. Your session may have expired..."
- `"Something Went Wrong!"` → "The <app> server returned an error. Your session has likely expired..."
- `"Proxy returned 400"` → "Your <app> session has expired (the platform rejected the request)..."
- `"Error while transfering the team!"` → "Failed to transfer team on <app>..."
- Non-JSON + `lastHttpStatus === 0` → "Could not reach the <app> transfer server..."

Final failure shape:
```ts
{
  status: "fail",
  error: displayError,
  code: "TRANSFER_ERROR",
  needsReauth: false,
  backendError: lastError,
  httpStatus: lastHttpStatus,
  platform: app,
  operation: operation,
  endpointsTried: endpointChain,
  details: {
    matchId: String(matchId),
    captain: captainNum,
    vice_captain: viceCaptainNum,
    playerCount: numericPlayerIds.length,
    teamId: id || null,
    tokenLength: preparedToken.length,
    tokenIsJWT: preparedToken.startsWith("eyJ"),
    tokenIsJSON: preparedToken.startsWith("{"),
  },
}
```

---

## 2. Complete transfer payloads per platform

All payloads are POSTed to `https://tgsoftware-api.online/api/fantasy/add-team` (add) or `/api/fantasy/edit-team` (edit). Dream11 add also has a fallback to `/api/classic/dream11/addteam`.

### 2.1 Dream11 — ADD new team

**Endpoint:** `POST https://tgsoftware-api.online/api/fantasy/add-team`
(Fallback: `POST https://tgsoftware-api.online/api/classic/dream11/addteam`)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <userToken>   (OPTIONAL — only if bearerToken.length >= 20)
```

**Body:**
```json
{
  "matchId": "674ab1234def56789abc0123",
  "captain": 12345,
  "vice_captain": 67890,
  "players": [12345, 67890, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999],
  "fantasyApp": "dream11",
  "authToken": "eyJhbGciOiJIUzI1NiIs...<FULL token string, possibly JSON-wrapped>",
  "sportIndex": 0
}
```

Field types:
- `matchId`: string (Mongo ObjectId-style)
- `captain`: **number** (the player's Dream11 fantasy ID)
- `vice_captain`: **number** (the player's Dream11 fantasy ID)
- `players`: **number[]** (≥11 Dream11 fantasy IDs)
- `fantasyApp`: literal string `"dream11"`
- `authToken`: string (FULL token from verify-otp, may be a JSON string like `{"accessToken":"...","refreshToken":"..."}`)
- `sportIndex`: number (0 = cricket, 1 = football, 2 = basketball, 3 = kabaddi)

### 2.2 Dream11 — EDIT/REPLACE existing team

**Endpoint:** `POST https://tgsoftware-api.online/api/fantasy/edit-team`

**Headers:** same as add (Authorization conditional).

**Body:**
```json
{
  "matchId": "674ab1234def56789abc0123",
  "captain": 12345,
  "vice_captain": 67890,
  "players": [12345, 67890, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999],
  "fantasyApp": "dream11",
  "authToken": "<FULL token>",
  "sportIndex": 0,
  "id": "674ab1234def56789abc0123_team_1"
}
```
The extra `id` field is the existing team's `team_id` from `list-of-teams`.

### 2.3 My11Circle — ADD new team

**Endpoint:** `POST https://tgsoftware-api.online/api/fantasy/add-team`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <userToken>   (OPTIONAL)
```

**Body:**
```json
{
  "matchId": "674ab1234def56789abc0123",
  "captain": 98765,
  "vice_captain": 43210,
  "players": [98765, 43210, 13579, 24680, ...11+ IDs],
  "fantasyApp": "my11circle",
  "authToken": "<FULL token>",
  "sportIndex": 0,
  "my11circleChallenge": "<challenge-from-verify-otp>",
  "my11circleUserId": "<my11circleUserId-from-verify-otp>",
  "my11circleMobile": "9876543210"
}
```

### 2.4 My11Circle — EDIT/REPLACE existing team

**Endpoint:** `POST https://tgsoftware-api.online/api/fantasy/edit-team`

**Headers:** same as add.

**Body:** same as My11Circle add, PLUS:
```json
{
  ...same fields as add...,
  "id": "<existing-team-id>"
}
```

### 2.5 Jumbo — ADD new team

**Endpoint:** `POST https://tgsoftware-api.online/api/fantasy/add-team`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <userToken>   (OPTIONAL)
```

**Body:**
```json
{
  "matchId": "674ab1234def56789abc0123",
  "captain": 55555,
  "vice_captain": 66666,
  "players": [55555, 66666, ...11+ IDs],
  "fantasyApp": "jumbo",
  "authToken": "<FULL token>",
  "sportIndex": 0
}
```
No platform-specific extra fields for Jumbo.

### 2.6 Jumbo — EDIT/REPLACE existing team

**Endpoint:** `POST https://tgsoftware-api.online/api/fantasy/edit-team`

**Headers:** same.

**Body:** same as Jumbo add, PLUS:
```json
{
  ...same fields...,
  "id": "<existing-team-id>"
}
```

---

## 3. Authorization / Bearer header requirement

**Conditional / OPTIONAL on the main transfer path** (the working "bypass mode"):

From `/tmp/real3/src/app/api/fantasy/transfer/route.ts` lines 342–351 and 433–436:
```ts
if (!bearerToken || bearerToken.length < 20) {
  console.warn(`[Transfer][NO_BEARER] No Google JWT available for ${app}. Attempting transfer WITHOUT Bearer token (bypass mode). Backend may reject.`);
  // Don't return — fall through and try the backend anyway
}
// ... later:
const headers: Record<string, string> = { "Content-Type": "application/json" };
if (bearerToken && bearerToken.length >= 20) {
  headers["Authorization"] = `Bearer ${bearerToken}`;
}
```

So: **`Authorization` header is OMITTED entirely if no Bearer is available.** The transfer is still attempted.

**Required on these other endpoints:**
- `/api/fantasy/list-of-teams` — always sends `Authorization: Bearer ${effectiveToken}` (even if `effectiveToken` is empty — sends `Bearer ` literally).
- `/api/fantasy/auth/verify` (called by `preVerifyToken` AND `auth-verify` route) — always sends `Authorization: Bearer ${resolveBearerToken(userToken)}`.
- `/api/fantasy/transfer`'s **edit→add fallback branch** (lines 578–584) — always sends `Authorization: Bearer ${bearerToken}` even in bypass mode (quirk — likely sends `Bearer ` if no token).

**NOT sent on:**
- `/api/fantasy/send-otp`
- `/api/fantasy/verify-otp`
- `/api/fantasy/classic-addteam`
- `/api/fantasy/check-auth`

---

## 4. How `authToken` is obtained (OTP flow) and its exact format

### 4.1 Flow

1. User opens OTP dialog, enters 10-digit mobile number.
2. Frontend POSTs `/api/fantasy/send-otp` with `{ fantasyApp, mobileNumber }`.
3. Backend `tgsoftware-api.online/api/fantasy/send-otp` returns `{ status:"success", data:{ state?, reasonCode?, challenge?, login_auth_token?, userId? }, message }`.
4. Frontend saves platform-specific fields (state for dream11, reasonCode/challenge for my11circle, login_auth_token for myteam11, userId for vision11).
5. User enters 6-digit OTP.
6. Frontend POSTs `/api/fantasy/verify-otp` with `{ fantasyApp, mobileNumber, verificationCode, [platform-specific fields] }`.
7. Backend returns `{ status:"success", data: <possibly-AES-encrypted> }`.
8. The Next.js verify-otp route:
   - Decrypts `data.data` if string.
   - Recursively searches for a token in keys: `token`, `authToken`, `access_token`, `accessToken`.
   - Returns `{ status:"success", token: <RAW FULL token>, accessToken: <extracted JWT>, data, my11circleChallenge?, my11circleUserId? }`.
9. Frontend stores `token` (the RAW token, NOT extracted `accessToken`) as `FantasyAccount.authToken` in localStorage `tg_multi_accounts`.

### 4.2 Exact authToken format

The authToken stored and sent to the transfer endpoint is the **RAW token string returned by the backend**, which may be in either of two forms:

**(a) Plain JWT string:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi...
```
(Starts with `eyJ` — three base64-encoded JWT segments separated by dots.)

**(b) JSON-wrapped token string:**
```
{"accessToken":"eyJhbGciOi...","refreshToken":"eyJhbGciOi...","idToken":"eyJhbGciOi..."}
```
(Starts with `{` — a JSON object serialized to a string.)

**CRITICAL:** The verify-otp route comment (lines 194–202) explicitly states:
> The backend's add-team endpoint expects the FULL JSON token like `{"accessToken":"eyJ...","refreshToken":"...","idToken":"..."}`, NOT just the extracted accessToken JWT. We were previously extracting just accessToken, which caused "Something Went Wrong!" errors.

So the authToken sent to `/api/fantasy/add-team` is the FULL raw token (form (b) if the backend returned JSON, form (a) if the backend returned a plain JWT).

The transfer route logs token shape via:
```ts
console.log(`[Transfer][REQUEST] authToken: len=${preparedToken.length}, isJWT=${preparedToken.startsWith("eyJ")}, isJSON=${preparedToken.startsWith("{")}`);
```

---

## 5. How existing teams are fetched (`list-of-teams`)

**Frontend call (TeamTransferScreen.tsx lines 67–77):**
```ts
const res = await fetch("/api/fantasy/list-of-teams", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fantasyApp: platform,
    matchId,
    authToken: currentAccount.authToken,
    userId: currentAccount.userId,
    userToken: getUserToken(),
  }),
});
const data = await res.json();
if (data.status === "success" && Array.isArray(data.teams_list)) {
  setExistingTeams(data.teams_list);
}
```

**Next.js route forwards to backend** with platform-specific endpoint selection:
- dream11 → tries `https://tgsoftware-api.online/api/fantasy/list-of-teams` AND `https://tgsoftware-api.online/api/classic/dream11/list-of-teams` in parallel (`Promise.any`).
- my11circle → tries `https://tgsoftware-api.online/api/fantasy/list-of-teams` AND `https://tgsoftware-api.online/api/classic/my11circle/list-of-teams` in parallel.
- jumbo → tries only `https://tgsoftware-api.online/api/fantasy/list-of-teams`.

Backend payload:
```json
{
  "fantasyApp": "dream11",
  "matchId": "674ab1234def56789abc0123",
  "authToken": "<FULL raw token>",
  // my11circle also:
  "my11circleChallenge": "<challenge>",
  "my11circleUserId": "<userId>",
  "my11circleMobile": "9876543210",
  // vision11 also:
  "userId": "<vision11-userId>"
}
```
(All values cast via `String(...)` for my11circle/vision11 fields.)

Headers: `Content-Type: application/json` + `Authorization: Bearer <effectiveToken>`.

**Response parsing:** `data.status === "success"` → decrypt `data.data` (AES) if string → extract `rd.teams_list || data.teams_list`. Each team is `{ team_id: string, captain: number, vice_captain: number, player_list: number[] }`.

**Failure handling:** If all endpoints fail, returns `{ status:"fail", teams_list: [] }`. The frontend then proceeds in "add" mode (no existing teams to edit).

---

## 6. Success / failure detection logic

### 6.1 Backend transfer success criterion (transfer/route.ts `isTransferSuccess`)

**SUCCESS = `data.status === "success"` (string equality, case-sensitive).**

Everything else is a FAILURE — including:
- HTTP 200 + `{ status:"fail", message:"..." }`
- HTTP 201 + `{ status:"fail", message:"Something Went Wrong!" }` (this was previously misclassified as "tentative success"; the comment block explicitly documents the fix)
- HTTP 4xx/5xx with any body

The route logs `confidence: 'definite'` for both success and failure (no 'tentative' is ever returned by the current code — that branch was removed).

### 6.2 Frontend success criterion (TeamTransferScreen.tsx executeTransferBatch)

```ts
const data = await res.json();
if (data.status === "success") {
  successCount++;
  return { success: true, index: i };
}
```
Identical to backend: only `data.status === "success"` counts.

### 6.3 Token-expiry detection (transfer/route.ts `isConfirmedTokenExpiry`)

Returns `true` if any of these substrings appear in the error message (case-insensitive):
- `invalid token`, `token expired`, `token is expired`, `access token expired`
- `jwt expired`, `jwt malformed`, `invalid jwt`
- `authentication failed`, `auth token invalid`
- `login required`, `user not authenticated`, `not authenticated`
- `session expired`, `account locked`, `expired token`, `invalid or expired`
- `proxy returned 400`, `proxy returned 401`, `proxy returned 403`

Also: `data.validToken === false && data.status === "fail"` → true.

On confirmed expiry → `code:"TOKEN_EXPIRED", needsReauth:true`.

### 6.4 Other failure code mappings

| Code | Trigger |
|------|---------|
| `NO_AUTH_TOKEN` | `authToken` missing in request body |
| `MISSING_MATCH_ID` | `matchId` falsy |
| `MISSING_CAPTAIN` | `captain` falsy or 0 |
| `MISSING_VICE_CAPTAIN` | `vice_captain` falsy or 0 |
| `MISSING_PLAYERS` | `players` not array or empty |
| `INSUFFICIENT_PLAYERS` | `players.length < 11` |
| `MISSING_FANTASY_APP` | `fantasyApp` falsy |
| `MISSING_TEAM_ID` | `type === "edit"` and `id` falsy |
| `INVALID_CAPTAIN_ID` | `captain` not coercible to number |
| `INVALID_VICE_CAPTAIN_ID` | `vice_captain` not coercible to number |
| `TOKEN_EXPIRED` | Confirmed token expiry (above) |
| `DEADLINE_PASSED` | Error contains `deadline`, `match expired`, or `match started` |
| `TEAM_LIMIT_REACHED` | Error contains `limit`, `maximum`, or `already` |
| `TRANSFER_ERROR` | All endpoints failed, none of the above |
| `SERVER_ERROR` | Uncaught exception in route handler |

### 6.5 Displayed error mapping (transfer/route.ts lines 661–673)

| Backend `lastError` | Displayed to user |
|---|---|
| `"All proxy attempts failed"` | `"The <app> server rejected the transfer. Your session may have expired. Please re-link your account via OTP verification and try again."` |
| `"Something Went Wrong!"` | `"The <app> server returned an error. Your session has likely expired - please re-link your account via OTP verification."` |
| `"Proxy returned 400"` | `"Your <app> session has expired (the platform rejected the request). Please re-link your account via OTP verification."` |
| `"Error while transfering the team!"` | `"Failed to transfer team on <app>. Your auth session has likely expired. Try re-linking your <app> account via OTP verification."` |
| Non-JSON + `lastHttpStatus === 0` | `"Could not reach the <app> transfer server. Please check your internet connection and try again."` |

### 6.6 Frontend retry & stop conditions (executeTransferBatch)

- Batch size = 5 teams in parallel.
- Per-team max retries = 1 (so up to 2 attempts per team).
- Inter-batch delay: 200 ms (dream11), 800 ms (my11circle), 500 ms (jumbo/others).
- On `TOKEN_EXPIRED`: attempt `tryRefreshToken()` once. If refresh succeeds, update all remaining payloads' `authToken` and retry. If refresh fails, stop the whole batch.
- On `DEADLINE_PASSED` or `TEAM_LIMIT_REACHED`: fail remaining teams in the batch (don't dispatch them).
- Final toast:
  - `successCount > 0` → "Transfer Complete! ✅ <n> teams transferred...". Refetch existing teams after 1 s.
  - All fail + confirmed expiry → "Session Expired 🔐" toast (account data NOT cleared).
  - All fail + proxy/token errors → "Transfer Failed — Re-link Required 🔄" toast.
  - All fail other → "Transfer Failed" toast with first error message.

---

## 7. End-to-end flow summary

1. **User links account:** OTPDialog → `send-otp` → `verify-otp` → `FantasyAccount.authToken` saved to `localStorage.tg_multi_accounts[platform][0]`.
2. **User opens transfer screen:** `TeamTransferScreen` calls `fetchExistingTeams()` → `list-of-teams` → `existingTeams[]` populated, `presentTeamCount` and `newSlots` calculated (`maxTeams` = 11 for dream11, 40 for others).
3. **User picks mode:** "all" / "newSlotsOnly" / "custom" (or replace-selected).
4. **`buildTransferPayloads(mode)`** builds one payload per team. Captain/VC = fantasy IDs as numbers, players = `number[]` of fantasy IDs (≥11), `type: "edit"|"new"`, `id: existingTeam.team_id` for edits, `userToken: localStorage.user_token` (optional).
5. **`executeTransferBatch(payloads)`** sends each payload (with `skipPreVerify: true`) to `/api/fantasy/transfer`.
6. **`transfer/route.ts`** validates, resolves Bearer via `resolveBearerToken(userToken)`, builds the final backend payload (drops `type` and `userToken`), POSTs to the platform's `add-team`/`edit-team` endpoint chain.
7. **Backend response:** Only `data.status === "success"` counts as success.
8. **On token-expiry error:** Frontend tries `auth-verify` to refresh; if backend returns `updateUiToken + authToken`, updates localStorage and retries the failed team.
9. **On success:** Toast + refetch existing teams after 1 s.

---

## 8. Key gotchas (must-know for any future refactor)

1. **Captain/VC MUST be numbers** (the player's fantasy ID, not array index). Backend rejects strings.
2. **authToken MUST be the FULL raw token** (JSON-wrapped if backend returned JSON). Extracting just `accessToken` causes "Something Went Wrong!".
3. **`data.status === "success"` is the ONLY success criterion.** HTTP 201 + `{status:"fail"}` is a FAILURE.
4. **Players array must have ≥ 11 numeric IDs.** Teams with fewer are skipped silently at frontend.
5. **Dream11 has TWO add endpoints** (`/api/fantasy/add-team` first, then `/api/classic/dream11/addteam` as fallback). Others have only one.
6. **list-of-teams runs endpoints in parallel** (`Promise.any`) — first success wins.
7. **`Authorization: Bearer` is OPTIONAL** on the main transfer path (bypass mode). It is REQUIRED on `list-of-teams` and `auth-verify` (always sent, even if empty).
8. **Edit→add fallback** (lines 561–650) deletes `payload.id`, sets `payload.type = "new"`, and forces `Authorization: Bearer ${bearerToken}` (even if empty — a quirk).
9. **my11circle requires 3 extra fields:** `my11circleChallenge`, `my11circleUserId`, `my11circleMobile`. Without these, transfers fail.
10. **`myteam11` uses `Loginauthtoken`** (capital L) in verify-otp — original APK quirk preserved.
11. **`sportIndex`:** 0=cricket, 1=football, 2=basketball, 3=kabaddi. Defaults to 0.
12. **`maxTeams`:** dream11 = 11, my11circle/jumbo = 40.
13. **Frontend batch size = 5** with per-platform delays (200/800/500 ms). Backend per-endpoint timeout = 15 s (main) or 30 s (fallback).
14. **Token refresh:** Only attempted ONCE per team. If `tryRefreshToken()` fails, all remaining teams in the batch are failed.
15. **`skipPreVerify: true`** is sent by frontend on every transfer request — pre-verification is bypassed for speed. Token expiry is detected reactively.

---

End of specification. Every fact above is quoted or paraphrased directly from `/tmp/real3/src/`. No guesses.
