import { NextResponse } from "next/server";
import { CRICKET_MATCHES, type Match } from "@/lib/matches";

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

async function fetchLiveMatches(): Promise<Match[] | null> {
  try {
    const res = await fetch("https://teamgeneration.in/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const serverNow = Date.now();

    const matches: Match[] = [];
    const cardRegex =
      /<div class="match-card">[\s\S]*?<span class="series-name">([^<]+)<\/span>[\s\S]*?alt="left" src="([^"]+)"[\s\S]*?<span class="left-team-name">([^<]+)<\/span>[\s\S]*?<div class="timer">([^<]*)<\/div>[\s\S]*?<span class="right-team-name">([^<]+)<\/span>[\s\S]*?alt="right" src="([^"]+)"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    let cardMatch: RegExpExecArray | null;
    let idx = 0;
    while ((cardMatch = cardRegex.exec(html)) !== null) {
      const series = cardMatch[1].trim();
      const leftFlag = cardMatch[2].trim();
      const leftName = cardMatch[3].trim();
      const timer = cardMatch[4].trim();
      const rightName = cardMatch[5].trim();
      const rightFlag = cardMatch[6].trim();

      const badges: ("Mega GL" | "SL" | "H2H")[] = [];
      if (/badge-outline-success">Mega GL/.test(cardMatch[0])) badges.push("Mega GL");
      if (/badge-outline-warning">SL/.test(cardMatch[0])) badges.push("SL");
      if (/badge-outline-danger">H2H/.test(cardMatch[0])) badges.push("H2H");

      if (series && leftName && rightName && timer) {
        const targetTime = serverNow + parseTimerDuration(timer);
        // Map to our known match IDs based on team names so player data links up
        const idMap: Record<string, string> = {
          "NZ-SCO": "nz-sco-wt20",
          "SL-IRE": "sl-ire-wt20",
          "AUS-PAK": "aus-pak-wt20",
        };
        const key = `${leftName}-${rightName}`;
        const id = idMap[key] || `live-${idx}`;
        matches.push({
          id,
          series,
          sport: "cricket",
          leftTeam: { name: leftName, flag: leftFlag },
          rightTeam: { name: rightName, flag: rightFlag },
          badges: badges.length ? badges : ["Mega GL", "SL", "H2H"],
          targetTime,
        });
        idx++;
      }
    }
    return matches.length ? matches : null;
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
