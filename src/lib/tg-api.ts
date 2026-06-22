import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = "coder_bobby_believer01_tg_software";
const BACKEND_URL = "https://tgsoftware-api.online";

export function decryptString(encrypted: string): string {
  try {
    return CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY).toString(
      CryptoJS.enc.Utf8
    );
  } catch {
    return "";
  }
}

export function decryptJSON<T>(encrypted: string): T | null {
  try {
    const decrypted = decryptString(encrypted);
    if (!decrypted) return null;
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}

export interface RawMatchList {
  _id: string;
  id: string;
  tour_id: string;
  left_team_name: string;
  right_team_name: string;
  left_team_image: string;
  right_team_image: string;
  series_name: string;
  match_time: string;
  sport_index: number;
  lineup_out: number;
  fantasy_list?: string[];
}

export interface RawPlayer {
  name: string;
  image: string;
  playing: number;
  role: number;
  credits: number;
  points: number;
  selected_by: number;
  captain_percentage: number;
  vice_captain_percentage: number;
  team_index: number;
  team_name: string;
  player_fixed_id: number;
  player_type: string;
  fantasy_id_list: Array<{ name: string; id: number }>;
}

export interface RawMatchDetail {
  match_time: string;
  left_team_name: string;
  right_team_name: string;
  left_team_image: string;
  right_team_image: string;
  lineup_status: number | string;
  sport_index: number | string;
  left_team_players: string[];
  right_team_players: string[];
  fantasy_version?: Array<{ name: string }>;
}

export interface RealMatch {
  id: string;
  series: string;
  team1Name: string;
  team2Name: string;
  team1Image: string;
  team2Image: string;
  matchTime: string;
  sportIndex: number;
  lineupOut: boolean;
  fantasyList: string[];
}

export interface RealPlayer {
  name: string;
  team: string;
  role: number; // 0=WK, 1=BAT, 2=AR/AL, 3=BOWL (for cricket)
  credits: number;
  points: number;
  selectedBy: number;
  captainPercentage: number;
  viceCaptainPercentage: number;
  playing: boolean | null;
  image: string;
  playerType: string;
  fantasyIdList: Array<{ name: string; id: number }>;
  // convenience: dream11 ID (most common)
  fantasyId: number;
}

export interface RealMatchDetail {
  id: string;
  series: string;
  team1Name: string;
  team2Name: string;
  team1Image: string;
  team2Image: string;
  matchTime: string;
  sportIndex: number;
  lineupStatus: number;
  players: RealPlayer[];
}

const SPORT_ROLE_MAP: Record<number, string[]> = {
  0: ["WK", "BAT", "AL", "BOWL"],
  1: ["GK", "DEF", "MID", "FWD"],
  2: ["GK", "DEF", "MID", "FWD"],
  3: ["DEF", "ALL", "RAID"],
};

const SPORT_INDEX_MAP: Record<number, string> = {
  0: "cricket",
  1: "football",
  2: "basketball",
  3: "kabaddi",
};

export function sportName(index: number): string {
  return SPORT_INDEX_MAP[index] || "cricket";
}

// Fetch + decrypt matches list from real backend
export async function fetchMatches(sport: string): Promise<RealMatch[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/fantasy/matches/${sport}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status !== "success" || !Array.isArray(json.data)) return [];

    const now = Date.now();
    const matches: RealMatch[] = [];
    for (const encryptedMatch of json.data) {
      const raw = decryptJSON<RawMatchList>(encryptedMatch);
      if (!raw) continue;
      const matchTime = new Date(raw.match_time).getTime();
      const hoursDiff = (now - matchTime) / (1000 * 60 * 60);
      if (hoursDiff > 6) continue;
      matches.push({
        id: raw.id,
        series: raw.series_name,
        team1Name: raw.left_team_name,
        team2Name: raw.right_team_name,
        team1Image: raw.left_team_image,
        team2Image: raw.right_team_image,
        matchTime: raw.match_time,
        sportIndex: raw.sport_index,
        lineupOut: raw.lineup_out === 1,
        fantasyList: raw.fantasy_list || [],
      });
    }
    matches.sort(
      (a, b) =>
        new Date(a.matchTime).getTime() - new Date(b.matchTime).getTime()
    );
    return matches;
  } catch {
    return [];
  }
}

// Fetch + decrypt match detail (players with fantasy IDs)
export async function fetchMatchDetail(
  matchId: string
): Promise<RealMatchDetail | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/fantasy/match/${matchId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "success" || !json.data) return null;

    const raw: RawMatchDetail = json.data;
    const team1Name = decryptString(raw.left_team_name);
    const team2Name = decryptString(raw.right_team_name);
    const team1Image = decryptString(raw.left_team_image);
    const team2Image = decryptString(raw.right_team_image);
    const matchTime = decryptString(raw.match_time);
    const lineupStatus =
      typeof raw.lineup_status === "string"
        ? parseInt(raw.lineup_status)
        : raw.lineup_status || 0;
    const sportIndex =
      typeof raw.sport_index === "string"
        ? parseInt(raw.sport_index)
        : raw.sport_index || 0;

    const players: RealPlayer[] = [];
    const parsePlayer = (encrypted: string, fallbackTeam: string) => {
      const p = decryptJSON<RawPlayer>(encrypted);
      if (!p) return;
      const playing: boolean | null =
        lineupStatus === 1 ? (p.playing === 1 ? true : false) : null;
      // dream11 fantasy ID (most common); fall back to player_fixed_id
      const d11 = p.fantasy_id_list?.find((f) => f.name === "dream11");
      const fantasyId = d11?.id || p.player_fixed_id || 0;
      players.push({
        name: p.name,
        team: p.team_name || fallbackTeam,
        role: p.role,
        credits: p.credits,
        points: p.points,
        selectedBy: p.selected_by,
        captainPercentage: p.captain_percentage,
        viceCaptainPercentage: p.vice_captain_percentage,
        playing,
        image: p.image,
        playerType: p.player_type,
        fantasyIdList: p.fantasy_id_list || [],
        fantasyId,
      });
    };

    for (const ep of raw.left_team_players) parsePlayer(ep, team1Name);
    for (const ep of raw.right_team_players) parsePlayer(ep, team2Name);

    return {
      id: matchId,
      series: "",
      team1Name,
      team2Name,
      team1Image,
      team2Image,
      matchTime,
      sportIndex,
      lineupStatus,
      players,
    };
  } catch {
    return null;
  }
}

// Get the fantasy player ID for a specific platform
export function getFantasyId(
  player: RealPlayer,
  platform: string
): number {
  const found = player.fantasyIdList.find(
    (f) => f.name === platform || f.name === platform.replace("11", "")
  );
  return found?.id || player.fantasyId || 0;
}
