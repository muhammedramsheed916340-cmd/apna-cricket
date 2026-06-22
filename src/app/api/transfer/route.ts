import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

interface TransferReq {
  matchId?: string;
  fantasyApp?: "dream11" | "my11circle" | "jumbo";
  teams?: { team_number: number }[];
  action?: "single" | "all" | "bulk" | "join-contests";
  fromIdx?: number; // 0-based start
  toIdx?: number; // 0-based end
  batchCount?: number; // number of teams in this batch
}

const PLATFORM_LIMITS: Record<string, number> = {
  dream11: 40,
  my11circle: 40,
  jumbo: 50,
};

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

    // Verify the fantasy account is linked
    const store = await cookies();
    const raw = store.get(`tg_fantasy_${fantasyApp}`)?.value;
    if (!raw) {
      return NextResponse.json(
        {
          status: "error",
          message: `${fantasyApp} account not linked. Please login with OTP first.`,
        },
        { status: 401 }
      );
    }

    let account;
    try {
      account = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    } catch {
      return NextResponse.json(
        { status: "error", message: "Invalid account session" },
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
          {
            status: "error",
            message: "Maximum 500 teams per bulk transfer",
          },
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
      // "all" — transfer the provided teams (or a default batch)
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

    // Simulate the platform transfer
    await new Promise((r) => setTimeout(r, 1200));

    const hash = `${fantasyApp}_${matchId}_${Date.now().toString(36)}`;
    const transferred = teamList.map((n) => ({
      team_number: n,
      status: "transferred",
      contestId:
        action === "join-contests"
          ? `c${Math.floor(100000 + Math.random() * 900000)}`
          : undefined,
    }));

    const messages: Record<string, string> = {
      single: `Team transferred to ${fantasyApp}`,
      all: `${transferred.length} teams transferred to ${fantasyApp}`,
      bulk: `Bulk transfer complete: ${transferred.length} teams (Team #${startIdx + 1} to #${endIdx + 1}) transferred to ${fantasyApp}`,
      "join-contests": `All contests joined for ${transferred.length} teams on ${fantasyApp}`,
    };

    return NextResponse.json({
      status: "success",
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
          ? { from: startIdx + 1, to: endIdx + 1, count: transferred.length }
          : undefined,
      transferred: transferred.length,
      teams: transferred,
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
