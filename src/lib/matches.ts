export const BANNERS = [
  {
    alt: "Apna Cricket — Premium AI Fantasy Cricket",
    src: "/premium-cricket-banner.png",
    href: "/premium",
  },
  {
    alt: "Apna Cricket - Fantasy Team Generator",
    src: "/apna_cricket_logo.png",
    href: "#",
  },
  {
    alt: "Dream11 Teams",
    src: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&h=400&fit=crop",
    href: "#",
  },
  {
    alt: "Cricket Stadium",
    src: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&h=400&fit=crop",
    href: "#",
  },
];

export function formatCountdown(target: number, now: number): string {
  let diff = target - now;
  if (diff < 0) diff = 0;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

export const SPORTS = [
  { id: "cricket", label: "Cricket" },
  { id: "football", label: "Football" },
  { id: "basketball", label: "Basketball" },
  { id: "kabaddi", label: "Kabaddi" },
] as const;

export interface Match {
  id: string;
  series: string;
  sport: "cricket" | "football" | "basketball" | "kabaddi";
  leftTeam: { name: string; flag: string };
  rightTeam: { name: string; flag: string };
  badges: ("Mega GL" | "SL" | "H2H")[];
  targetTime: number;
}

const H = 3600 * 1000;

export const CRICKET_MATCHES: Match[] = [
  {
    id: "113526",
    series: "Women's T20 World Cup",
    sport: "cricket",
    leftTeam: {
      name: "ENG",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/EN-W-CR1@2x.png",
    },
    rightTeam: {
      name: "WI",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/WI-W-CR1@2x.png",
    },
    badges: ["Mega GL", "SL", "H2H"],
    targetTime: 0,
  },
  {
    id: "113527",
    series: "Women's T20 World Cup",
    sport: "cricket",
    leftTeam: {
      name: "IND",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/IN-W-CR1@2x.png",
    },
    rightTeam: {
      name: "BAN",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/BD-W-CR1@2x.png",
    },
    badges: ["Mega GL", "SL", "H2H"],
    targetTime: 0,
  },
  {
    id: "113528",
    series: "Women's T20 World Cup",
    sport: "cricket",
    leftTeam: {
      name: "SA",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/SA-W-CR1@2x.png",
    },
    rightTeam: {
      name: "NED",
      flag: "https://d13ir53smqqeyp.cloudfront.net/flags/cr-flags/NL-CR1@2x.png",
    },
    badges: ["Mega GL", "SL", "H2H"],
    targetTime: 0,
  },
];
