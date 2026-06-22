// Real match data captured from teamgeneration.in
// Matches are real upcoming Women's T20 World Cup fixtures displayed on the live site.
// Target times computed from live countdown values captured at server time.

export interface Match {
  id: string;
  series: string;
  sport: "cricket" | "football" | "basketball" | "kabaddi";
  leftTeam: {
    name: string;
    flag: string;
  };
  rightTeam: {
    name: string;
    flag: string;
  };
  badges: ("Mega GL" | "SL" | "H2H")[];
  // epoch ms target time for countdown
  targetTime: number;
}

// Captured at: Date.now() = 1782150870677
// timers: ["15h 35m 30s","19h 35m 30s","23h 35m 30s"]
const CAPTURE_BASE = 1782150870677;
const H = 3600 * 1000;
const M = 60 * 1000;
const S = 1000;

export const CRICKET_MATCHES: Match[] = [
  {
    id: "nz-sco-wt20",
    series: "Women's T20 World Cup",
    sport: "cricket",
    leftTeam: {
      name: "NZ",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/NZ-W-CR1@2x.png",
    },
    rightTeam: {
      name: "SCO",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/SCO-CR1@2x.png",
    },
    badges: ["Mega GL", "SL", "H2H"],
    targetTime: CAPTURE_BASE + 15 * H + 35 * M + 30 * S,
  },
  {
    id: "sl-ire-wt20",
    series: "Women's T20 World Cup",
    sport: "cricket",
    leftTeam: {
      name: "SL",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/SL-W-CR1@2x.png",
    },
    rightTeam: {
      name: "IRE",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/IRE-CR1@2x.png",
    },
    badges: ["Mega GL", "SL", "H2H"],
    targetTime: CAPTURE_BASE + 19 * H + 35 * M + 30 * S,
  },
  {
    id: "aus-pak-wt20",
    series: "Women's T20 World Cup",
    sport: "cricket",
    leftTeam: {
      name: "AUS",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/AU-W-CR1@2x.png",
    },
    rightTeam: {
      name: "PAK",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/PK-W-CR1@2x.png",
    },
    badges: ["Mega GL", "SL", "H2H"],
    targetTime: CAPTURE_BASE + 23 * H + 35 * M + 30 * S,
  },
];

// Real promotional banner images used on the live site carousel
export const BANNERS = [
  {
    alt: "TG Group",
    src: "https://i.ibb.co/b2jB1Pw/tg-groups.png",
    href: "https://t.me/teamgeneration_tg",
  },
  {
    alt: "Transfer To Dream11",
    src: "https://i.ibb.co/2td4cT1/d-banner.png",
    href: "#",
  },
  {
    alt: "subscribe our channel",
    src: "https://i.ibb.co/XYvjQqg/d11-new-rules.jpg",
    href: "https://www.youtube.com/c/believer01",
  },
  {
    alt: "subscribe our channel",
    src: "https://i.ibb.co/WGRph1y/telegram-subscribe.jpg",
    href: "https://t.me/teamgeneration_tg",
  },
  {
    alt: "subscribe our channel",
    src: "https://i.ibb.co/6vgWNXY/yt-subscribe.jpg",
    href: "https://www.youtube.com/c/believer01",
  },
];

export const SPORTS = [
  { id: "cricket", label: "Cricket" },
  { id: "football", label: "Football" },
  { id: "basketball", label: "Basketball" },
  { id: "kabaddi", label: "Kabaddi" },
] as const;

export function formatCountdown(target: number, now: number): string {
  let diff = target - now;
  if (diff < 0) diff = 0;
  const h = Math.floor(diff / H);
  const m = Math.floor((diff % H) / M);
  const s = Math.floor((diff % M) / S);
  return `${h}h ${m}m ${s}s`;
}
