"use client";

// Client-side storage for generated teams per match.
// Uses localStorage so teams persist across page navigations and are
// available to the transfer step without cookie round-trips.

const KEY = "tg_match_teams";

interface StoredTeams {
  matchId: string;
  type: string;
  teams: any[];
  savedAt: number;
}

export function storeTeams(matchId: string, type: string, teams: any[]): void {
  if (typeof window === "undefined") return;
  try {
    const all = getAllTeams();
    all[matchId] = { matchId, type, teams, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore quota errors */
  }
}

export function getTeams(matchId: string): StoredTeams | null {
  if (typeof window === "undefined") return null;
  try {
    const all = getAllTeams();
    return all[matchId] || null;
  } catch {
    return null;
  }
}

export function getTeamsCount(matchId: string): number {
  return getTeams(matchId)?.teams.length || 0;
}

export function clearTeams(matchId: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = getAllTeams();
    delete all[matchId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function getAllTeams(): Record<string, StoredTeams> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
