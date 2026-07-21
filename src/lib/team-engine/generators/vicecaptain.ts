// ============================================================================
// VICE CAPTAIN OPTIMIZER GENERATOR — Vice-Captain-only algorithm
// ----------------------------------------------------------------------------
// Mode isolation: used ONLY when type === "vicecaptain".
// The client provides a list of viceCaptainIds. This generator:
//   - Builds teams from the FULL analyzed pool
//   - Rotates VC strictly across the provided viceCaptainIds
//   - Picks C deterministically from analyzer scores (safe)
//   - Each team has a UNIQUE VC (from the provided pool)
// ============================================================================

import type { Player } from "@/lib/players";
import type {
  GeneratedTeam,
  PlayerAnalysis,
} from "../types";
import type { EngineLogger } from "../logger";
import type { PitchType } from "../scoring";
import { scoreCombinations, distributeCombos } from "../scoring";
import { pickBalancedRole, teamAnalysis } from "../selection";
import { makeValidationContext, validateAndFilterTeams } from "../validator";

export interface ViceCaptainOptions {
  teamCount: number;
  pitchType: PitchType;
  maxSameComboPercent: number;
  viceCaptainIds: string[]; // REQUIRED
}

export function generateViceCaptain(
  pool: PlayerAnalysis[],
  opts: ViceCaptainOptions,
  log: EngineLogger
): GeneratedTeam[] {
  log.info("vc.start", `Vice Captain optimizer started — target ${opts.teamCount} teams`, {
    poolSize: pool.length,
    vcPoolSize: opts.viceCaptainIds.length,
  });

  if (!opts.viceCaptainIds || opts.viceCaptainIds.length === 0) {
    log.error("vc.pool.empty", "viceCaptainIds required for vicecaptain mode");
    return [];
  }

  const validVcIds = opts.viceCaptainIds.filter((id) => pool.find((p) => p.id === id));
  if (validVcIds.length === 0) {
    log.error("vc.pool.nomatch", "None of the provided viceCaptainIds exist in the player pool");
    return [];
  }
  log.info("vc.pool", `${validVcIds.length} valid VC candidates`);

  const effectiveTeamCount = Math.min(opts.teamCount, validVcIds.length * 3);
  if (effectiveTeamCount < opts.teamCount) {
    log.warn("vc.cap", `Capping at ${effectiveTeamCount} teams (${validVcIds.length} unique VCs)`);
  }

  const scored = scoreCombinations(pool, opts.pitchType);
  const comboPlan = distributeCombos(effectiveTeamCount, scored, opts.maxSameComboPercent);

  const candidates: GeneratedTeam[] = [];
  let teamNum = 0;

  for (const plan of comboPlan) {
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
        log.warn("vc.squad.incomplete", `Team ${teamNum} incomplete — skipping`);
        teamNum -= 1;
        continue;
      }

      // Force the VC to be one specific candidate (rotating)
      const vcId = validVcIds[(teamNum - 1) % validVcIds.length];
      let forcedVC = squad.find((p) => p.id === vcId);
      if (!forcedVC) {
        const vcFromPool = pool.find((p) => p.id === vcId);
        if (!vcFromPool) {
          log.warn("vc.missing", `VC ${vcId} not found — skipping team ${teamNum}`);
          teamNum -= 1;
          continue;
        }
        // Swap: replace lowest-scored player at the same role
        const role = vcFromPool.role;
        const idx = squad
          .map((p, i) => ({ p, i }))
          .filter((x) => x.p.role === role)
          .sort((a, b) => a.p.safeScore - b.p.safeScore)[0]?.i;
        if (idx === undefined) {
          teamNum -= 1;
          continue;
        }
        squad[idx] = vcFromPool;
        forcedVC = vcFromPool;
      }

      // Pick Captain deterministically (safe), excluding VC
      const cap = squad
        .filter((p) => p.id !== forcedVC!.id)
        .sort((a, b) => b.safeScore - a.safeScore)[0];
      if (!cap) {
        log.warn("vc.cap.fail", `Team ${teamNum} C selection failed — skipping`);
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
        captain: cap as unknown as Player,
        vicecaptain: forcedVC! as unknown as Player,
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

  log.info("vc.candidates", `${candidates.length} candidates before validation`);

  const ctx = makeValidationContext(pool as unknown as Player[], { enforceUniqueVC: true });
  const { valid, report } = validateAndFilterTeams(candidates, ctx);
  log.info("vc.validation", `Validation: ${report.valid}/${report.totalGenerated} valid`, {
    dropped: report.dropped,
    dropReasons: report.dropReasons,
  });

  valid.forEach((t, i) => (t.team_number = i + 1));
  return valid;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
