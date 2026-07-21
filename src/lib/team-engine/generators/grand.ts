// ============================================================================
// GRAND LEAGUE GENERATOR — Grand-League-only algorithm
// ----------------------------------------------------------------------------
// Mode isolation: used ONLY when type === "grand".
// Does NOT borrow from Smart/Advanced. Strategy:
//   - Force 2-3 differential picks per team (low ownership + value)
//   - Maximize unique C/VC pairs across teams (rotate aggressively)
//   - Prefer high-ceiling players (AR/BAT) for captaincy
//   - More aggressive rank rotation for team diversity
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
import { pickWithDifferentials, selectCaptainAndVC, teamAnalysis } from "../selection";
import { makeValidationContext, validateAndFilterTeams } from "../validator";

export interface GrandOptions {
  teamCount: number;
  pitchType: PitchType;
  maxSameComboPercent: number;
  glTarget?: "rank1" | "top10" | "top100" | "max-unique" | "max-ceiling" | "low-owner";
}

export function generateGrand(
  pool: PlayerAnalysis[],
  opts: GrandOptions,
  log: EngineLogger
): GeneratedTeam[] {
  log.info("grand.start", `Grand generator started — target ${opts.teamCount} teams`, {
    poolSize: pool.length,
    pitch: opts.pitchType,
    glTarget: opts.glTarget || "rank1",
  });

  const scored = scoreCombinations(pool, opts.pitchType);
  const comboPlan = distributeCombos(opts.teamCount, scored, opts.maxSameComboPercent);
  log.info("grand.combos", "Combo plan", {
    plan: comboPlan.map((p) => `${p.comb.label}:${p.count}`).join(", "),
  });

  // Grand league strategy:
  //   - 2 differential picks forced in AR and BOWL roles (where low-ownership
  //     differentials most often decide GL rank)
  //   - Captain rotated across top ceiling players
  //   - VC rotated across differential + ceiling mix
  const candidates: GeneratedTeam[] = [];
  let teamNum = 0;

  for (const plan of comboPlan) {
    const { wk, bat, ar, bowl } = plan.comb;
    for (let t = 0; t < plan.count; t++) {
      teamNum += 1;

      // Force differentials: AR & BOWL get 1 differential each (when role count >= 3)
      // Rotate the differential picks across teams so each team gets a DIFFERENT
      // differential player (squad diversity).
      const arDiffs = ar >= 3 ? 1 : 0;
      const bowlDiffs = bowl >= 3 ? 1 : 0;
      const batDiffs = bat >= 4 ? 1 : 0; // optional bat differential

      const wkP = pickTopSafe(pool, 0, wk);
      const batP = pickWithDifferentials(pool, 1, bat, batDiffs, t);
      const arP = pickWithDifferentials(pool, 2, ar, arDiffs, t);
      const bowlP = pickWithDifferentials(pool, 3, bowl, bowlDiffs, t);

      const squad = [...wkP, ...batP, ...arP, ...bowlP];
      if (squad.length !== 11) {
        log.warn("grand.squad.incomplete", `Team ${teamNum} incomplete — skipping`);
        teamNum -= 1;
        continue;
      }

      // GL C/VC: rotate aggressively, prefer ceiling
      const capStrategy = opts.glTarget === "low-owner" ? "differential" : "ceiling";
      const vcStrategy = opts.glTarget === "max-ceiling" ? "ceiling" : "safe";
      const cvc = selectCaptainAndVC(squad, (teamNum - 1) * 2, {
        captainStrategy: capStrategy as "ceiling" | "differential",
        vcStrategy: vcStrategy as "safe" | "ceiling",
      });
      if (!cvc) {
        log.warn("grand.cvc.fail", `Team ${teamNum} C/VC selection failed — skipping`);
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

  log.info("grand.candidates", `${candidates.length} candidates before validation`);

  // Validate — Grand league enforces unique C/VC pairs by default
  const ctx = makeValidationContext(pool as unknown as Player[], {
    enforceUniqueC: false,
    enforceUniqueVC: false,
  });
  const { valid, report } = validateAndFilterTeams(candidates, ctx);
  log.info("grand.validation", `Validation: ${report.valid}/${report.totalGenerated} valid`, {
    dropped: report.dropped,
    dropReasons: report.dropReasons,
  });

  valid.forEach((t, i) => (t.team_number = i + 1));
  return valid;
}

function pickTopSafe(pool: PlayerAnalysis[], role: 0 | 1 | 2 | 3, count: number): PlayerAnalysis[] {
  return pool
    .filter((p) => p.role === role)
    .sort((a, b) => b.safeScore - a.safeScore)
    .slice(0, count);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
