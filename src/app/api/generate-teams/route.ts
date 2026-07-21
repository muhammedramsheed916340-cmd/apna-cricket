import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMatchPlayers, type Player } from "@/lib/players";
import { fetchMatchDetail } from "@/lib/tg-api";
import { verifyLicenseKeyAsync } from "@/lib/license-verify";

export const dynamic = "force-dynamic";

// Fetch real players (with real fantasy IDs) from the original backend
async function getRealPlayers(matchId: string): Promise<Player[]> {
  try {
    const detail = await fetchMatchDetail(matchId);
    if (!detail || detail.players.length === 0) {
      return getMatchPlayers(matchId);
    }
    return detail.players.map((p, i) => ({
      id: `${p.name}-${i}`,
      name: p.name,
      role: p.role as 0 | 1 | 2 | 3,
      team: p.team === detail.team1Name ? "left" : "right",
      credits: p.credits,
      selBy: p.selectedBy,
      fantasyId: p.fantasyId,
      fantasyIdList: p.fantasyIdList,
      playing: p.playing,
    }));
  } catch {
    return getMatchPlayers(matchId);
  }
}

interface GenRequest {
  matchId: string;
  type: "smart" | "grand" | "advanced";
  teamCount: number;
  combination?: { wk: number; bat: number; ar: number; bowl: number };
  captainIds?: string[];
  viceCaptainIds?: string[];
  playerPool?: Player[];
  // NEW: diversity controls
  diversity?: boolean; // if true, auto-distribute across multiple combinations
  pitchType?: "batting" | "bowling" | "spin" | "balanced" | "auto";
  maxSameComboPercent?: number; // default 30
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
  combination_label: string;
}

// ====== All 9 valid combinations (WK-BAT-AR-BOWL) ======
const ALL_COMBINATIONS = [
  { wk: 1, bat: 3, ar: 3, bowl: 4, label: "1-3-3-4" },
  { wk: 1, bat: 3, ar: 4, bowl: 3, label: "1-3-4-3" },
  { wk: 1, bat: 4, ar: 2, bowl: 4, label: "1-4-2-4" },
  { wk: 1, bat: 4, ar: 3, bowl: 3, label: "1-4-3-3" },
  { wk: 1, bat: 5, ar: 2, bowl: 3, label: "1-5-2-3" },
  { wk: 1, bat: 3, ar: 2, bowl: 5, label: "1-3-2-5" },
  { wk: 2, bat: 3, ar: 2, bowl: 4, label: "2-3-2-4" },
  { wk: 2, bat: 4, ar: 2, bowl: 3, label: "2-4-2-3" },
  { wk: 2, bat: 3, ar: 3, bowl: 3, label: "2-3-3-3" },
];

// ====== AI pitch analysis → weighted combination preference ======
// Returns combinations sorted by probability for the given pitch type
function getWeightedCombinations(pitchType: string): { comb: typeof ALL_COMBINATIONS[0]; weight: number }[] {
  // Weights per pitch type (higher = more preferred)
  // Spin-friendly: extra AR/spinners → more AR
  // Batting-friendly: extra batters → more BAT
  // Bowling-friendly: extra bowlers → more BOWL
  // Balanced: even spread
  const weights: Record<string, Record<string, number>> = {
    batting: {
      "1-4-3-3": 10, "1-5-2-3": 9, "1-4-2-4": 8, "2-4-2-3": 7,
      "1-3-4-3": 6, "1-3-3-4": 5, "2-3-3-3": 5, "1-3-2-5": 3, "2-3-2-4": 3,
    },
    bowling: {
      "1-3-3-4": 10, "1-3-2-5": 9, "1-4-2-4": 8, "2-3-2-4": 7,
      "1-4-3-3": 6, "1-3-4-3": 5, "2-3-3-3": 5, "1-5-2-3": 3, "2-4-2-3": 3,
    },
    spin: {
      "1-3-4-3": 10, "1-4-3-3": 9, "2-3-3-3": 8, "1-3-3-4": 7,
      "1-4-2-4": 6, "2-4-2-3": 5, "1-5-2-3": 4, "1-3-2-5": 3, "2-3-2-4": 3,
    },
    balanced: {
      "1-4-3-3": 9, "1-3-4-3": 9, "1-3-3-4": 8, "1-4-2-4": 8,
      "2-3-3-3": 7, "2-4-2-3": 6, "1-5-2-3": 6, "2-3-2-4": 5, "1-3-2-5": 5,
    },
    auto: {
      "1-4-3-3": 8, "1-3-4-3": 8, "1-3-3-4": 7, "1-4-2-4": 7,
      "2-3-3-3": 6, "1-5-2-3": 6, "2-4-2-3": 5, "2-3-2-4": 5, "1-3-2-5": 4,
    },
  };
  const table = weights[pitchType] || weights.auto;
  return ALL_COMBINATIONS.map((comb) => ({
    comb,
    weight: table[comb.label] || 5,
  })).sort((a, b) => b.weight - a.weight);
}

