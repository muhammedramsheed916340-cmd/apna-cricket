// ============================================================================
// Selection Helpers — deterministic, rank-based selection (NO pure randomness)
// ----------------------------------------------------------------------------
// Every selection is driven by REAL analyzer scores. Variance across teams
// is achieved through RANK ROTATION (pick #1, then #2, etc.) and bounded
// substitution — never through Math.random() blind shuffling.
// ============================================================================

import type { PlayerAnalysis, RoleCode } from "./types";
import { rankBy } from "./analyzer";

// Pick the top-N players for a role from the pool, with an optional offset
// for rotation (offset=0 → top N, offset=1 → skip #1 and take next N, etc.)
export function pickTopN(
  pool: PlayerAnalysis[],
  role: RoleCode,
  count: number,
  scoreKey: keyof PlayerAnalysis,
  offset = 0
): PlayerAnalysis[] {
  const ranked = rankBy(pool, role, scoreKey);
  const start = Math.min(offset, Math.max(0, ranked.length - count));
  return ranked.slice(start, start + count);
}

// Pick with team-balance bias: ensure left/right split is within [4,7].
// Uses deterministic selection: top-K by score, then adjusts if imbalance.
export function pickBalancedRole(
  pool: PlayerAnalysis[],
  role: RoleCode,
  count: number,
  scoreKey: keyof PlayerAnalysis,
  currentLeft: number,
  currentRight: number
): PlayerAnalysis[] {
  const ranked = rankBy(pool, role, scoreKey);
  if (ranked.length <= count) return [...ranked];

  const selected: PlayerAnalysis[] = [];
  let left = currentLeft;
  let right = currentRight;

  for (const p of ranked) {
    if (selected.length >= count) break;
    // Enforce team cap of 7 per side (Dream11 rule)
    if (p.team === "left" && left >= 7) continue;
    if (p.team === "right" && right >= 7) continue;
    selected.push(p);
    if (p.team === "left") left += 1;
    else right += 1;
  }

  // If we couldn't fill (e.g. team cap blocked too many), relax and fill
  if (selected.length < count) {
    for (const p of ranked) {
      if (selected.length >= count) break;
      if (selected.find((s) => s.id === p.id)) continue;
      selected.push(p);
    }
  }

  return selected.slice(0, count);
}

// Pick with a forced number of differential players (low selBy).
// Used by Grand League generator. `offset` rotates WHICH differentials are
// picked so each team gets a different differential (squad diversity).
export function pickWithDifferentials(
  pool: PlayerAnalysis[],
  role: RoleCode,
  count: number,
  differentialCount: number,
  offset = 0
): PlayerAnalysis[] {
  const byDifferential = rankBy(pool, role, "differentialScore");
  const bySafe = rankBy(pool, role, "safeScore");

  const selected: PlayerAnalysis[] = [];
  const selectedIds = new Set<string>();

  // Step 1: take top differentials — rotate by offset so each team gets
  // a DIFFERENT differential player (squad diversity).
  let diffTaken = 0;
  for (let i = 0; i < byDifferential.length && diffTaken < differentialCount; i++) {
    const idx = (i + offset) % byDifferential.length;
    const p = byDifferential[idx];
    if (selectedIds.has(p.id)) continue;
    selected.push(p);
    selectedIds.add(p.id);
    diffTaken += 1;
  }

  // Step 2: fill remaining with safe picks (skip already-selected)
  for (const p of bySafe) {
    if (selected.length >= count) break;
    if (selectedIds.has(p.id)) continue;
    selected.push(p);
    selectedIds.add(p.id);
  }

  // Step 3: if still short, fill from any remaining
  if (selected.length < count) {
    for (const p of byDifferential) {
      if (selected.length >= count) break;
      if (selectedIds.has(p.id)) continue;
      selected.push(p);
      selectedIds.add(p.id);
    }
  }

  return selected.slice(0, count);
}

