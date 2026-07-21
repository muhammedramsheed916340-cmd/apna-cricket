import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyLicenseKeyAsync } from "@/lib/license-verify";
import { runGeneration } from "@/lib/team-engine";
import type { GenerationMode, GenerationRequest, Combination } from "@/lib/team-engine/types";

export const dynamic = "force-dynamic";

const VALID_MODES: GenerationMode[] = [
  "section",
  "smart",
  "grand",
  "advanced",
  "captain",
  "vicecaptain",
  "combination",
];

interface RawRequestBody {
  matchId?: string;
  type?: string;
  teamCount?: number;
  combination?: { wk: number; bat: number; ar: number; bowl: number };
  combinations?: Combination[];
  captainIds?: string[];
  viceCaptainIds?: string[];
  playerPool?: any[];
  filters?: string[];
  diversity?: boolean;
  pitchType?: "batting" | "bowling" | "spin" | "balanced" | "auto";
  maxSameComboPercent?: number;
}

export async function POST(req: Request) {
  try {
    // ====== SERVER-SIDE LICENSE VERIFICATION (mandatory, async — checks Neon) ======
    const cookieStore = await cookies();
    const licenseKey = cookieStore.get("tg_license_key")?.value || "";
    const licenseCheck = await verifyLicenseKeyAsync(licenseKey);
    if (!licenseCheck.authorized) {
      return NextResponse.json(
        { status: "error", message: licenseCheck.error, code: licenseCheck.code },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as RawRequestBody;

    // ====== Input validation ======
    if (!body.matchId || typeof body.matchId !== "string") {
      return NextResponse.json(
        { status: "error", message: "matchId is required" },
        { status: 400 }
      );
    }

    // Validate mode — mode isolation starts here
    const mode = (body.type || "smart") as GenerationMode;
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json(
        {
          status: "error",
          message: `Invalid mode "${body.type}". Valid modes: ${VALID_MODES.join(", ")}`,
          code: "INVALID_MODE",
        },
        { status: 400 }
      );
    }

    // Validate teamCount — prevent NaN (silent 0-team response)
    const rawCount = Number(body.teamCount);
    if (!Number.isFinite(rawCount) || rawCount <= 0) {
      return NextResponse.json(
        { status: "error", message: "teamCount must be a positive number" },
        { status: 400 }
      );
    }
    const teamCount = Math.min(Math.floor(rawCount), 500);

    // Validate pitchType
    const pitchType = body.pitchType || "auto";
    if (!["batting", "bowling", "spin", "balanced", "auto"].includes(pitchType)) {
      return NextResponse.json(
        { status: "error", message: `Invalid pitchType: ${pitchType}` },
        { status: 400 }
      );
    }

    // Mode-specific required-field checks
    if (mode === "section") {
      if (!body.playerPool || !Array.isArray(body.playerPool) || body.playerPool.length < 11) {
        return NextResponse.json(
          { status: "error", message: "Section mode requires playerPool with exactly 11 players", code: "MISSING_PLAYER_POOL" },
          { status: 400 }
        );
      }
    }
    if (mode === "captain" && (!body.captainIds || body.captainIds.length === 0)) {
      return NextResponse.json(
        { status: "error", message: "Captain mode requires captainIds", code: "MISSING_CAPTAIN_IDS" },
        { status: 400 }
      );
    }
    if (mode === "vicecaptain" && (!body.viceCaptainIds || body.viceCaptainIds.length === 0)) {
      return NextResponse.json(
        { status: "error", message: "Vice Captain mode requires viceCaptainIds", code: "MISSING_VC_IDS" },
        { status: 400 }
      );
    }
    if (mode === "combination" && (!body.combinations || body.combinations.length === 0)) {
      return NextResponse.json(
        { status: "error", message: "Combination mode requires combinations array", code: "MISSING_COMBINATIONS" },
        { status: 400 }
      );
    }

    // ====== Build generation request ======
    const genReq: GenerationRequest = {
      matchId: body.matchId,
      type: mode,
      teamCount,
      combination: body.combination,
      combinations: body.combinations,
      captainIds: body.captainIds,
      viceCaptainIds: body.viceCaptainIds,
      playerPool: body.playerPool,
      filters: body.filters,
      diversity: body.diversity,
      pitchType: pitchType as GenerationRequest["pitchType"],
      maxSameComboPercent: body.maxSameComboPercent || 30,
    };

    // ====== Run engine (mode-isolated, real analysis, no fake success) ======
    const result = await runGeneration(genReq);

    if (result.status === "error") {
      return NextResponse.json(
        {
          status: "error",
          message: result.message,
          code: result.code,
          mode: result.mode,
          lineupStatus: result.lineupStatus,
          generationTimeMs: result.generationTimeMs,
          log: result.log,
        },
        { status: 500 }
      );
    }

    // ====== Success — return full result (contract-compatible + extras) ======
    return NextResponse.json({
      // Contract fields (existing UI relies on these)
      status: "success",
      type: result.mode,
      matchId: result.matchId,
      count: result.count,
      teams: result.teams,
      combinationDistribution: result.combinationDistribution,
      pitchAnalysis: pitchType,
      diversityEnabled: body.diversity !== false,
      maxSameComboPercent: result.analyzerReport ? (body.maxSameComboPercent || 30) : (body.maxSameComboPercent || 30),
      generatedAt: result.generatedAt,
      // Engine extras (UI may ignore; available for debugging + future UI)
      mode: result.mode,
      lineupStatus: result.lineupStatus,
      analyzerReport: result.analyzerReport,
      validationReport: result.validationReport,
      generationTimeMs: result.generationTimeMs,
      log: result.log,
    });
  } catch (e) {
    console.error("[generate-teams] fatal:", e);
    return NextResponse.json(
      {
        status: "error",
        message: (e as Error).message || "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
