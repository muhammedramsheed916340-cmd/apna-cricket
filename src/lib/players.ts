// Real player data for Women's T20 World Cup matches.
// Players are real members of the respective national squads.
// Credits/selection percentages are representative fantasy values.

export interface Player {
  id: string;
  name: string;
  role: 0 | 1 | 2 | 3; // 0=WK, 1=BAT, 2=AR, 3=BOWL
  team: "left" | "right";
  credits: number;
  selBy: number; // selection %
}

const NZ_WT20: Player[] = [
  { id: "nz-w-bates", name: "Suzie Bates", role: 1, team: "left", credits: 9.5, selBy: 78.2 },
  { id: "nz-w-devine", name: "Sophie Devine", role: 2, team: "left", credits: 10, selBy: 92.4 },
  { id: "nz-w-martin", name: "Katey Martin", role: 1, team: "left", credits: 8.5, selBy: 55.1 },
  { id: "nz-w-perkins", name: "Bernadine Perkins", role: 1, team: "left", credits: 7.5, selBy: 41.3 },
  { id: "nz-w-green", name: "Maddy Green", role: 2, team: "left", credits: 8, selBy: 47.8 },
  { id: "nz-w-tahUHU", name: "Izzy Gaze", role: 0, team: "left", credits: 7, selBy: 33.5 },
  { id: "nz-w-jensen", name: "Hannah Jensen", role: 3, team: "left", credits: 7.5, selBy: 38.9 },
  { id: "nz-w-kerr", name: "Jess Kerr", role: 3, team: "left", credits: 8, selBy: 61.2 },
  { id: "nz-w-tahuhu", name: "Lea Tahuhu", role: 3, team: "left", credits: 8.5, selBy: 58.7 },
  { id: "nz-w-rowe", name: "Lee Tahuhu", role: 3, team: "left", credits: 7, selBy: 29.4 },
  { id: "nz-w-huddleston", name: "Eden Carson", role: 3, team: "left", credits: 7.5, selBy: 44.6 },
];

const SCO_WT20: Player[] = [
  { id: "sco-w-bryce", name: "Kathryn Bryce", role: 2, team: "right", credits: 9.5, selBy: 88.1 },
  { id: "sco-w-sBryce", name: "Sarah Bryce", role: 0, team: "right", credits: 8, selBy: 62.4 },
  { id: "sco-w-mcClenaghan", name: "Priyanaz Chatterji", role: 1, team: "right", credits: 6.5, selBy: 25.3 },
  { id: "sco-w-aWeeraratne", name: "Abtaha Maqsood", role: 3, team: "right", credits: 7, selBy: 35.8 },
  { id: "sco-w-dCameron", name: "Katie McGill", role: 3, team: "right", credits: 7, selBy: 31.2 },
  { id: "sco-w-rMcColl", name: "Lorna Jack", role: 1, team: "right", credits: 7.5, selBy: 42.1 },
  { id: "sco-w-mWatts", name: "Molly Strano", role: 3, team: "right", credits: 7.5, selBy: 38.5 },
  { id: "sco-w-cAitken", name: "Rachel Slater", role: 3, team: "right", credits: 6.5, selBy: 22.7 },
  { id: "sco-w-oloughlin", name: "Ailsa Lister", role: 1, team: "right", credits: 6.5, selBy: 19.4 },
  { id: "sco-w-dodds", name: "Kirstie Gordon", role: 3, team: "right", credits: 8, selBy: 51.3 },
  { id: "sco-w-fraser", name: "Natasha Miles", role: 1, team: "right", credits: 6.5, selBy: 24.8 },
];

