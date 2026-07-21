// ============================================================================
// SMART GENERATOR — Smart-only algorithm
// ----------------------------------------------------------------------------
// Mode isolation: this generator is used ONLY when type === "smart".
// It does NOT fall back to Grand or Advanced logic. It does NOT mix algorithms.
//
// Strategy:
//   - Rank players by composite score (safe + form + ceiling)
//   - For each team, pick top-K per role with rank rotation for diversity
//   - Enforce team balance (max 7 per side)
//   - Rotate C/VC across teams deterministically (no repeated pairs)
//   - Distribute teams across combinations derived from REAL pool composition
// ============================================================================

import type { Player } from "@/lib/players";
import type {
  Combination,
  GeneratedTeam,
  PlayerAnalysis,
} from "../types";
import type { EngineLogger } from "../logger";
import type { PitchType } from "../scoring";
import { scoreCombinations, distributeCombos } from "../scoring";
import {
  pickBalancedRole,
  selectCaptainAndVC,
  teamAnalysis,
} from "../selection";
import { makeValidationContext, validateAndFilterTeams } from "../validator";

export interface SmartOptions {
  teamCount: number;
  pitchType: PitchType;
  maxSameComboPercent: number;
  combination?: { wk: number; bat: number; ar: number; bowl: number };
  captainIds?: string[];
  viceCaptainIds?: string[];
  enforceUniqueC?: boolean;
  enforceUniqueVC?: boolean;
}

