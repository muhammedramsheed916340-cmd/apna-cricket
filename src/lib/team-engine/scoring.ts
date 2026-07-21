// ============================================================================
// Combination Selector — derives combo weights from REAL pool composition
// ----------------------------------------------------------------------------
// OLD approach (REMOVED): hardcoded weight tables per pitch type.
// NEW approach: weight each of the 9 combos by how FEASIBLE it is given
//   the REAL available players per role + the requested pitch bias.
//
// If the pool has only 3 WKs, 2-WK combos get heavily down-weighted.
// If the pool is AR-heavy, AR-heavy combos get boosted.
// Pitch type acts as a small additional bias on top — NOT a guess about
//   who is a spinner vs pacer (we don't have that data).
// ============================================================================

import type { Combination, PlayerAnalysis, RoleCode } from "./types";
import { ALL_COMBINATIONS } from "./types";

export type PitchType = "batting" | "bowling" | "spin" | "balanced" | "auto";

interface PoolComposition {
  wk: number;
  bat: number;
  ar: number;
  bowl: number;
  left: number;
  right: number;
}

function compositionOf(pool: PlayerAnalysis[]): PoolComposition {
  const c: PoolComposition = { wk: 0, bat: 0, ar: 0, bowl: 0, left: 0, right: 0 };
  for (const p of pool) {
    if (p.role === 0) c.wk += 1;
    else if (p.role === 1) c.bat += 1;
    else if (p.role === 2) c.ar += 1;
    else if (p.role === 3) c.bowl += 1;
    if (p.team === "left") c.left += 1;
    else c.right += 1;
  }
  return c;
}

// Feasibility: can we actually fill this combo from the pool?
function feasibilityScore(comb: Combination, comp: PoolComposition): number {
  // Need at least `n` players per role (with 1 buffer for diversity swaps)
  const wkOk = comb.wk <= comp.wk ? 1 : 0.1;
  const batOk = comb.bat <= comp.bat ? 1 : 0.3;
  const arOk = comb.ar <= comp.ar ? 1 : 0.3;
  const bowlOk = comb.bowl <= comp.bowl ? 1 : 0.3;
  return wkOk * batOk * arOk * bowlOk;
}

// Pitch bias: small multiplicative weight per pitch type (NOT a guess about
// individual player bowling types — just role-count preference).
function pitchBias(comb: Combination, pitch: PitchType): number {
  switch (pitch) {
    case "batting":
      // Prefer extra batters
      return 1 + (comb.bat >= 4 ? 0.15 : 0) + (comb.bat >= 5 ? 0.1 : 0);
    case "bowling":
      // Prefer extra bowlers
      return 1 + (comb.bowl >= 4 ? 0.15 : 0) + (comb.bowl >= 5 ? 0.1 : 0);
    case "spin":
      // Prefer extra all-rounders (spinners usually classified as AR in fantasy)
      return 1 + (comb.ar >= 3 ? 0.15 : 0) + (comb.ar >= 4 ? 0.1 : 0);
    case "balanced":
    case "auto":
    default:
      // Prefer balanced combos
      return 1 + (comb.bat === 4 && comb.bowl === 3 ? 0.1 : 0);
  }
}

export interface ScoredCombination {
  comb: Combination;
  weight: number; // 0-1 normalized
  feasibility: number;
  pitchBoost: number;
}

export function scoreCombinations(
  pool: PlayerAnalysis[],
  pitch: PitchType
): ScoredCombination[] {
  const comp = compositionOf(pool);
  const scored = ALL_COMBINATIONS.map((comb) => {
    const feasibility = feasibilityScore(comb, comp);
    const pitchBoost = pitchBias(comb, pitch);
    const weight = feasibility * pitchBoost;
    return { comb, weight, feasibility, pitchBoost };
  });

  // Normalize weights to 0-1 (max = 1)
  const maxW = Math.max(...scored.map((s) => s.weight), 0.0001);
  return scored
    .map((s) => ({ ...s, weight: s.weight / maxW }))
    .sort((a, b) => b.weight - a.weight);
}

// Distribute teamCount across combinations with a max-per-combo cap.
// This is DETERMINISTIC — no randomness. Teams are allocated by weight
// priority, filling the top combo first up to its cap, then the next, etc.
export function distributeCombos(
  teamCount: number,
  scored: ScoredCombination[],
  maxSamePercent: number,
  allowedCombos?: Combination[] // if provided, restrict to these (combination mode)
): { comb: Combination; count: number }[] {
  // Filter to feasible combos (weight > 0.05) AND allowed list (if given)
  let eligible = scored.filter((s) => s.weight > 0.05 && s.feasibility >= 1);
  if (allowedCombos && allowedCombos.length > 0) {
    const allowedLabels = new Set(allowedCombos.map((c) => c.label));
    eligible = eligible.filter((s) => allowedLabels.has(s.comb.label));
  }
  if (eligible.length === 0) {
    // Fallback: use allowed combos directly even if feasibility is borderline
    if (allowedCombos && allowedCombos.length > 0) {
      eligible = allowedCombos.map((c) => ({
        comb: c,
        weight: 1,
        feasibility: 1,
        pitchBoost: 1,
      }));
    } else {
      eligible = scored.slice(0, 3).map((s) => ({ ...s, weight: 1 }));
    }
  }

  const maxPerCombo = Math.max(1, Math.ceil((teamCount * maxSamePercent) / 100));

  const allocation: { comb: Combination; count: number }[] = eligible.map((s) => ({
    comb: s.comb,
    count: 0,
  }));

  let remaining = teamCount;
  // Round-robin fill: each pass, give 1 team to the top combo under its cap,
  // proportional to weight. Repeat until all teams allocated or no slot left.
  let pass = 0;
  while (remaining > 0 && pass < 50) {
    let allocated = false;
    for (let i = 0; i < allocation.length && remaining > 0; i++) {
      if (allocation[i].count < maxPerCombo) {
        allocation[i].count += 1;
        remaining -= 1;
        allocated = true;
      }
    }
    if (!allocated) break;
    pass += 1;
  }

  // If still remaining (e.g. only 1 combo and cap reached), overflow into
  // the top combo(s) — better to return requested count than under-deliver.
  if (remaining > 0) {
    for (let i = 0; i < allocation.length && remaining > 0; i++) {
      allocation[i].count += remaining;
      remaining = 0;
    }
  }

  return allocation.filter((a) => a.count > 0);
}
