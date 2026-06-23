export const BANNERS = [
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
  {
    alt: "Cricket Action",
    src: "https://images.unsplash.com/photo-1593796145377-30e2b1d9c4d1?w=800&h=400&fit=crop",
    href: "#",
  },
  {
    alt: "Cricket Bat and Ball",
    src: "https://images.unsplash.com/photo-1593241331797-1eaa8e2d4c1f?w=800&h=400&fit=crop",
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
