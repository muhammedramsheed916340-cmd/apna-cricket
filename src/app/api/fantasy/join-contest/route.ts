import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyLicenseKey } from "@/lib/license-verify";

export const dynamic = "force-dynamic";

const BACKEND = "https://tgsoftware-api.online";

// Join a free contest with specified team IDs
// Mirrors original: POST /api/{platform}/contest/join-contest
export async function POST(req: Request) {
  try {
    // ====== SERVER-SIDE LICENSE VERIFICATION (mandatory) ======
    const cookieStore = await cookies();
    const licenseKey = cookieStore.get("tg_license_key")?.value || "";
    const licenseCheck = verifyLicenseKey(licenseKey);
    if (!licenseCheck.authorized) {
      return NextResponse.json(
        { status: "fail", error: licenseCheck.error, code: licenseCheck.code },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let { fantasyApp = "dream11", matchId, authToken, contestId, teamIds, userToken } = body;

    if (!matchId) {
      return NextResponse.json({ status: "fail", error: "matchId is required" });
    }
    if (!contestId) {
      return NextResponse.json({ status: "fail", error: "contestId is required" });
    }
    if (!authToken) {
      const store = await cookies();
      const raw = store.get(`tg_fantasy_${fantasyApp}`)?.value;
      if (raw) {
        try {
          const account = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
          authToken = account.authToken;
        } catch {}
      }
    }
    if (!authToken) {
      return NextResponse.json({
        status: "fail",
        error: `Account not linked. Please link your ${fantasyApp} account first.`,
        code: "NO_AUTH_TOKEN",
        needsAuth: true,
      });
    }

    const platform = fantasyApp === "dream11" ? "dream11" : "my11circle";
    const endpoint = `${BACKEND}/api/${platform}/contest/join-contest`;

    const parsedTeamIds = Array.isArray(teamIds)
      ? teamIds.map((id: any) => parseInt(String(id), 10)).filter((n) => !isNaN(n) && n > 0)
      : [];

    if (parsedTeamIds.length === 0) {
      return NextResponse.json({ status: "fail", error: "No team IDs provided" });
    }

    const payload = {
      authToken: String(authToken),
      matchId: String(matchId),
      contestId: String(contestId),
      teamIds: parsedTeamIds,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (userToken) {
      headers["Authorization"] = `Bearer ${userToken}`;
    }

    console.log(`[JoinContest] ${platform}: contest=${contestId}, teams=${parsedTeamIds.length}`);

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
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
      const joinResults = (data.joinResults as any[]) || [];
      const summary = (data.summary as any) || {};
      const successCount = summary.successCount || joinResults.filter((r) => r.success).length;
      const failedCount = summary.failedCount || joinResults.filter((r) => !r.success).length;

      console.log(`[JoinContest] Success: ${successCount} joined, ${failedCount} failed`);

      return NextResponse.json({
        status: "success",
        platform,
        contestId,
        joinResults,
        summary: { successCount, failedCount },
        message: `${successCount} team(s) joined contest successfully`,
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
      error: (data.message as string) || (data.error as string) || "Failed to join contest",
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { status: "fail", error: errMsg.includes("timeout") ? "Request timed out" : `Network error: ${errMsg}` },
      { status: 500 }
    );
  }
}
