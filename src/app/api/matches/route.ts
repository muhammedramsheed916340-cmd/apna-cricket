import { NextResponse } from "next/server";
import { CRICKET_MATCHES, type Match } from "@/lib/matches";
import { fetchMatches } from "@/lib/tg-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseTimerDuration(timer: string): number {
  let ms = 0;
  const h = timer.match(/(\d+)\s*h/i);
  const m = timer.match(/(\d+)\s*m(?!s)/i);
  const s = timer.match(/(\d+)\s*s/i);
  if (h) ms += parseInt(h[1], 10) * 3600 * 1000;
  if (m) ms += parseInt(m[1], 10) * 60 * 1000;
  if (s) ms += parseInt(s[1], 10) * 1000;
  return ms;
}

// Fetch LIVE matches from the real backend (decrypted)
async function fetchLiveMatches(): Promise<Match[] | null> {
  try {
    const realMatches = await fetchMatches("cricket");
    if (!realMatches || realMatches.length === 0) return null;

    const now = Date.now();
    const matches: Match[] = realMatches.map((m) => ({
      id: m.id, // REAL match ID (e.g. 113523)
      series: m.series,
      sport: "cricket",
      leftTeam: { name: m.team1Name, flag: m.team1Image },
      rightTeam: { name: m.team2Name, flag: m.team2Image },
      badges: ["Mega GL", "SL", "H2H"] as ("Mega GL" | "SL" | "H2H")[],
      targetTime: new Date(m.matchTime).getTime(),
    }));

    return matches;
  } catch {
    return null;
  }
}

export async function GET() {
  const sport = "cricket";
  const live = await fetchLiveMatches();
  const data = live && live.length ? live : CRICKET_MATCHES;
  return NextResponse.json({
    status: "success",
    sport,
    data,
    source: live && live.length ? "live" : "captured",
    fetchedAt: Date.now(),
  });
}