export function generateSmart(
  pool: PlayerAnalysis[],
  opts: SmartOptions,
  log: EngineLogger
): GeneratedTeam[] {
  log.info("smart.start", `Smart generator started — target ${opts.teamCount} teams`, {
    poolSize: pool.length,
    pitch: opts.pitchType,
    maxSamePct: opts.maxSameComboPercent,
  });

  // Step 1: Score combinations from REAL pool composition
  const scored = scoreCombinations(pool, opts.pitchType);
  log.info("smart.combos", "Combinations scored from real pool", {
    top3: scored.slice(0, 3).map((s) => ({
      label: s.comb.label,
      weight: Math.round(s.weight * 100) / 100,
      feasibility: Math.round(s.feasibility * 100) / 100,
    })),
  });

  // Step 2: Distribute teamCount across combos
  let comboPlan: { comb: Combination; count: number }[];
  if (opts.combination && opts.combination.wk + opts.combination.bat + opts.combination.ar + opts.combination.bowl === 11) {
    // Client sent a single combination — use only that
    const label = `${opts.combination.wk}-${opts.combination.bat}-${opts.combination.ar}-${opts.combination.bowl}`;
    comboPlan = [{ comb: { ...opts.combination, label }, count: opts.teamCount }];
    log.info("smart.combo.single", `Using single client combination: ${label}`);
  } else {
    comboPlan = distributeCombos(opts.teamCount, scored, opts.maxSameComboPercent);
    log.info("smart.combo.distributed", "Distributed teams across combinations", {
      plan: comboPlan.map((p) => `${p.comb.label}:${p.count}`).join(", "),
    });
  }

  // Step 3: Generate teams per combination with rank rotation
  const candidates: GeneratedTeam[] = [];
  let teamNum = 0;

  for (const plan of comboPlan) {
    const { wk, bat, ar, bowl } = plan.comb;
    for (let t = 0; t < plan.count; t++) {
      teamNum += 1;
      // Deterministic rotation offset: each team shifts the player selection
      // at one or more roles by `offset` ranks. This produces diverse squads
      // while still favoring top-ranked players (NO pure randomness).
      const offset = t;

      // Pick top-N per role with team-balance enforcement, then apply rotation
      // by swapping the lowest-ranked selected player at a rotating role.
      let wkP = pickBalancedRole(pool, 0, wk, "safeScore", 0, 0);
      let batP = pickBalancedRole(pool, 1, bat, "safeScore", countLeft(wkP), countRight(wkP));
      let arP = pickBalancedRole(pool, 2, ar, "ceilingScore", countLeft(wkP, batP), countRight(wkP, batP));
      let bowlP = pickBalancedRole(pool, 3, bowl, "safeScore", countLeft(wkP, batP, arP), countRight(wkP, batP, arP));

      // Apply rotation: cycle through roles to vary which role gets rotated
      // t=0 → no rotation (best squad), t=1 → rotate BOWL, t=2 → rotate AR,
      // t=3 → rotate BAT, t=4 → rotate BOWL+BAT, etc.
      if (t > 0) {
        const rotRole = (t - 1) % 4; // 0=WK, 1=BAT, 2=AR, 3=BOWL
        if (rotRole === 3) bowlP = rotateRole(pool, 3, bowl, "safeScore", offset, bowlP);
        else if (rotRole === 2) arP = rotateRole(pool, 2, ar, "ceilingScore", offset, arP);
        else if (rotRole === 1) batP = rotateRole(pool, 1, bat, "safeScore", offset, batP);
        else if (rotRole === 0 && wk > 1) wkP = rotateRole(pool, 0, wk, "safeScore", offset, wkP);

        // Additional rotation for higher team indices
        if (t >= 4) {
          bowlP = rotateRole(pool, 3, bowl, "safeScore", offset, bowlP);
        }
        if (t >= 6) {
          batP = rotateRole(pool, 1, bat, "safeScore", offset, batP);
        }
      }

      const squad = [...wkP, ...batP, ...arP, ...bowlP];
      if (squad.length !== 11) {
        log.warn("smart.squad.incomplete", `Team ${teamNum} squad has ${squad.length} players — skipping`);
        teamNum -= 1;
        continue;
      }

      // Select C/VC with rotation — use GLOBAL team index so pairs vary
      // across the whole batch (not just per-combo).
      const cvc = selectCaptainAndVC(squad, teamNum - 1, {
        captainPool: opts.captainIds,
        vcPool: opts.viceCaptainIds,
        captainStrategy: "safe",
        vcStrategy: "ceiling",
      });
      if (!cvc) {
        log.warn("smart.cvc.fail", `Team ${teamNum} could not select C/VC — skipping`);
        teamNum -= 1;
        continue;
      }

      const leftCount = squad.filter((p) => p.team === "left").length;
      const rightCount = squad.filter((p) => p.team === "right").length;
      const totalCredits = round1(squad.reduce((s, p) => s + p.credits, 0));
      const analysis = teamAnalysis(squad);

      candidates.push({
        team_number: teamNum,
        players: squad as unknown as Player[],
        captain: cvc.captain as unknown as Player,
        vicecaptain: cvc.vicecaptain as unknown as Player,
        wk: wkP.length,
        bat: batP.length,
        ar: arP.length,
        bowl: bowlP.length,
        leftCount,
        rightCount,
        totalCredits,
        combination_label: plan.comb.label,
        analysis,
      });
    }
  }

  log.info("smart.candidates", `Generated ${candidates.length} candidate teams before validation`);

  // Step 4: Validate every team — drop invalid ones (NO fake success)
  const ctx = makeValidationContext(pool as unknown as Player[], {
    enforceUniqueC: opts.enforceUniqueC,
    enforceUniqueVC: opts.enforceUniqueVC,
  });
  const { valid, report } = validateAndFilterTeams(candidates, ctx);
  log.info("smart.validation", `Validation: ${report.valid}/${report.totalGenerated} valid`, {
    dropped: report.dropped,
    dropReasons: report.dropReasons,
  });

  // Renumber teams sequentially
  valid.forEach((t, i) => (t.team_number = i + 1));
  return valid;
}

// --- helpers ---

function countLeft(...groups: PlayerAnalysis[][]): number {
  return groups.flat().filter((p) => p.team === "left").length;
}
function countRight(...groups: PlayerAnalysis[][]): number {
  return groups.flat().filter((p) => p.team === "right").length;
}

// Swap the lowest-ranked selected player at a role with the next-best unselected
function rotateRole(
  pool: PlayerAnalysis[],
  role: 0 | 1 | 2 | 3,
  count: number,
  scoreKey: keyof PlayerAnalysis,
  offset: number,
  current: PlayerAnalysis[]
): PlayerAnalysis[] {
  if (current.length < count) return current;
  const ranked = pool
    .filter((p) => p.role === role)
    .sort((a, b) => (b[scoreKey] as number) - (a[scoreKey] as number));
  const currentIds = new Set(current.map((p) => p.id));
  const alternatives = ranked.filter((p) => !currentIds.has(p.id));
  if (alternatives.length === 0) return current;

  // Drop the last (lowest-ranked) selected, add the next-best alternative
  const swapIn = alternatives[Math.min(offset, alternatives.length - 1)];
  return [...current.slice(0, count - 1), swapIn];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