// ====== Distribute teamCount across combinations (max 30% per combo) ======
function distributeCombos(
  teamCount: number,
  pitchType: string,
  maxSamePercent: number
): { comb: typeof ALL_COMBINATIONS[0]; count: number }[] {
  const weighted = getWeightedCombinations(pitchType);
  const maxPerCombo = Math.max(1, Math.ceil((teamCount * maxSamePercent) / 100));

  // Build a distribution: assign teams to combos by weight, respecting maxPerCombo
  const distribution: { comb: typeof ALL_COMBINATIONS[0]; count: number }[] = weighted.map((w) => ({
    comb: w.comb,
    count: 0,
  }));

  let remaining = teamCount;
  let pass = 0;
  while (remaining > 0 && pass < 20) {
    let assigned = false;
    for (let i = 0; i < distribution.length && remaining > 0; i++) {
      if (distribution[i].count < maxPerCombo) {
        // Assign proportionally to weight; at least 1 if weight is high
        const w = weighted[i].weight;
        if (w >= 5 || pass === 0) {
          distribution[i].count += 1;
          remaining -= 1;
          assigned = true;
          if (distribution[i].count >= maxPerCombo) continue;
        }
      }
    }
    if (!assigned) break;
    pass++;
  }

  // Filter out combos with 0 teams
  return distribution.filter((d) => d.count > 0);
}

function pickByRole(players: Player[], role: number, count: number, teamBias: "left" | "right" | "balanced"): Player[] {
  const pool = players.filter((p) => p.role === role);
  // Sort by selBy (popularity) but pick with weighted randomness for diversity
  const sorted = [...pool].sort((a, b) => b.selBy - a.selBy);
  const picked: Player[] = [];
  const leftPool = sorted.filter((p) => p.team === "left");
  const rightPool = sorted.filter((p) => p.team === "right");
  const lCount = teamBias === "left" ? Math.ceil(count * 0.6) : teamBias === "right" ? Math.floor(count * 0.4) : Math.floor(count / 2);
  const rCount = count - lCount;

  // Weighted random pick: higher selBy = higher chance, but not guaranteed
  const weightedPick = (arr: Player[], n: number): Player[] => {
    if (arr.length <= n) return [...arr];
    const result: Player[] = [];
    const available = [...arr];
    for (let i = 0; i < n && available.length > 0; i++) {
      // Pick from top 60% with randomness (ensures variety but favors popular players)
      const topRange = Math.max(1, Math.ceil(available.length * 0.6));
      const idx = Math.floor(Math.random() * Math.min(topRange, available.length));
      result.push(available[idx]);
      available.splice(idx, 1);
    }
    return result;
  };

  picked.push(...weightedPick(leftPool, lCount));
  picked.push(...weightedPick(rightPool, rCount));

  // Fill remainder with weighted random from remaining
  while (picked.length < count) {
    const remaining = sorted.filter((p) => !picked.includes(p));
    if (!remaining.length) break;
    const topRange = Math.max(1, Math.ceil(remaining.length * 0.6));
    const idx = Math.floor(Math.random() * Math.min(topRange, remaining.length));
    picked.push(remaining[idx]);
  }
  return picked.slice(0, count);
}

