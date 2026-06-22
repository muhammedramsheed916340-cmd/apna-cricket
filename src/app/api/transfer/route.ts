import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Transfer to Dream11 - mimics the original transfer arena flow.
// In production this would call Dream11's mapper API; here we simulate the
// transfer process realistically and return a transfer summary.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId, teams = [], action = "transfer" } = body as {
      matchId?: string;
      teams?: { team_number: number }[];
      action?: string;
    };

    if (!matchId) {
      return NextResponse.json(
        { status: "error", message: "matchId is required" },
        { status: 400 }
      );
    }

    // Simulate the Dream11 hash/transfer flow
    await new Promise((r) => setTimeout(r, 1200));

    const hash = `d11_${matchId}_${Date.now().toString(36)}`;
    const transferred = teams.map((t) => ({
      team_number: t.team_number,
      status: "transferred",
      contestId: `c${Math.floor(100000 + Math.random() * 900000)}`,
    }));

    return NextResponse.json({
      status: "success",
      action,
      matchId,
      hash,
      transferred: transferred.length,
      teams: transferred,
      message:
        action === "all"
          ? `All ${transferred.length} teams transferred to Dream11`
          : `Team transferred to Dream11`,
      transferredAt: Date.now(),
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
