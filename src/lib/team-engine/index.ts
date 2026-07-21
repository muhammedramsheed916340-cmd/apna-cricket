// ============================================================================
// Team Generation Engine — Dispatcher
// ----------------------------------------------------------------------------
// Single entry point. Loads REAL players, detects lineup status, runs the
// mode-isolated generator, validates, and returns the result.
//
// MODE ISOLATION GUARANTEE:
//   - Each mode (section/smart/grand/advanced/captain/vicecaptain/combination)
//     is dispatched to its OWN generator only.
//   - No mode ever falls back to another mode's algorithm.
//   - No algorithm mixing.
// ============================================================================

import type { Player } from "@/lib/players";
import { fetchMatchDetail } from "@/lib/tg-api";
import { getMatchPlayers } from "@/lib/players";
import type {
  GenerationMode,
  GenerationRequest,
  GenerationResult,
  GeneratedTeam,
  Combination,
} from "./types";
import { EngineLogger } from "./logger";
import { analyzePool } from "./analyzer";
import { generateSmart } from "./generators/smart";
import { generateGrand } from "./generators/grand";
import { generateAdvanced } from "./generators/advanced";
import { generateSection } from "./generators/section";
import { generateCaptain } from "./generators/captain";
import { generateViceCaptain } from "./generators/vicecaptain";
import { generateCombination } from "./generators/combination";

// Mode → display name (for logging)
const MODE_NAMES: Record<GenerationMode, string> = {
  section: "Section Generator",
  smart: "Smart Generator",
  grand: "Grand League Generator",
  advanced: "Advanced Generator",
  captain: "Captain Optimizer",
  vicecaptain: "Vice Captain Optimizer",
  combination: "Combination Generator",
};

// Load REAL players from the backend API (with decryption).
// Falls back to the bundled Women's T20 dataset ONLY if the API fails
// AND no client playerPool was provided.
export async function loadRealPlayers(
  matchId: string,
  clientPool: Player[] | undefined,
  log: EngineLogger
): Promise<{ players: Player[]; lineupOut: boolean; source: string }> {
  log.info("players.load", `Loading players for match ${matchId}`);

  // Step 1: If client provided a playerPool (Section page), validate it
  if (clientPool && clientPool.length >= 11) {
    const valid = clientPool.filter(
      (p) =>
        p &&
        typeof p.id !== "undefined" &&
        typeof p.name === "string" &&
        [0, 1, 2, 3].includes(p.role as number) &&
        (p.team === "left" || p.team === "right") &&
        typeof p.credits === "number" &&
        p.credits > 0
    );
    if (valid.length >= 11) {
      log.info("players.load.client", `Using client playerPool (${valid.length} players)`);
      // Determine lineup status from client pool
      const hasLineup = valid.some(
        (p) => (p as any).playing === true || (p as any).playing === false
      );
      return { players: valid, lineupOut: hasLineup, source: "client-pool" };
    }
    log.warn("players.load.client.invalid", `Client pool had only ${valid.length} valid players — falling back to API`);
  }

  // Step 2: Fetch real players from backend
  log.info("players.load.api", "Fetching real match detail from backend API");
  try {
    const detail = await fetchMatchDetail(matchId);
    if (!detail || detail.players.length === 0) {
      log.warn("players.load.api.empty", "Backend returned no players — trying bundled dataset");
      const fallback = getMatchPlayers(matchId);
      if (fallback.length > 0) {
        log.info("players.load.fallback", `Using bundled dataset (${fallback.length} players)`);
        return { players: fallback, lineupOut: false, source: "bundled-fallback" };
      }
      log.error("players.load.fail", "No players available from any source");
      return { players: [], lineupOut: false, source: "none" };
    }

    const players: Player[] = detail.players.map((p, i) => ({
      id: `${p.name}-${i}`,
      name: p.name,
      role: p.role as 0 | 1 | 2 | 3,
      team: p.team === detail.team1Name ? "left" : "right",
      credits: p.credits,
      selBy: p.selectedBy,
      fantasyId: p.fantasyId,
      fantasyIdList: p.fantasyIdList,
      playing: p.playing,
      // Pass through analyzer signals
      captainPercentage: p.captainPercentage,
      viceCaptainPercentage: p.viceCaptainPercentage,
      points: p.points,
    } as any));

    // Lineup detection: if any player has playing=true/false, lineup is out
    const lineupOut = players.some(
      (p) => (p as any).playing === true || (p as any).playing === false
    );

    log.info("players.load.success", `Loaded ${players.length} real players (lineupOut=${lineupOut})`, {
      team1: detail.team1Name,
      team2: detail.team2Name,
      lineupStatus: detail.lineupStatus,
    });

    return { players, lineupOut, source: "backend-api" };
  } catch (e) {
    log.error("players.load.error", `Backend fetch failed: ${(e as Error).message}`);
    const fallback = getMatchPlayers(matchId);
    if (fallback.length > 0) {
      log.info("players.load.fallback", `Using bundled dataset after error (${fallback.length} players)`);
      return { players: fallback, lineupOut: false, source: "bundled-fallback" };
    }
    return { players: [], lineupOut: false, source: "none" };
  }
}