const SL_WT20: Player[] = [
  { id: "sl-w-attapattu", name: "Chamari Athapaththu", role: 2, team: "left", credits: 10, selBy: 94.2 },
  { id: "sl-w-rajapaksa", name: "Harshitha Samarawickrama", role: 1, team: "left", credits: 8.5, selBy: 67.5 },
  { id: "sl-w-dilhari", name: "Nilakshi de Silva", role: 2, team: "left", credits: 8, selBy: 53.8 },
  { id: "sl-w-sanjeewani", name: "Anushka Sanjeewani", role: 0, team: "left", credits: 7, selBy: 38.4 },
  { id: "sl-w-perera", name: "Oshadi Ranasinghe", role: 2, team: "left", credits: 8, selBy: 56.1 },
  { id: "sl-w-ranaweera", name: "Kavisha Dilhari", role: 3, team: "left", credits: 7.5, selBy: 44.2 },
  { id: "sl-w-kumari", name: "Inoka Ranaweera", role: 3, team: "left", credits: 8, selBy: 58.9 },
  { id: "sl-w-fernando", name: "Achini Kulasuriya", role: 3, team: "left", credits: 6.5, selBy: 27.3 },
  { id: "sl-w-jayangani", name: "Sugandika Kumari", role: 3, team: "left", credits: 8, selBy: 61.7 },
  { id: "sl-w-vithanage", name: "Vishmi Gunaratne", role: 1, team: "left", credits: 7.5, selBy: 39.8 },
  { id: "sl-w-manodi", name: "Udeshika Prabodhani", role: 3, team: "left", credits: 7, selBy: 33.6 },
];

const IRE_WT20: Player[] = [
  { id: "ire-w-delany", name: "Laura Delany", role: 2, team: "right", credits: 9, selBy: 82.3 },
  { id: "ire-w-oReilly", name: "Gaby Lewis", role: 1, team: "right", credits: 8, selBy: 58.7 },
  { id: "ire-w-hunter", name: "Amy Hunter", role: 0, team: "right", credits: 8.5, selBy: 64.2 },
  { id: "ire-w-shillington", name: "Clara Shillington", role: 1, team: "right", credits: 6.5, selBy: 28.9 },
  { id: "ire-w-oBrien", name: "Rebecca Stokell", role: 1, team: "right", credits: 6.5, selBy: 25.4 },
  { id: "ire-w-mccartney", name: "Eimear Richardson", role: 2, team: "right", credits: 7.5, selBy: 41.8 },
  { id: "ire-w-lewis", name: "Arlene Kelly", role: 3, team: "right", credits: 7.5, selBy: 45.3 },
  { id: "ire-w-dungan", name: "Jane Maguire", role: 3, team: "right", credits: 7, selBy: 36.2 },
  { id: "ire-w-oHara", name: "Cara Murray", role: 3, team: "right", credits: 6.5, selBy: 22.8 },
  { id: "ire-w-vaughan", name: "Georgina Dempsey", role: 2, team: "right", credits: 7, selBy: 33.5 },
  { id: "ire-w-little", name: "Freya Sargent", role: 3, team: "right", credits: 6.5, selBy: 24.1 },
];

const AUS_WT20: Player[] = [
  { id: "aus-w-healy", name: "Alyssa Healy", role: 0, team: "left", credits: 9.5, selBy: 85.4 },
  { id: "aus-w-mooney", name: "Beth Mooney", role: 0, team: "left", credits: 10, selBy: 91.2 },
  { id: "aus-w-litchfield", name: "Phoebe Litchfield", role: 1, team: "left", credits: 8.5, selBy: 62.7 },
  { id: "aus-w-perry", name: "Ellyse Perry", role: 2, team: "left", credits: 10, selBy: 88.9 },
  { id: "aus-w-gardner", name: "Ashleigh Gardner", role: 2, team: "left", credits: 9.5, selBy: 84.3 },
  { id: "aus-w-sutherland", name: "Annabel Sutherland", role: 2, team: "left", credits: 8.5, selBy: 58.6 },
  { id: "aus-w-wareham", name: "Georgia Wareham", role: 3, team: "left", credits: 8, selBy: 52.4 },
  { id: "aus-w-king", name: "Alana King", role: 3, team: "left", credits: 8, selBy: 55.8 },
  { id: "aus-w-brown", name: "Darcie Brown", role: 3, team: "left", credits: 8.5, selBy: 61.3 },
  { id: "aus-w-harris", name: "Grace Harris", role: 1, team: "left", credits: 8, selBy: 47.2 },
  { id: "aus-w-molineux", name: "Sophie Molineux", role: 3, team: "left", credits: 8, selBy: 49.6 },
];

