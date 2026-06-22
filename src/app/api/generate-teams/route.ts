import { NextResponse } from "next/server";
import { getMatchPlayers, type Player } from "@/lib/players";

export const dynamic = "force-dynamic";

interface GenRequest {
  matchId: string;
  type: "smart" | "grand" | "advanced";
  teamCount: number;
  combination: { wk: number; bat: number; ar: number; bowl: number };
  captainIds?: string[];
  viceCaptainIds?: string[];
}

interface GeneratedTeam {
  team_number: number;
  players: Player[];
  captain: Player;
  vicecaptain: Player;
  wk: number;
  bat: number;
  ar: number;
  bowl: number;
  leftCount: number;
  rightCount: number;
  totalCredits: number;
}

function pickByRole(players: Player[], role: number, count: number, teamBias: "left" | "right" | "balanced"): Player[] {
  const pool = players.filter((p) => p.role === role);
  // bias selection by selBy (popularity) with slight randomness
  const sorted = [...pool].sort((a, b) => b.selBy - a.selBy);
  const picked: Player[] = [];
  const leftPool = sorted.filter((p) => p.team === "left");
  const rightPool = sorted.filter((p) => p.team === "right");
  const lCount = teamBias === "left" ? Math.ceil(count * 0.6) : teamBias === "right" ? Math.floor(count * 0.4) : Math.floor(count / 2);
  const rCount = count - lCount;
  for (let i = 0; i < lCount && i < leftPool.length; i++) picked.push(leftPool[i]);
  for (let i = 0; i < rCount && i < rightPool.length; i++) picked.push(rightPool[i]);
  // fill remainder
  while (picked.length < count) {
    const remaining = sorted.filter((p) => !picked.includes(p));
    if (!remaining.length) break;
    picked.push(remaining[0]);
  }
  return picked.slice(0, count);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenRequest;
    const all = getMatchPlayers(body.matchId);
    if (!all.length) {
      return NextResponse.json(
        { status: "error", message: "No players found for match" },
        { status: 404 }
      );
    }

    const { wk, bat, ar, bowl } = body.combination;
    const total = wk + bat + ar + bowl;
    if (total !== 11) {
      return NextResponse.json(
        { status: "error", message: "Team must have exactly 11 players" },
        { status: 400 }
      );
    }

    const teams: GeneratedTeam[] = [];
    const count = Math.min(body.teamCount, 20);

    // Vary team bias per generated team for diversity
    const biases: ("left" | "right" | "balanced")[] = ["balanced", "left", "right"];
    for (let t = 0; t < count; t++) {
      const bias = biases[t % biases.length];
      const wkP = pickByRole(all, 0, wk, bias);
      const batP = pickByRole(all, 1, bat, bias);
      const arP = pickByRole(all, 2, ar, bias);
      const bowlP = pickByRole(all, 3, bowl, bias);
      const squad = [...wkP, ...batP, ...arP, ...bowlP];

      // Captain / Vice captain selection
      const capPool = body.captainIds?.length
        ? squad.filter((p) => body.captainIds!.includes(p.id))
        : squad;
      const vcPool = body.viceCaptainIds?.length
        ? squad.filter((p) => body.viceCaptainIds!.includes(p.id))
        : squad;
      const captain = capPool.length
        ? capPool[Math.floor(Math.random() * capPool.length)]
        : squad[0];
      const vicecaptain =
        vcPool.filter((p) => p.id !== captain.id)[0] ||
        squad.filter((p) => p.id !== captain.id)[0];

      const leftCount = squad.filter((p) => p.team === "left").length;
      const rightCount = squad.filter((p) => p.team === "right").length;
      const totalCredits = parseFloat(
        squad.reduce((s, p) => s + p.credits, 0).toFixed(1)
      );

      teams.push({
        team_number: t + 1,
        players: squad,
        captain,
        vicecaptain,
        wk: wkP.length,
        bat: batP.length,
        ar: arP.length,
        bowl: bowlP.length,
        leftCount,
        rightCount,
        totalCredits,
      });
    }

    return NextResponse.json({
      status: "success",
      type: body.type,
      matchId: body.matchId,
      combination: body.combination,
      count: teams.length,
      teams,
      generatedAt: Date.now(),
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
