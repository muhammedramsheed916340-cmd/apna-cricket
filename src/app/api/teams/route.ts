import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Store generated teams for a match so the transfer step can send real
// team data (players, captain, vice-captain) to the fantasy platform.
// Teams are persisted per-match in a cookie (up to 500 teams).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId, teams, type } = body as {
      matchId?: string;
      teams?: any[];
      type?: string;
    };
    if (!matchId || !Array.isArray(teams)) {
      return NextResponse.json(
        { status: "error", message: "matchId and teams[] are required" },
        { status: 400 }
      );
    }
    const store = await cookies();
    const key = `tg_teams_${matchId}`;
    const payload = Buffer.from(
      JSON.stringify({
        matchId,
        type: type || "smart",
        teams,
        savedAt: Date.now(),
      })
    ).toString("base64");
    store.set(key, payload, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
    return NextResponse.json({
      status: "success",
      matchId,
      count: teams.length,
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json(
      { status: "error", message: "matchId is required" },
      { status: 400 }
    );
  }
  const store = await cookies();
  const raw = store.get(`tg_teams_${matchId}`)?.value;
  if (!raw) {
    return NextResponse.json({
      status: "success",
      matchId,
      teams: [],
    });
  }
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    return NextResponse.json({
      status: "success",
      matchId,
      type: parsed.type,
      teams: parsed.teams || [],
      savedAt: parsed.savedAt,
    });
  } catch {
    return NextResponse.json({
      status: "success",
      matchId,
      teams: [],
    });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json(
      { status: "error", message: "matchId is required" },
      { status: 400 }
    );
  }
  const store = await cookies();
  store.delete(`tg_teams_${matchId}`);
  return NextResponse.json({ status: "success", message: "Teams cleared" });
}
