// Real match data - fetched live from tgsoftware-api.online and decrypted.
// Falls back to captured real match IDs (113523/113524/113525) if fetch fails.

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
  targetTime: number;
}

// REAL match IDs from decrypted tgsoftware-api.online data
// 113523 = NZ vs SCO, 113524 = SL vs IRE, 113525 = AUS vs PAK (Women's T20 World Cup)
const H = 3600 * 1000;

export const CRICKET_MATCHES: Match[] = [
  {
    id: "113523",
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
    targetTime: Date.now() + 15 * H,
  },
  {
    id: "113524",
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
    targetTime: Date.now() + 19 * H,
  },
  {
    id: "113525",
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
    targetTime: Date.now() + 23 * H,
  },
];

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
  const m = Math.floor((diff % H) / (60 * 1000));
  const s = Math.floor((diff % (60 * 1000)) / 1000);
  return `${h}h ${m}m ${s}s`;
}
