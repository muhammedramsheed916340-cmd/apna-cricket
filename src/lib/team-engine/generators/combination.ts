// ============================================================================
// COMBINATION GENERATOR — Combination-only algorithm
// ----------------------------------------------------------------------------
// Mode isolation: used ONLY when type === "combination".
// The client provides one or more combinations (e.g. 1-4-3-3, 1-3-4-3).
// This generator:
//   - Distributes teams across ONLY the client-selected combinations
//     (NO auto-distribution to other combos)
//   - For each team, picks players per role counts using balanced selection
//   - Rotates C/VC deterministically
// ============================================================================

import type { Player } from "@/lib/players";
import type {
  Combination,
  GeneratedTeam,
  PlayerAnalysis,
} from "../types";
import type { EngineLogger } from "../logger";
import { pickBalancedRole, selectCaptainAndVC, teamAnalysis } from "../selection";
import { makeValidationContext, validateAndFilterTeams } from "../validator";

export interface CombinationOptions {
  teamCount: number;
  combinations: Combination[]; // REQUIRED — client-selected combos
  maxSameComboPercent: number;
  captainIds?: string[];
  viceCaptainIds?: string[];
}

export function generateCombination(
  pool: PlayerAnalysis[],
  opts: CombinationOptions,
  log: EngineLogger
): GeneratedTeam[] {
  log.info("combo.start", `Combination generator started — target ${opts.teamCount} teams`, {
    poolSize: pool.length,
    clientCombos: opts.combinations.map((c) => c.label),
  });

  if (!opts.combinations || opts.combinations.length === 0) {
    log.error("combo.empty", "At least one combination required");
    return [];
  }

  // Validate each combination sums to 11
  const validCombos: Combination[] = [];
  for (const c of opts.combinations) {
    const sum = c.wk + c.bat + c.ar + c.bowl;
    if (sum !== 11) {
      log.warn("combo.invalid", `${c.label} sums to ${sum}, not 11 — skipping`);
      continue;
    }
    validCombos.push(c);
  }
  if (validCombos.length === 0) {
    log.error("combo.none.valid", "No valid combinations provided");
    return [];
  }

  // Distribute teamCount across the client combos (round-robin, respecting max%)
  const maxPerCombo = Math.max(1, Math.ceil((opts.teamCount * opts.maxSameComboPercent) / 100));
  const allocation = validCombos.map((c) => ({ comb: c, count: 0 }));
  let remaining = opts.teamCount;
  while (remaining > 0) {
    let allocated = false;
    for (const a of allocation) {
      if (remaining <= 0) break;
      if (a.count < maxPerCombo) {
        a.count += 1;
        remaining -= 1;
        allocated = true;
      }
    }
    if (!allocated) {
      // Overflow into first combo
      allocation[0].count += remaining;
      remaining = 0;
    }
  }
  log.info("combo.distributed", "Distribution across client combos", {
    plan: allocation.map((a) => `${a.comb.label}:${a.count}`).join(", "),
  });

  const candidates: GeneratedTeam[] = [];
  let teamNum = 0;

  for (const plan of allocation) {
    if (plan.count === 0) continue;
    const { wk, bat, ar, bowl } = plan.comb;
    for (let t = 0; t < plan.count; t++) {
      teamNum += 1;

      const wkP = pickBalancedRole(pool, 0, wk, "safeScore", 0, 0);
      const l1 = wkP.filter((p) => p.team === "left").length;
      const r1 = wkP.filter((p) => p.team === "right").length;
      const batP = pickBalancedRole(pool, 1, bat, "safeScore", l1, r1);
      const l2 = l1 + batP.filter((p) => p.team === "left").length;
      const r2 = r1 + batP.filter((p) => p.team === "right").length;
      const arP = pickBalancedRole(pool, 2, ar, "ceilingScore", l2, r2);
      const l3 = l2 + arP.filter((p) => p.team === "left").length;
      const r3 = r2 + arP.filter((p) => p.team === "right").length;
      const bowlP = pickBalancedRole(pool, 3, bowl, "safeScore", l3, r3);

      const squad = [...wkP, ...batP, ...arP, ...bowlP];
      if (squad.length !== 11) {
        log.warn("combo.squad.incomplete", `Team ${teamNum} incomplete — skipping`);
        teamNum -= 1;
        continue;
      }

      const cvc = selectCaptainAndVC(squad, teamNum - 1, {
        captainPool: opts.captainIds,
        vcPool: opts.viceCaptainIds,
        captainStrategy: "safe",
        vcStrategy: "ceiling",
      });
      if (!cvc) {
        log.warn("combo.cvc.fail", `Team ${teamNum} C/VC failed — skipping`);
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

  log.info("combo.candidates", `${candidates.length} candidates before validation`);

  const ctx = makeValidationContext(pool as unknown as Player[]);
  const { valid, report } = validateAndFilterTeams(candidates, ctx);
  log.info("combo.validation", `Validation: ${report.valid}/${report.totalGenerated} valid`, {
    dropped: report.dropped,
    dropReasons: report.dropReasons,
  });

  valid.forEach((t, i) => (t.team_number = i + 1));
  return valid;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
