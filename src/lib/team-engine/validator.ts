// ============================================================================
// Team Validator — REAL checks, no fake success
// ----------------------------------------------------------------------------
// Every team MUST pass ALL validators. Failing teams are dropped.
// If zero teams remain after validation, the engine returns an error
// (NEVER a fake "success" with empty teams).
// ============================================================================

import type { Player } from "@/lib/players";
import type {
  GeneratedTeam,
  ValidationReport,
  Combination,
} from "./types";
import { ALL_COMBINATIONS } from "./types";

export type ValidationError =
  | "PLAYER_COUNT_NOT_11"
  | "CREDITS_EXCEED_100"
  | "CREDITS_TOO_LOW"
  | "ROLE_COUNT_MISMATCH"
  | "TEAM_CAP_EXCEEDED_7"
  | "CAPTAIN_NOT_IN_SQUAD"
  | "VC_NOT_IN_SQUAD"
  | "CAP_AND_VC_SAME"
  | "DUPLICATE_TEAM"
  | "DUPLICATE_C_VC_PAIR"
  | "PLAYER_NOT_IN_POOL"
  | "INVALID_COMBINATION";

export interface ValidationContext {
  pool: Set<string>; // valid player IDs (the analyzed pool)
  existingTeams: Set<string>; // unique squad+C+VC keys (always enforced)
  existingPairs: Set<string>; // C+VC pairs (only when enforceUniquePairs=true)
  enforceUniqueC: boolean; // never repeat C across teams
  enforceUniqueVC: boolean; // never repeat VC across teams
  enforceUniquePairs: boolean; // never repeat C+VC pair across teams (opt-in)
  seenCaptains: Set<string>;
  seenVCs: Set<string>;
  expectedCombination?: Combination | null;
}

export function makeValidationContext(
  pool: Player[],
  opts: {
    enforceUniqueC?: boolean;
    enforceUniqueVC?: boolean;
    enforceUniquePairs?: boolean;
    expectedCombination?: Combination | null;
  } = {}
): ValidationContext {
  return {
    pool: new Set(pool.map((p) => p.id)),
    existingTeams: new Set(),
    existingPairs: new Set(),
    enforceUniqueC: opts.enforceUniqueC ?? false,
    enforceUniqueVC: opts.enforceUniqueVC ?? false,
    enforceUniquePairs: opts.enforceUniquePairs ?? false,
    seenCaptains: new Set(),
    seenVCs: new Set(),
    expectedCombination: opts.expectedCombination ?? null,
  };
}

const VALID_COMBOS = new Set(ALL_COMBINATIONS.map((c) => c.label));

export interface ValidationResult {
  valid: boolean;
  reason?: ValidationError;
  teamKey?: string;
}

