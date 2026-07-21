// ============================================================================
// Team Generation Engine — Shared Types
// ----------------------------------------------------------------------------
// Production-quality, mode-isolated team generation.
// Every team is derived from REAL match data (no random/dummy/mock/placeholder).
// ============================================================================

import type { Player } from "@/lib/players";

// 0=WK, 1=BAT, 2=AR, 3=BOWL  (matches Player.role)
export const ROLE_LABELS = ["WK", "BAT", "AR", "BOWL"] as const;
export type RoleCode = 0 | 1 | 2 | 3;

// All 9 valid Dream11 WK-BAT-AR-BOWL combinations (sum = 11, 1-8 per role)
export interface Combination {
  wk: number;
  bat: number;
  ar: number;
  bowl: number;
  label: string; // "1-4-3-3"
}

export const ALL_COMBINATIONS: Combination[] = [
  { wk: 1, bat: 3, ar: 3, bowl: 4, label: "1-3-3-4" },
  { wk: 1, bat: 3, ar: 4, bowl: 3, label: "1-3-4-3" },
  { wk: 1, bat: 4, ar: 2, bowl: 4, label: "1-4-2-4" },
  { wk: 1, bat: 4, ar: 3, bowl: 3, label: "1-4-3-3" },
  { wk: 1, bat: 5, ar: 2, bowl: 3, label: "1-5-2-3" },
  { wk: 1, bat: 3, ar: 2, bowl: 5, label: "1-3-2-5" },
  { wk: 2, bat: 3, ar: 2, bowl: 4, label: "2-3-2-4" },
  { wk: 2, bat: 4, ar: 2, bowl: 3, label: "2-4-2-3" },
  { wk: 2, bat: 3, ar: 3, bowl: 3, label: "2-3-3-3" },
];

export type GenerationMode =
  | "section"
  | "smart"
  | "grand"
  | "advanced"
  | "captain"
  | "vicecaptain"
  | "combination";

// Extended player with REAL analyzer-derived metrics (no guessing)
export interface PlayerAnalysis extends Player {
  // ---- REAL fields from API (passed through) ----
  captainPct: number; // captain_percentage from API
  vcPct: number; // vice_captain_percentage from API
  points: number; // recent-form proxy from API

  // ---- Computed from REAL fields only ----
  safeScore: number; // 0-100 — higher = safer (more reliable)
  differentialScore: number; // 0-100 — higher = better differential (low ownership + value)
  ceilingScore: number; // 0-100 — higher = higher upside potential
  formScore: number; // 0-100 — recent form (normalized points)
  baseRank: number; // overall rank in pool (1 = best)
  ownershipTier: "high" | "mid" | "low" | "fringe";
}

// Output team shape — MUST stay compatible with the existing UI contract
export interface GeneratedTeam {
  team_number: number;
  players: Player[];
  captain: Player;
  vicecaptain: Player;
  wk: number;
  bat: number;
  ar: number;
  bowl: number;
  leftCount: number;
  rightCount: number;
  totalCredits: number;
  combination_label: string;
  // Optional analysis metadata (UI may ignore)
  analysis?: {
    teamSafeScore: number;
    teamCeilingScore: number;
    teamDifferentialScore: number;
    ownershipUsed: number; // avg selBy of selected 11
    riskLevel: "low" | "medium" | "high";
  };
}

export interface AnalyzerReport {
  totalPlayers: number;
  playingXIConfirmed: boolean; // true if lineup is out
  lineupStatus: "final" | "pre-lineup" | "unknown";
  byRole: Record<RoleCode, number>;
  byTeam: { left: number; right: number };
  byTier: Record<string, number>;
  topSafePicks: string[]; // player names
  topDifferentialPicks: string[]; // player names
  topCeilingPicks: string[]; // player names
  poolWarnings: string[]; // e.g. "Only 3 WKs available — 2-WK combos disabled"
}

export interface ValidationReport {
  totalGenerated: number;
  valid: number;
  dropped: number;
  dropReasons: Record<string, number>; // reason -> count
}

export interface EngineLogEntry {
  ts: number;
  level: "info" | "warn" | "error";
  step: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface GenerationResult {
  status: "success" | "error";
  mode: GenerationMode;
  matchId: string;
  lineupStatus: "final" | "pre-lineup" | "unknown";
  count: number;
  teams: GeneratedTeam[];
  combinationDistribution: Record<string, number>;
  analyzerReport: AnalyzerReport;
  validationReport: ValidationReport;
  generationTimeMs: number;
  generatedAt: number;
  log: EngineLogEntry[];
  message?: string;
  code?: string;
}

// Input request — what each generation mode accepts
export interface GenerationRequest {
  matchId: string;
  type: GenerationMode;
  teamCount: number;
  // Optional inputs from client
  combination?: { wk: number; bat: number; ar: number; bowl: number };
  combinations?: Combination[]; // for "combination" mode — multiple combos from client
  captainIds?: string[]; // for "captain" mode
  viceCaptainIds?: string[]; // for "vicecaptain" mode
  playerPool?: Player[]; // for "section" mode — must be exactly 11
  filters?: string[]; // for "advanced" mode
  diversity?: boolean;
  pitchType?: "batting" | "bowling" | "spin" | "balanced" | "auto";
  maxSameComboPercent?: number;
}

// Combination label helper
export function combLabel(c: { wk: number; bat: number; ar: number; bowl: number }): string {
  return `${c.wk}-${c.bat}-${c.ar}-${c.bowl}`;
}
