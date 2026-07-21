// ============================================================================
// CAPTAIN OPTIMIZER GENERATOR — Captain-only algorithm
// ----------------------------------------------------------------------------
// Mode isolation: used ONLY when type === "captain".
// The client provides a list of captainIds. This generator:
//   - Builds teams from the FULL analyzed pool (not client's 11)
//   - Rotates C strictly across the provided captainIds
//   - Picks VC deterministically from analyzer scores (ceiling)
//   - Each team has a UNIQUE captain (from the provided pool)
// ============================================================================

import type { Player } from "@/lib/players";
import type {
  GeneratedTeam,
  PlayerAnalysis,
  Combination,
} from "../types";
import type { EngineLogger } from "../logger";
import type { PitchType } from "../scoring";
import { scoreCombinations, distributeCombos } from "../scoring";
import { pickBalancedRole, selectCaptainAndVC, teamAnalysis } from "../selection";
import { makeValidationContext, validateAndFilterTeams } from "../validator";

export interface CaptainOptions {
  teamCount: number;
  pitchType: PitchType;
  maxSameComboPercent: number;
  captainIds: string[]; // REQUIRED — the captain pool to rotate through
}

export function generateCaptain(
  pool: PlayerAnalysis[],
  opts: CaptainOptions,
  log: EngineLogger
): GeneratedTeam[] {
  log.info("captain.start", `Captain optimizer started — target ${opts.teamCount} teams`, {
    poolSize: pool.length,
    captainPoolSize: opts.captainIds.length,
  });

  if (!opts.captainIds || opts.captainIds.length === 0) {
    log.error("captain.pool.empty", "captainIds required for captain mode");
    return [];
  }

  // Verify captain candidates exist in the pool
  const validCaptainIds = opts.captainIds.filter((id) => pool.find((p) => p.id === id));
  if (validCaptainIds.length === 0) {
    log.error("captain.pool.nomatch", "None of the provided captainIds exist in the player pool");
    return [];
  }
  log.info("captain.pool", `${validCaptainIds.length} valid captain candidates`, {
    captains: validCaptainIds,
  });

  // Cap teams at the number of unique captains (each team gets unique C)
  const effectiveTeamCount = Math.min(opts.teamCount, validCaptainIds.length * 3);
  if (effectiveTeamCount < opts.teamCount) {
    log.warn(
      "captain.cap",
      `Requested ${opts.teamCount} teams but only ${validCaptainIds.length} unique captains — capping at ${effectiveTeamCount}`
    );
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
        log.warn("captain.squad.incomplete", `Team ${teamNum} incomplete — skipping`);
        teamNum -= 1;
        continue;
      }

      // Force the captain to be one specific candidate (rotating).
      // The captain MUST be in the final squad — swap them in if necessary.
      const capId = validCaptainIds[(teamNum - 1) % validCaptainIds.length];
      let captain = squad.find((p) => p.id === capId);
      if (!captain) {
        // The forced captain isn't in this squad — swap them in
        const capFromPool = pool.find((p) => p.id === capId);
        if (!capFromPool) {
          log.warn("captain.missing", `Captain ${capId} not found — skipping team ${teamNum}`);
          teamNum -= 1;
          continue;
        }
        // Swap: replace lowest-scored player at the same role
        const role = capFromPool.role;
        const sameRoleIdx = squad
          .map((p, i) => ({ p, i }))
          .filter((x) => x.p.role === role)
          .sort((a, b) => a.p.safeScore - b.p.safeScore)[0]?.i;
        if (sameRoleIdx === undefined) {
          log.warn("captain.swap.fail", `Cannot swap captain ${capId} into team ${teamNum} — skipping`);
          teamNum -= 1;
          continue;
        }
        squad[sameRoleIdx] = capFromPool;
        captain = capFromPool;
      }

      // Pick VC deterministically (ceiling), excluding the captain
      const vc = squad
        .filter((p) => p.id !== captain!.id)
        .sort((a, b) => b.ceilingScore - a.ceilingScore)[0];
      if (!vc) {
        log.warn("captain.vc.fail", `Team ${teamNum} VC selection failed — skipping`);
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
        captain: captain as unknown as Player,
        vicecaptain: vc as unknown as Player,
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

  log.info("captain.candidates", `${candidates.length} candidates before validation`);

  const ctx = makeValidationContext(pool as unknown as Player[], { enforceUniqueC: true });
  const { valid, report } = validateAndFilterTeams(candidates, ctx);
  log.info("captain.validation", `Validation: ${report.valid}/${report.totalGenerated} valid`, {
    dropped: report.dropped,
    dropReasons: report.dropReasons,
  });

  valid.forEach((t, i) => (t.team_number = i + 1));
  return valid;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