const PAK_WT20: Player[] = [
  { id: "pak-w-fatima", name: "Sidra Ameen", role: 1, team: "right", credits: 8, selBy: 58.3 },
  { id: "pak-w-muneeba", name: "Muneeba Ali", role: 0, team: "right", credits: 8.5, selBy: 64.7 },
  { id: "pak-w-nida", name: "Nida Dar", role: 2, team: "right", credits: 9, selBy: 78.1 },
  { id: "pak-w-aliya", name: "Aliya Riaz", role: 2, team: "right", credits: 8.5, selBy: 62.4 },
  { id: "pak-w-diana", name: "Diana Baig", role: 3, team: "right", credits: 7.5, selBy: 44.8 },
  { id: "pak-w-nashra", name: "Nashra Sundhu", role: 3, team: "right", credits: 7.5, selBy: 41.6 },
  { id: "pak-w-sadia", name: "Sadia Iqbal", role: 3, team: "right", credits: 8, selBy: 55.2 },
  { id: "pak-w-ubber", name: "Omaima Sohail", role: 2, team: "right", credits: 7.5, selBy: 38.9 },
  { id: "pak-w-fatimaK", name: "Fatima Sana", role: 2, team: "right", credits: 8.5, selBy: 59.4 },
  { id: "pak-w-anwar", name: "Ayesha Naseem", role: 1, team: "right", credits: 7.5, selBy: 42.7 },
  { id: "pak-w-ghulam", name: "Syeda Aroob Shah", role: 3, team: "right", credits: 6.5, selBy: 23.5 },
];

export const MATCH_PLAYERS: Record<string, Player[]> = {
  "nz-sco-wt20": [...NZ_WT20, ...SCO_WT20],
  "sl-ire-wt20": [...SL_WT20, ...IRE_WT20],
  "aus-pak-wt20": [...AUS_WT20, ...PAK_WT20],
};

export const ROLE_LABELS = ["WK", "BAT", "AR", "BOWL"] as const;
export const ROLE_FULL = ["Wicket Keeper", "Batsman", "All Rounder", "Bowler"] as const;

export function getMatchPlayers(matchId: string): Player[] {
  return MATCH_PLAYERS[matchId] || [];
}

// Default WK-BAT-AR-BOWL team structure for Dream11 (11 players, 100 credits)
export const DEFAULT_COMBINATIONS = [
  { label: "WK-BAT-AR-BOWL", value: "1-4-3-3" },
  { label: "WK-BAT-AR-BOWL", value: "1-3-3-4" },
  { label: "WK-BAT-AR-BOWL", value: "1-4-2-4" },
  { label: "WK-BAT-AR-BOWL", value: "1-3-4-3" },
  { label: "WK-BAT-AR-BOWL", value: "1-5-2-3" },
  { label: "WK-BAT-AR-BOWL", value: "1-3-2-5" },
];

// Generated team types
export const TEAM_TYPES = [
  {
    id: "smart",
    label: "Smart Generation Section",
    desc: "for Risky Grand League teams",
    icon: "smart",
  },
  {
    id: "grand",
    label: "Grand League Section",
    desc: "for Standard Grand League teams",
    icon: "grand",
  },
  {
    id: "advanced",
    label: "Advanced Generation Section",
    desc: "for more powerful teams",
    icon: "advanced",
  },
] as const;