// Main dispatcher
export async function runGeneration(req: GenerationRequest): Promise<GenerationResult> {
  const log = new EngineLogger();
  const startedAt = Date.now();
  const mode = req.type;

  log.info("engine.start", `=== ${MODE_NAMES[mode]} started ===`, {
    mode,
    matchId: req.matchId,
    teamCount: req.teamCount,
    pitchType: req.pitchType || "auto",
  });

  // ====== STEP 1: Load real players ======
  log.info("research.start", "Research phase: loading real match data");
  const { players: rawPlayers, lineupOut, source } = await loadRealPlayers(
    req.matchId,
    req.playerPool,
    log
  );

  if (rawPlayers.length === 0) {
    log.error("research.fail", "No real players available — cannot generate teams");
    return errorResult(req, log, "No real player data available for this match", "NO_PLAYERS", startedAt);
  }

  log.info("research.complete", `Research complete: ${rawPlayers.length} players from ${source}`, {
    lineupOut,
    lineupStatus: lineupOut ? "final" : "pre-lineup",
  });

  // ====== STEP 2: Apply lineup filter (when lineup is OUT) ======
  // STRICT MODE: If lineup is out, only use confirmed playing XI
  let workingPool = rawPlayers;
  if (lineupOut) {
    const playingOnly = rawPlayers.filter((p) => (p as any).playing === true);
    if (playingOnly.length >= 11) {
      log.info("lineup.final", `Lineup OUT — strict mode: using ${playingOnly.length} confirmed playing XI players`);
      workingPool = playingOnly;
    } else {
      log.warn(
        "lineup.partial",
        `Lineup marked out but only ${playingOnly.length} marked playing — using all ${rawPlayers.length} (precaution)`
      );
    }
  } else {
    log.info("lineup.pre", "Lineup NOT out — using full probable squad (pre-lineup mode)");
  }

  if (workingPool.length < 11) {
    log.error("pool.too.small", `Working pool has only ${workingPool.length} players (need ≥11)`);
    return errorResult(req, log, `Only ${workingPool.length} players available (need 11)`, "POOL_TOO_SMALL", startedAt);
  }

  // ====== STEP 3: Analyze players (real scores, no guessing) ======
  log.info("analyzer.start", "Analyzing players with real signals (selBy, captainPct, vcPct, points, credits, role)");
  const { players: analyzed, report: analyzerReport } = analyzePool(workingPool, lineupOut);
  log.info("analyzer.complete", `Analysis complete — ranked ${analyzed.length} players`, {
    byRole: analyzerReport.byRole,
    byTeam: analyzerReport.byTeam,
    byTier: analyzerReport.byTier,
    warnings: analyzerReport.poolWarnings,
  });

  // ====== STEP 4: Dispatch to mode-isolated generator ======
  log.info("generator.start", `Dispatching to ${MODE_NAMES[mode]} (mode-isolated)`);
  let teams: GeneratedTeam[] = [];
  const pitchType = req.pitchType || "auto";
  const maxSamePct = req.maxSameComboPercent || 30;

  try {
    switch (mode) {
      case "smart":
        teams = generateSmart(analyzed, {
          teamCount: req.teamCount,
          pitchType,
          maxSameComboPercent: maxSamePct,
          combination: req.combination,
          captainIds: req.captainIds,
          viceCaptainIds: req.viceCaptainIds,
        }, log);
        break;
      case "grand":
        teams = generateGrand(analyzed, {
          teamCount: req.teamCount,
          pitchType,
          maxSameComboPercent: maxSamePct,
        }, log);
        break;
      case "advanced":
        teams = generateAdvanced(analyzed, {
          teamCount: req.teamCount,
          pitchType,
          maxSameComboPercent: maxSamePct,
          filters: req.filters || [],
        }, log);
        break;
      case "section":
        teams = generateSection(analyzed, {
          teamCount: req.teamCount,
          captainIds: req.captainIds,
          viceCaptainIds: req.viceCaptainIds,
        }, log);
        break;
      case "captain":
        teams = generateCaptain(analyzed, {
          teamCount: req.teamCount,
          pitchType,
          maxSameComboPercent: maxSamePct,
          captainIds: req.captainIds || [],
        }, log);
        break;
      case "vicecaptain":
        teams = generateViceCaptain(analyzed, {
          teamCount: req.teamCount,
          pitchType,
          maxSameComboPercent: maxSamePct,
          viceCaptainIds: req.viceCaptainIds || [],
        }, log);
        break;
      case "combination":
        teams = generateCombination(analyzed, {
          teamCount: req.teamCount,
          combinations: (req.combinations || []) as Combination[],
          maxSameComboPercent: maxSamePct,
          captainIds: req.captainIds,
          viceCaptainIds: req.viceCaptainIds,
        }, log);
        break;
      default:
        log.error("generator.unknown", `Unknown mode: ${mode}`);
        return errorResult(req, log, `Unknown generation mode: ${mode}`, "UNKNOWN_MODE", startedAt);
    }
  } catch (e) {
    log.error("generator.fail", `Generator threw: ${(e as Error).message}`, { stack: (e as Error).stack });
    return errorResult(req, log, `Generator error: ${(e as Error).message}`, "GENERATOR_ERROR", startedAt);
  }

  log.info("generator.finish", `Generator produced ${teams.length} valid teams`);

  // ====== STEP 5: NO FAKE SUCCESS — fail if zero teams ======
  if (teams.length === 0) {
    log.error("generator.empty", "Zero valid teams generated — returning error (no fake success)");
    return errorResult(
      req,
      log,
      "Team generation failed: 0 valid teams after validation. Check player pool, combinations, and constraints.",
      "ZERO_TEAMS",
      startedAt,
      { analyzerReport }
    );
  }

  // ====== STEP 6: Build response (contract-compatible + extras) ======
  const combinationDistribution: Record<string, number> = {};
  for (const t of teams) {
    combinationDistribution[t.combination_label] =
      (combinationDistribution[t.combination_label] || 0) + 1;
  }

  const generationTimeMs = Date.now() - startedAt;
  log.info("engine.complete", `=== ${MODE_NAMES[mode]} complete ===`, {
    teams: teams.length,
    timeMs: generationTimeMs,
    lineupStatus: lineupOut ? "final" : "pre-lineup",
  });

  return {
    status: "success",
    mode,
    matchId: req.matchId,
    lineupStatus: lineupOut ? "final" : "pre-lineup",
    count: teams.length,
    teams,
    combinationDistribution,
    analyzerReport,
    validationReport: {
      totalGenerated: teams.length,
      valid: teams.length,
      dropped: 0,
      dropReasons: {},
    },
    generationTimeMs,
    generatedAt: Date.now(),
    log: log.snapshot(),
  };
}

function errorResult(
  req: GenerationRequest,
  log: EngineLogger,
  message: string,
  code: string,
  startedAt: number,
  extra?: Record<string, unknown>
): GenerationResult {
  return {
    status: "error",
    mode: req.type,
    matchId: req.matchId,
    lineupStatus: "unknown",
    count: 0,
    teams: [],
    combinationDistribution: {},
    analyzerReport: extra?.analyzerReport as any || {
      totalPlayers: 0,
      playingXIConfirmed: false,
      lineupStatus: "unknown",
      byRole: { 0: 0, 1: 0, 2: 0, 3: 0 },
      byTeam: { left: 0, right: 0 },
      byTier: {},
      topSafePicks: [],
      topDifferentialPicks: [],
      topCeilingPicks: [],
      poolWarnings: [],
    },
    validationReport: { totalGenerated: 0, valid: 0, dropped: 0, dropReasons: {} },
    generationTimeMs: Date.now() - startedAt,
    generatedAt: Date.now(),
    log: log.snapshot(),
    message,
    code,
  };
}
