import { NextResponse } from "next/server";
import { fetchMatchDetail } from "@/lib/tg-api";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json(
      { status: "error", message: "matchId is required" },
      { status: 400 }
    );
  }

  // Fetch REAL players from the original backend (decrypted)
  const detail = await fetchMatchDetail(matchId);
  if (!detail) {
    return NextResponse.json({
      status: "error",
      message: "Failed to fetch match detail",
      players: [],
    });
  }

  // Convert to the Player format expected by the UI
  const allPlayers = detail.players.map((p, i) => ({
    id: `${p.name}-${i}`,
    name: p.name,
    role: p.role as 0 | 1 | 2 | 3,
    team: p.team === detail.team1Name ? "left" : "right",
    credits: p.credits,
    selBy: p.selectedBy,
    fantasyId: p.fantasyId,
    fantasyIdList: p.fantasyIdList,
    image: p.image,
    playing: p.playing,
    captainPercentage: p.captainPercentage,
    viceCaptainPercentage: p.viceCaptainPercentage,
  }));

  // STRICT LINEUP MODE: If lineups are out, return ONLY playing XI players
  // Hide all bench, substitute, reserve, injured, and non-playing players
  const lineupOut = allPlayers.some((p) => p.playing !== null && p.playing !== undefined);
  const players = lineupOut
    ? allPlayers.filter((p) => p.playing === true)
    : allPlayers;

  return NextResponse.json({
    status: "success",
    matchId,
    count: players.length,
    players,
    lineupOut,
    team1Name: detail.team1Name,
    team2Name: detail.team2Name,
  });
}
