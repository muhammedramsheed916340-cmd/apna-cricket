// Fantasy platform configuration - mirrors the original teamgeneration.in
// Supports Dream11, My11Circle, Jumbo with OTP-based login and team transfer.

export interface FantasyPlatform {
  slug: "dream11" | "my11circle" | "jumbo";
  name: string;
  logo: string;
  color: string;
  limit: number; // max teams per transfer batch
  available: boolean;
}

export const FANTASY_PLATFORMS: FantasyPlatform[] = [
  {
    slug: "dream11",
    name: "Dream11",
    logo: "/Dream11.jpg",
    color: "#d13239",
    limit: 40,
    available: true,
  },
  {
    slug: "my11circle",
    name: "My11Circle",
    logo: "/My11Circle.jpg",
    color: "#1a936f",
    limit: 40,
    available: true,
  },
  {
    slug: "jumbo",
    name: "Jumbo",
    logo: "/jumbo.jpg",
    color: "#f6ae2d",
    limit: 50,
    available: true,
  },
];

export interface FantasyAccount {
  slug: string;
  name: string;
  mobileNumber: string;
  authToken: string | null;
  linked: boolean;
  linkedAt: number | null;
}

// Generate logo images for fantasy platforms (since we don't have the real jpgs)
export function getPlatformLogo(slug: string): string {
  const map: Record<string, string> = {
    dream11: "/Dream11.jpg",
    my11circle: "/My11Circle.jpg",
    jumbo: "/jumbo.jpg",
  };
  return map[slug] || "";
}