export function validateTeam(
  team: {
    players: Player[];
    captain: Player;
    vicecaptain: Player;
    combination_label?: string;
  },
  ctx: ValidationContext
): ValidationResult {
  // 1. Player count = 11
  if (team.players.length !== 11) {
    return { valid: false, reason: "PLAYER_COUNT_NOT_11" };
  }

  // 2. Credits ≤ 100 (Dream11 hard cap)
  const totalCredits = round1(
    team.players.reduce((s, p) => s + p.credits, 0)
  );
  if (totalCredits > 100) {
    return { valid: false, reason: "CREDITS_EXCEED_100" };
  }
  // Sanity: a real team must use a meaningful portion of the budget
  if (totalCredits < 50) {
    return { valid: false, reason: "CREDITS_TOO_LOW" };
  }

  // 3. All players must be in the pool
  for (const p of team.players) {
    if (!ctx.pool.has(p.id)) {
      return { valid: false, reason: "PLAYER_NOT_IN_POOL" };
    }
  }

  // 4. Role count must match the combination label
  const wk = team.players.filter((p) => p.role === 0).length;
  const bat = team.players.filter((p) => p.role === 1).length;
  const ar = team.players.filter((p) => p.role === 2).length;
  const bowl = team.players.filter((p) => p.role === 3).length;
  if (wk + bat + ar + bowl !== 11) {
    return { valid: false, reason: "ROLE_COUNT_MISMATCH" };
  }
  if (wk < 1 || wk > 8 || bat < 1 || bat > 8 || ar < 1 || ar > 8 || bowl < 1 || bowl > 8) {
    return { valid: false, reason: "ROLE_COUNT_MISMATCH" };
  }

  // 5. Team cap: max 7 from one side
  const leftCount = team.players.filter((p) => p.team === "left").length;
  const rightCount = team.players.filter((p) => p.team === "right").length;
  if (leftCount > 7 || rightCount > 7) {
    return { valid: false, reason: "TEAM_CAP_EXCEEDED_7" };
  }

  // 6. Captain & VC must be in squad
  const squadIds = new Set(team.players.map((p) => p.id));
  if (!squadIds.has(team.captain.id)) {
    return { valid: false, reason: "CAPTAIN_NOT_IN_SQUAD" };
  }
  if (!squadIds.has(team.vicecaptain.id)) {
    return { valid: false, reason: "VC_NOT_IN_SQUAD" };
  }

  // 7. C != VC
  if (team.captain.id === team.vicecaptain.id) {
    return { valid: false, reason: "CAP_AND_VC_SAME" };
  }

  // 8. Combination label valid
  if (team.combination_label && !VALID_COMBOS.has(team.combination_label)) {
    return { valid: false, reason: "INVALID_COMBINATION" };
  }
  if (team.combination_label) {
    const [w, b, a, o] = team.combination_label.split("-").map(Number);
    if (w !== wk || b !== bat || a !== ar || o !== bowl) {
      return { valid: false, reason: "ROLE_COUNT_MISMATCH" };
    }
  }

  // 9. Unique C/VC enforcement (if requested)
  if (ctx.enforceUniqueC && ctx.seenCaptains.has(team.captain.id)) {
    return { valid: false, reason: "DUPLICATE_TEAM" };
  }
  if (ctx.enforceUniqueVC && ctx.seenVCs.has(team.vicecaptain.id)) {
    return { valid: false, reason: "DUPLICATE_TEAM" };
  }

  // 10. Duplicate team detection (same 11 + same C + same VC)
  const squadKey = team.players
    .map((p) => p.id)
    .sort()
    .join(",");
  const teamKey = `${squadKey}|C:${team.captain.id}|VC:${team.vicecaptain.id}`;
  if (ctx.existingTeams.has(teamKey)) {
    return { valid: false, reason: "DUPLICATE_TEAM", teamKey };
  }

  // 11. Duplicate C+VC pair (ONLY when explicitly enforced — opt-in)
  const pairKey = `${team.captain.id}|${team.vicecaptain.id}`;
  if (ctx.enforceUniquePairs && ctx.existingPairs.has(pairKey)) {
    return { valid: false, reason: "DUPLICATE_C_VC_PAIR", teamKey };
  }

  // All passed — register
  ctx.existingTeams.add(teamKey);
  ctx.existingPairs.add(pairKey);
  ctx.seenCaptains.add(team.captain.id);
  ctx.seenVCs.add(team.vicecaptain.id);

  return { valid: true, teamKey };
}

// Validates a batch of candidate teams and returns only the valid ones,
// along with a structured report of what was dropped and why.
export function validateAndFilterTeams(
  candidates: GeneratedTeam[],
  ctx: ValidationContext
): { valid: GeneratedTeam[]; report: ValidationReport } {
  const valid: GeneratedTeam[] = [];
  const dropReasons: Record<string, number> = {};

  for (const team of candidates) {
    const result = validateTeam(team, ctx);
    if (result.valid) {
      valid.push(team);
    } else if (result.reason) {
      dropReasons[result.reason] = (dropReasons[result.reason] || 0) + 1;
    }
  }

  return {
    valid,
    report: {
      totalGenerated: candidates.length,
      valid: valid.length,
      dropped: candidates.length - valid.length,
      dropReasons,
    },
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
