import { NextResponse } from "next/server";
import { CRICKET_MATCHES, type Match } from "@/lib/matches";
import { fetchMatches } from "@/lib/tg-api";

export const dynamic = "force-dynamic";

// ====== In-memory cache (45s TTL) — short enough to stay fresh, long enough to avoid spam ======
let cachedMatches: Match[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 45 * 1000; // 45 seconds

// Fetch LIVE matches from the real backend (decrypted)
async function fetchLiveMatches(): Promise<Match[] | null> {
  try {
    const realMatches = await fetchMatches("cricket");
    if (!realMatches || realMatches.length === 0) return null;

    const now = Date.now();
    const matches: Match[] = realMatches
      .map((m) => {
        const targetTime = new Date(m.matchTime).getTime();
        return {
          id: m.id,
          series: m.series,
          sport: "cricket" as const,
          leftTeam: { name: m.team1Name, flag: m.team1Image },
          rightTeam: { name: m.team2Name, flag: m.team2Image },
          badges: ["Mega GL", "SL", "H2H"] as ("Mega GL" | "SL" | "H2H")[],
          targetTime: isNaN(targetTime) ? 0 : targetTime,
        };
      })
      // ====== Hide completed/cancelled matches (started > 4 hours ago) ======
      // Keep matches that haven't started yet OR started within last 4h (in case of delay)
      .filter((m) => {
        if (m.targetTime === 0) return true; // unknown time — keep
        return m.targetTime > now - 4 * 3600 * 1000;
      })
      // ====== Remove duplicate matches (same id) ======
      .filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx)
      // ====== Sort by start time (earliest first) ======
      .sort((a, b) => {
        // Matches with unknown time (0) go last
        if (a.targetTime === 0 && b.targetTime !== 0) return 1;
        if (a.targetTime !== 0 && b.targetTime === 0) return -1;
        return a.targetTime - b.targetTime;
      });

    return matches;
  } catch {
    return null;
  }
}

export async function GET() {
  const sport = "cricket";
  const now = Date.now();

  // Return cached matches if fresh (< 45s old)
  if (cachedMatches && cachedMatches.length && now - cachedAt < CACHE_TTL) {
    return NextResponse.json({
      status: "success",
      sport,
      data: cachedMatches,
      count: cachedMatches.length,
      source: "cache",
      fetchedAt: cachedAt,
    });
  }

  // Fetch fresh from backend
  const live = await fetchLiveMatches();
  const data = live && live.length ? live : CRICKET_MATCHES;

  // Update cache only if we got live data
  if (live && live.length) {
    cachedMatches = data;
    cachedAt = now;
  }

  return NextResponse.json({
    status: "success",
    sport,
    data,
    count: data.length,
    source: live && live.length ? "live" : "captured",
    fetchedAt: now,
  });
}
