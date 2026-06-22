import { NextResponse } from "next/server";
import { getMatchPlayers } from "@/lib/players";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json(
      { status: "error", message: "matchId is required" },
      { status: 400 }
    );
  }
  const players = getMatchPlayers(matchId);
  return NextResponse.json({
    status: "success",
    matchId,
    count: players.length,
    players,
  });
}
