// ============================================================================
// Player Analyzer
// ----------------------------------------------------------------------------
// Computes REAL analytics from API-provided fields only.
// NEVER guesses venue/weather/head-to-head/batting-order/bowling-type.
// If a signal isn't available, it's simply not used (no fabrication).
//
// Real fields used (all from /api/players → fetchMatchDetail):
//   selBy                  → ownership estimate (direct)
//   captainPercentage      → safe-pick / captaincy signal
//   viceCaptainPercentage  → safe-pick / VC signal
//   points                 → recent-form proxy
//   credits                → projected value / ceiling proxy
//   role                   → role-based ceiling weighting
//   team                   → balance constraint
//   playing                → lineup confirmation (true/false/null)
// ============================================================================

import type { Player } from "@/lib/players";
import type { PlayerAnalysis, AnalyzerReport, RoleCode } from "./types";
import { ROLE_LABELS } from "./types";

// Linear normalization to [0,100]
function norm(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const v = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, v));
}

export function analyzePlayer(p: Player): PlayerAnalysis {
  const captainPct = clampNum((p as any).captainPercentage ?? 0);
  const vcPct = clampNum((p as any).viceCaptainPercentage ?? 0);
  const points = clampNum((p as any).points ?? 0);
  const selBy = clampNum(p.selBy ?? 0);
  const credits = clampNum(p.credits ?? 0, 0, 15);

  // Safe score: high ownership + high captain/VC backing + decent form
  //   40% selBy + 25% captainPct + 15% vcPct + 20% points
  const safeScore = Math.round(
    norm(selBy, 0, 100) * 0.4 +
      norm(captainPct, 0, 60) * 0.25 +
      norm(vcPct, 0, 60) * 0.15 +
      norm(points, 0, 200) * 0.2
  );

  // Differential score: lower ownership = better differential, but must
  // still offer value (penalize fringe picks with very low credits backing)
  const ownershipInverted = 100 - norm(selBy, 0, 100);
  const valueBacking = norm(credits, 4, 12) * 0.4 + norm(points, 0, 200) * 0.3;
  const differentialScore = Math.round(ownershipInverted * 0.6 + valueBacking * 0.4);

  // Ceiling score: role-based upside + captain backing + credits
  //   AR has highest ceiling (contributes both runs & wickets),
  //   then BAT (top-order), WK (opens), BOWL (wickets only).
  const roleCeiling: Record<RoleCode, number> = {
    0: 70, // WK
    1: 85, // BAT
    2: 100, // AR
    3: 78, // BOWL
  };
  const ceilingFromRole = roleCeiling[p.role as RoleCode] ?? 70;
  const ceilingScore = Math.round(
    ceilingFromRole * 0.4 +
      norm(captainPct + vcPct, 0, 80) * 0.3 +
      norm(credits, 4, 12) * 0.3
  );

  // Form score: purely from points (recent form proxy)
  const formScore = Math.round(norm(points, 0, 200));

  // Ownership tier
  const ownershipTier: PlayerAnalysis["ownershipTier"] =
    selBy >= 60 ? "high" : selBy >= 30 ? "mid" : selBy >= 10 ? "low" : "fringe";

  return {
    ...p,
    captainPct,
    vcPct,
    points,
    safeScore,
    differentialScore,
    ceilingScore,
    formScore,
    baseRank: 0, // assigned below after sorting
    ownershipTier,
  };
}

function clampNum(v: number, min = 0, max = 1000): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(min, Math.min(max, v));
}

export interface AnalyzedPool {
  players: PlayerAnalysis[];
  report: AnalyzerReport;
}

// Assigns baseRank across the whole pool based on a composite score
export function analyzePool(rawPlayers: Player[], lineupOut: boolean): AnalyzedPool {
  const players = rawPlayers.map(analyzePlayer);

  // Composite: safe 40% + form 25% + ceiling 35% — produces overall rank
  const composite = (p: PlayerAnalysis) =>
    p.safeScore * 0.4 + p.formScore * 0.25 + p.ceilingScore * 0.35;

  const ranked = [...players].sort((a, b) => composite(b) - composite(a));
  ranked.forEach((p, i) => {
    p.baseRank = i + 1;
  });

  // Build report — derived from REAL counts only
  const byRole: Record<RoleCode, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const byTeam = { left: 0, right: 0 };
  const byTier: Record<string, number> = { high: 0, mid: 0, low: 0, fringe: 0 };

  for (const p of ranked) {
    byRole[p.role as RoleCode] += 1;
    if (p.team === "left") byTeam.left += 1;
    else byTeam.right += 1;
    byTier[p.ownershipTier] = (byTier[p.ownershipTier] || 0) + 1;
  }

  const topSafePicks = [...ranked]
    .sort((a, b) => b.safeScore - a.safeScore)
    .slice(0, 5)
    .map((p) => p.name);
  const topDifferentialPicks = [...ranked]
    .sort((a, b) => b.differentialScore - a.differentialScore)
    .slice(0, 5)
    .map((p) => p.name);
  const topCeilingPicks = [...ranked]
    .sort((a, b) => b.ceilingScore - a.ceilingScore)
    .slice(0, 5)
    .map((p) => p.name);

  const poolWarnings: string[] = [];
  if (byRole[0] < 2) poolWarnings.push(`Only ${byRole[0]} WK available — 2-WK combos disabled`);
  if (byRole[0] < 1) poolWarnings.push("No WK available — cannot form valid team");
  if (byRole[1] < 3) poolWarnings.push(`Only ${byRole[1]} BAT available — limited batting combos`);
  if (byRole[2] < 1) poolWarnings.push("No AR available — AR-heavy combos disabled");
  if (byRole[3] < 3) poolWarnings.push(`Only ${byRole[3]} BOWL available — limited bowling combos`);
  if (byTeam.left < 4) poolWarnings.push(`Only ${byTeam.left} players from Team A — balance constraint tight`);
  if (byTeam.right < 4) poolWarnings.push(`Only ${byTeam.right} players from Team B — balance constraint tight`);

  const lineupStatus: AnalyzerReport["lineupStatus"] = lineupOut
    ? "final"
    : rawPlayers.some((p) => (p as any).playing === null || (p as any).playing === undefined)
    ? "pre-lineup"
    : "unknown";

  const report: AnalyzerReport = {
    totalPlayers: ranked.length,
    playingXIConfirmed: lineupOut,
    lineupStatus,
    byRole,
    byTeam,
    byTier,
    topSafePicks,
    topDifferentialPicks,
    topCeilingPicks,
    poolWarnings,
  };

  return { players: ranked, report };
}

// Convenience: rank players within a single role by a given score
export function rankBy(
  pool: PlayerAnalysis[],
  role: RoleCode,
  scoreKey: keyof PlayerAnalysis
): PlayerAnalysis[] {
  return pool
    .filter((p) => p.role === role)
    .sort((a, b) => (b[scoreKey] as number) - (a[scoreKey] as number));
}

// Role label helper for logs
export function roleLabel(role: RoleCode): string {
  return ROLE_LABELS[role];
}