// Select captain & vice-captain deterministically by score, rotating
// across teams for diversity. `teamIndex` controls which pair to pick.
export function selectCaptainAndVC(
  squad: PlayerAnalysis[],
  teamIndex: number,
  options: {
    captainPool?: string[]; // restrict C to these IDs (captain mode)
    vcPool?: string[]; // restrict VC to these IDs (vicecaptain mode)
    scoreKey?: keyof PlayerAnalysis; // default safeScore
    captainStrategy?: "safe" | "ceiling" | "differential";
    vcStrategy?: "safe" | "ceiling" | "differential";
  } = {}
): { captain: PlayerAnalysis; vicecaptain: PlayerAnalysis } | null {
  if (squad.length < 2) return null;

  const capKey =
    options.captainStrategy === "ceiling"
      ? "ceilingScore"
      : options.captainStrategy === "differential"
      ? "differentialScore"
      : options.scoreKey || "safeScore";
  const vcKey =
    options.vcStrategy === "ceiling"
      ? "ceilingScore"
      : options.vcStrategy === "differential"
      ? "differentialScore"
      : options.scoreKey || "safeScore";

  // Build candidate lists
  let capCandidates = squad.filter((p) =>
    options.captainPool ? options.captainPool.includes(p.id) : true
  );
  let vcCandidates = squad.filter((p) =>
    options.vcPool ? options.vcPool.includes(p.id) : true
  );

  // If a pool was specified but produced no candidates, fall back to full squad
  if (capCandidates.length === 0) capCandidates = [...squad];
  if (vcCandidates.length === 0) vcCandidates = [...squad];

  // Sort by chosen score, descending
  capCandidates.sort((a, b) => (b[capKey] as number) - (a[capKey] as number));
  vcCandidates.sort((a, b) => (b[vcKey] as number) - (a[vcKey] as number));

  // Deterministic rotation: cycle through (cap, vc) pairs so each team
  // gets a DIFFERENT pair. Cap advances by 1 per team; VC advances by 1
  // per team but offset by 1 (so cap and vc never collide on the same
  // player, and pairs rarely repeat).
  const capLen = capCandidates.length;
  const vcLen = vcCandidates.length;
  const capIdx = teamIndex % capLen;
  // VC offset = capIdx + 1 (modulo vcLen) so VC != cap; advance further
  // for higher team indices to maximize pair diversity.
  const vcIdx = (capIdx + 1 + Math.floor(teamIndex / capLen)) % vcLen;
  const captain = capCandidates[capIdx];
  let vicecaptain = vcCandidates[vcIdx];

  // If VC collided with cap (possible if vcLen < 2), advance to next
  let attempts = 0;
  while (vicecaptain.id === captain.id && attempts < vcLen) {
    const next = (vcIdx + 1 + attempts) % vcLen;
    vicecaptain = vcCandidates[next];
    attempts += 1;
  }
  if (vicecaptain.id === captain.id) return null;

  return { captain, vicecaptain };
}

// Compute team-level aggregate analysis (for the response metadata)
export function teamAnalysis(squad: PlayerAnalysis[]) {
  const n = squad.length || 1;
  const sum = (key: keyof PlayerAnalysis) =>
    squad.reduce((s, p) => s + (p[key] as number), 0);
  const teamSafeScore = Math.round(sum("safeScore") / n);
  const teamCeilingScore = Math.round(sum("ceilingScore") / n);
  const teamDifferentialScore = Math.round(sum("differentialScore") / n);
  const ownershipUsed = Math.round(squad.reduce((s, p) => s + p.selBy, 0) / n);
  const riskLevel: "low" | "medium" | "high" =
    ownershipUsed >= 60 ? "low" : ownershipUsed >= 35 ? "medium" : "high";
  return { teamSafeScore, teamCeilingScore, teamDifferentialScore, ownershipUsed, riskLevel };
}
