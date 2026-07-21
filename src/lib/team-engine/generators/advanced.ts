// ============================================================================
// ADVANCED GENERATOR — Advanced-only algorithm
// ----------------------------------------------------------------------------
// Mode isolation: used ONLY when type === "advanced".
// Applies the client-selected filters deterministically. Filters that
// require data we don't have (bowling type, team win probability) are
// SKIPPED with a warning — NEVER guessed.
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
import { pickBalancedRole, pickWithDifferentials, selectCaptainAndVC, teamAnalysis } from "../selection";
import { makeValidationContext, validateAndFilterTeams } from "../validator";

export interface AdvancedOptions {
  teamCount: number;
  pitchType: PitchType;
  maxSameComboPercent: number;
  filters: string[]; // client-selected filter IDs
}

// Maps filter IDs to behaviors. Filters requiring unavailable data are
// marked as NO-OP with a logged warning.
const FILTER_BEHAVIOR: Record<
  string,
  | { kind: "apply"; description: string }
  | { kind: "noop"; reason: string }
> = {
  form: { kind: "apply", description: "Prefer high formScore players" },
  differential: { kind: "apply", description: "Force 2+ differential picks" },
  captain_pace: {
    kind: "noop",
    reason: "Bowling type (pace/spin) not available in API — cannot apply",
  },
  captain_spin: {
    kind: "noop",
    reason: "Bowling type (pace/spin) not available in API — cannot apply",
  },
  winning: {
    kind: "noop",
    reason: "Team win probability not available in API — cannot apply",
  },
  equal: { kind: "apply", description: "Distribute C evenly across top 8" },
  unique_c: { kind: "apply", description: "Unique captain every team" },
  unique_vc: { kind: "apply", description: "Unique VC every team" },
  credit_opt: { kind: "apply", description: "Prefer high value (low credits + high score)" },
  balance_val: { kind: "apply", description: "Enforce strict role balance" },
};

export function generateAdvanced(
  pool: PlayerAnalysis[],
  opts: AdvancedOptions,
  log: EngineLogger
): GeneratedTeam[] {
  log.info("advanced.start", `Advanced generator started — target ${opts.teamCount} teams`, {
    poolSize: pool.length,
    filters: opts.filters,
  });

  // Log filter resolution
  const appliedFilters: string[] = [];
  const skippedFilters: string[] = [];
  for (const f of opts.filters) {
    const beh = FILTER_BEHAVIOR[f];
    if (!beh) {
      log.warn("advanced.filter.unknown", `Unknown filter: ${f}`);
      continue;
    }
    if (beh.kind === "apply") {
      appliedFilters.push(f);
      log.info("advanced.filter.apply", `${f}: ${beh.description}`);
    } else {
      skippedFilters.push(f);
      log.warn("advanced.filter.skip", `${f}: ${beh.reason}`);
    }
  }

  // Score key based on filters
  const wantForm = appliedFilters.includes("form");
  const wantCreditOpt = appliedFilters.includes("credit_opt");
  const wantDifferentials = appliedFilters.includes("differential");
  const enforceUniqueC = appliedFilters.includes("unique_c");
  const enforceUniqueVC = appliedFilters.includes("unique_vc");

  // Choose primary score key
  let scoreKey: keyof PlayerAnalysis = "safeScore";
  if (wantForm) scoreKey = "formScore";

  // Combo distribution
  const scored = scoreCombinations(pool, opts.pitchType);
  const comboPlan = distributeCombos(opts.teamCount, scored, opts.maxSameComboPercent);
  log.info("advanced.combos", "Combo plan", {
    plan: comboPlan.map((p) => `${p.comb.label}:${p.count}`).join(", "),
  });

  const candidates: GeneratedTeam[] = [];
  let teamNum = 0;

  for (const plan of comboPlan) {
    const { wk, bat, ar, bowl } = plan.comb;
    for (let t = 0; t < plan.count; t++) {
      teamNum += 1;

      let wkP: PlayerAnalysis[];
      let batP: PlayerAnalysis[];
      let arP: PlayerAnalysis[];
      let bowlP: PlayerAnalysis[];

      if (wantDifferentials) {
        // Force 1 differential in BAT, AR, BOWL when role depth allows.
        // Rotate differentials across teams for squad diversity.
        wkP = pickBalancedRole(pool, 0, wk, scoreKey, 0, 0);
        batP = pickWithDifferentials(pool, 1, bat, bat >= 4 ? 1 : 0, t);
        arP = pickWithDifferentials(pool, 2, ar, ar >= 3 ? 1 : 0, t);
        bowlP = pickWithDifferentials(pool, 3, bowl, bowl >= 3 ? 1 : 0, t);
      } else {
        wkP = pickBalancedRole(pool, 0, wk, scoreKey, 0, 0);
        const l1 = wkP.filter((p) => p.team === "left").length;
        const r1 = wkP.filter((p) => p.team === "right").length;
        batP = pickBalancedRole(pool, 1, bat, scoreKey, l1, r1);
        const l2 = l1 + batP.filter((p) => p.team === "left").length;
        const r2 = r1 + batP.filter((p) => p.team === "right").length;
        arP = pickBalancedRole(pool, 2, ar, wantCreditOpt ? "ceilingScore" : scoreKey, l2, r2);
        const l3 = l2 + arP.filter((p) => p.team === "left").length;
        const r3 = r2 + arP.filter((p) => p.team === "right").length;
        bowlP = pickBalancedRole(pool, 3, bowl, scoreKey, l3, r3);
      }

      const squad = [...wkP, ...batP, ...arP, ...bowlP];
      if (squad.length !== 11) {
        log.warn("advanced.squad.incomplete", `Team ${teamNum} incomplete — skipping`);
        teamNum -= 1;
        continue;
      }

      // C/VC selection
      const cvc = selectCaptainAndVC(squad, teamNum - 1, {
        captainStrategy: wantForm ? "safe" : "ceiling",
        vcStrategy: "safe",
      });
      if (!cvc) {
        log.warn("advanced.cvc.fail", `Team ${teamNum} C/VC failed — skipping`);
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

  log.info("advanced.candidates", `${candidates.length} candidates before validation`);

  const ctx = makeValidationContext(pool as unknown as Player[], {
    enforceUniqueC,
    enforceUniqueVC,
  });
  const { valid, report } = validateAndFilterTeams(candidates, ctx);
  log.info("advanced.validation", `Validation: ${report.valid}/${report.totalGenerated} valid`, {
    dropped: report.dropped,
    dropReasons: report.dropReasons,
    skippedFilters,
  });

  valid.forEach((t, i) => (t.team_number = i + 1));
  return valid;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