// ====== Unique C/VC selection (no duplicate C+VC pair across teams) ======
function pickCaptainVC(
  squad: Player[],
  existingPairs: Set<string>,
  captainIds?: string[],
  viceCaptainIds?: string[]
): { captain: Player; vicecaptain: Player } {
  const capPool = captainIds?.length
    ? squad.filter((p) => captainIds!.includes(p.id))
    : squad;
  const vcPool = viceCaptainIds?.length
    ? squad.filter((p) => viceCaptainIds!.includes(p.id))
    : squad;

  // Try to find a unique C+VC pair not in existingPairs
  const capShuffled = [...capPool].sort(() => Math.random() - 0.5);
  for (const cap of capShuffled) {
    const vcCandidates = (vcPool.length ? vcPool : squad)
      .filter((p) => p.id !== cap.id)
      .sort(() => Math.random() - 0.5);
    for (const vc of vcCandidates) {
      const key = `${cap.id}|${vc.id}`;
      if (!existingPairs.has(key)) {
        existingPairs.add(key);
        return { captain: cap, vicecaptain: vc };
      }
    }
  }
  // Fallback: just pick first available
  const captain = capShuffled[0] || squad[0];
  const vc = (vcPool.length ? vcPool : squad).filter((p) => p.id !== captain.id)[0] || squad[1];
  existingPairs.add(`${captain.id}|${vc.id}`);
  return { captain, vicecaptain: vc };
}

