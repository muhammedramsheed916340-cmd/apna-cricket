"use client";

// Client-side storage for generated teams per match.
// Uses localStorage so teams persist across page navigations and are
// available to the transfer step without cookie round-trips.

const KEY = "tg_match_teams";
const COMB_KEY = "tg_selected_combinations";

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

// ===== Combination storage =====
// Stores selected combinations per match so the generation pages can use them.

export interface Combination {
  label: string;
  wk: number;
  bat: number;
  ar: number;
  bowl: number;
}

export function storeCombinations(matchId: string, combinations: Combination[]): void {
  if (typeof window === "undefined") return;
  try {
    const all = getAllCombinations();
    all[matchId] = combinations;
    localStorage.setItem(COMB_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function getCombinations(matchId: string): Combination[] {
  if (typeof window === "undefined") return [];
  try {
    const all = getAllCombinations();
    return all[matchId] || [];
  } catch {
    return [];
  }
}

function getAllCombinations(): Record<string, Combination[]> {
  try {
    return JSON.parse(localStorage.getItem(COMB_KEY) || "{}");
  } catch {
    return {};
  }
}

// ===== Selected player pool storage =====
// Stores the 11 players selected on the Section page for use in generation pages

const POOL_KEY = "tg_selected_pool";

export function storePlayerPool(matchId: string, players: any[]): void {
  if (typeof window === "undefined") return;
  try {
    const all = getAllPools();
    all[matchId] = players;
    localStorage.setItem(POOL_KEY, JSON.stringify(all));
  } catch {}
}

export function getPlayerPool(matchId: string): any[] {
  if (typeof window === "undefined") return [];
  try {
    const all = getAllPools();
    return all[matchId] || [];
  } catch {
    return [];
  }
}

function getAllPools(): Record<string, any[]> {
  try {
    return JSON.parse(localStorage.getItem(POOL_KEY) || "{}");
  } catch {
    return {};
  }
}
