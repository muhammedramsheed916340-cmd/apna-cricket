// ============================================================================
// SECTION GENERATOR — Section-only algorithm
// ----------------------------------------------------------------------------
// Mode isolation: used ONLY when type === "section".
// The client provides the EXACT 11 players (the Section page is a manual
// pick screen). This generator:
//   - Validates the pool has exactly 11 players
//   - Derives the role combination from the actual 11 (no client combination needed)
//   - Selects C/VC deterministically from analyzer scores
//   - Produces N teams by rotating C/VC pairs across the 11 players
// ============================================================================

import type { Player } from "@/lib/players";
import type { GeneratedTeam, PlayerAnalysis } from "../types";
import type { EngineLogger } from "../logger";
import { selectCaptainAndVC, teamAnalysis } from "../selection";
import { makeValidationContext, validateAndFilterTeams } from "../validator";
import { combLabel } from "../types";

export interface SectionOptions {
  teamCount: number;
  captainIds?: string[];
  viceCaptainIds?: string[];
}

export function generateSection(
  pool: PlayerAnalysis[],
  opts: SectionOptions,
  log: EngineLogger
): GeneratedTeam[] {
  log.info("section.start", `Section generator started — pool ${pool.length}, target ${opts.teamCount} teams`);

  if (pool.length !== 11) {
    log.error("section.pool.invalid", `Section mode requires exactly 11 players, got ${pool.length}`);
    return [];
  }

  // Derive combination from actual pool
  const wk = pool.filter((p) => p.role === 0).length;
  const bat = pool.filter((p) => p.role === 1).length;
  const ar = pool.filter((p) => p.role === 2).length;
  const bowl = pool.filter((p) => p.role === 3).length;
  const label = combLabel({ wk, bat, ar, bowl });
  log.info("section.combo", `Derived combination: ${label}`, { wk, bat, ar, bowl });

  if (wk + bat + ar + bowl !== 11) {
    log.error("section.combo.invalid", "Role counts do not sum to 11");
    return [];
  }
  if (wk < 1 || bat < 1 || ar < 1 || bowl < 1) {
    log.error("section.combo.invalid", "Each role must have at least 1 player");
    return [];
  }

  // Generate teams by rotating C/VC pairs across the squad
  const candidates: GeneratedTeam[] = [];
  for (let t = 0; t < opts.teamCount; t++) {
    const cvc = selectCaptainAndVC(pool, t, {
      captainPool: opts.captainIds,
      vcPool: opts.viceCaptainIds,
      captainStrategy: "safe",
      vcStrategy: "ceiling",
    });
    if (!cvc) {
      log.warn("section.cvc.fail", `Team ${t + 1} C/VC failed — skipping`);
      continue;
    }
    const leftCount = pool.filter((p) => p.team === "left").length;
    const rightCount = pool.filter((p) => p.team === "right").length;
    const totalCredits = round1(pool.reduce((s, p) => s + p.credits, 0));
    const analysis = teamAnalysis(pool);

    candidates.push({
      team_number: t + 1,
      players: pool as unknown as Player[],
      captain: cvc.captain as unknown as Player,
      vicecaptain: cvc.vicecaptain as unknown as Player,
      wk,
      bat,
      ar,
      bowl,
      leftCount,
      rightCount,
      totalCredits,
      combination_label: label,
      analysis,
    });
  }

  log.info("section.candidates", `${candidates.length} candidates before validation`);

  const ctx = makeValidationContext(pool as unknown as Player[]);
  const { valid, report } = validateAndFilterTeams(candidates, ctx);
  log.info("section.validation", `Validation: ${report.valid}/${report.totalGenerated} valid`, {
    dropped: report.dropped,
    dropReasons: report.dropReasons,
  });

  valid.forEach((t, i) => (t.team_number = i + 1));
  return valid;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