export async function POST(req: Request) {
  try {
    // ====== SERVER-SIDE LICENSE VERIFICATION (mandatory, async — checks Neon) ======
    const cookieStore = await cookies();
    const licenseKey = cookieStore.get("tg_license_key")?.value || "";
    const licenseCheck = await verifyLicenseKeyAsync(licenseKey);
    if (!licenseCheck.authorized) {
      return NextResponse.json(
        { status: "error", message: licenseCheck.error, code: licenseCheck.code },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as GenRequest;

    // ====== Input validation ======
    if (!body.matchId || typeof body.matchId !== "string") {
      return NextResponse.json(
        { status: "error", message: "matchId is required" },
        { status: 400 }
      );
    }
    // Validate teamCount — prevent NaN (silent 0-team response)
    const rawCount = Number(body.teamCount);
    if (!Number.isFinite(rawCount) || rawCount < 0) {
      return NextResponse.json(
        { status: "error", message: "teamCount must be a non-negative number" },
        { status: 400 }
      );
    }
    const count = Math.min(rawCount, 500);

    // ====== Player pool loading ======
    // Validate client-provided playerPool: each must have id, name, role 0-3, team, credits
    let all: Player[];
    if (body.playerPool && Array.isArray(body.playerPool) && body.playerPool.length >= 11) {
      const validPool = body.playerPool.filter(
        (p) =>
          p &&
          typeof p.id !== "undefined" &&
          typeof p.name === "string" &&
          [0, 1, 2, 3].includes(p.role as number) &&
          (p.team === "left" || p.team === "right") &&
          typeof p.credits === "number" &&
          p.credits > 0
      );
      if (validPool.length < 11) {
        return NextResponse.json(
          { status: "error", message: `playerPool has only ${validPool.length} valid players (need 11)` },
          { status: 400 }
        );
      }
      all = validPool as Player[];
    } else {
      all = await getRealPlayers(body.matchId);
    }

    // STRICT LINEUP MODE: Filter out non-playing players
    // Only apply filter when lineup data exists (playing !== null/undefined)
    const hasLineup = all.some((p: any) => p.playing === true || p.playing === false);
    if (hasLineup) {
      all = all.filter((p: any) => p.playing === true);
    }

    if (!all.length) {
      return NextResponse.json(
        { status: "error", message: "No playing XI players found for match" },
        { status: 404 }
      );
    }

    // ====== COMBINATION DIVERSITY (MANDATORY) ======
    const useDiversity = body.diversity !== false;
    const pitchType = body.pitchType || "auto";
    const maxSamePercent = body.maxSameComboPercent || 30;

    let comboPlan: { comb: typeof ALL_COMBINATIONS[0]; count: number }[] = [];

    if (useDiversity && count > 1) {
      // Distribute across multiple combinations with max 30% per combo
      comboPlan = distributeCombos(count, pitchType, maxSamePercent);
    } else if (body.combination && body.combination.wk + body.combination.bat + body.combination.ar + body.combination.bowl === 11) {
      // Single combination explicitly requested
      const label = `${body.combination.wk}-${body.combination.bat}-${body.combination.ar}-${body.combination.bowl}`;
      comboPlan = [{ comb: { ...body.combination, label }, count }];
    } else {
      // Default: auto-distribute
      comboPlan = distributeCombos(count, pitchType, maxSamePercent);
    }

    // Ensure the plan sums to count (adjust if rounding caused shortfall)
    const planTotal = comboPlan.reduce((s, c) => s + c.count, 0);
    if (planTotal < count && comboPlan.length > 0) {
      comboPlan[0].count += count - planTotal;
    }

    const teams: GeneratedTeam[] = [];
    const existingPairs = new Set<string>(); // for unique C/VC
    const biases: ("left" | "right" | "balanced")[] = ["balanced", "left", "right"];
    let teamNum = 0;

    for (const plan of comboPlan) {
      const { wk, bat, ar, bowl } = plan.comb;
      for (let t = 0; t < plan.count; t++) {
        const bias = biases[teamNum % biases.length];
        const wkP = pickByRole(all, 0, wk, bias);
        const batP = pickByRole(all, 1, bat, bias);
        const arP = pickByRole(all, 2, ar, bias);
        const bowlP = pickByRole(all, 3, bowl, bias);
        const squad = [...wkP, ...batP, ...arP, ...bowlP];

        if (squad.length < 11) continue; // skip if not enough players

        const { captain, vicecaptain } = pickCaptainVC(
          squad,
          existingPairs,
          body.captainIds,
          body.viceCaptainIds
        );

        const leftCount = squad.filter((p) => p.team === "left").length;
        const rightCount = squad.filter((p) => p.team === "right").length;
        const totalCredits = parseFloat(
          squad.reduce((s, p) => s + p.credits, 0).toFixed(1)
        );

        // ====== Credit cap validation (Dream11 = 100 max) ======
        // Skip teams that exceed 100 credits — they would be invalid for transfer
        if (totalCredits > 100) {
          continue;
        }

        // ====== Captain/VC must be in squad ======
        if (!squad.includes(captain) || !squad.includes(vicecaptain)) {
          continue;
        }

        teamNum += 1;
        teams.push({
          team_number: teamNum,
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
          combination_label: plan.comb.label,
        });
      }
    }

    // ====== Dedup: only skip EXACT duplicates (same 11 players + same C + same VC) ======
    // This allows teams with same players but different C/VC to coexist
    const seenTeams = new Set<string>();
    const uniqueTeams = teams.filter((t) => {
      const squadKey = t.players.map((p) => p.id).sort().join(",");
      const key = `${squadKey}|C:${t.captain.id}|VC:${t.vicecaptain.id}`;
      if (seenTeams.has(key)) return false;
      seenTeams.add(key);
      return true;
    });

    // Combination distribution summary
    const comboSummary: Record<string, number> = {};
    for (const t of uniqueTeams) {
      comboSummary[t.combination_label] = (comboSummary[t.combination_label] || 0) + 1;
    }

    return NextResponse.json({
      status: "success",
      type: body.type,
      matchId: body.matchId,
      count: uniqueTeams.length,
      teams: uniqueTeams,
      combinationDistribution: comboSummary,
      pitchAnalysis: pitchType,
      diversityEnabled: useDiversity,
      maxSameComboPercent: maxSamePercent,
      generatedAt: Date.now(),
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
