"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History, PlusSquare, Flame } from "lucide-react";
import { Header } from "@/components/tg/header";
import { TopNav } from "@/components/tg/top-nav";
import { BottomNav } from "@/components/tg/bottom-nav";
import { SideNav } from "@/components/tg/side-nav";
import { BannerCarousel } from "@/components/tg/banner-carousel";
import { MatchCard } from "@/components/tg/match-card";
import type { Match } from "@/lib/matches";
import { CRICKET_MATCHES } from "@/lib/matches";

export default function HomePage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sport, setSport] = useState("cricket");
  const [matches, setMatches] = useState<Match[]>(CRICKET_MATCHES);

  useEffect(() => {
    let alive = true;
    const fetchMatches = async () => {
      try {
        const res = await fetch("/api/matches", { cache: "no-store" });
        const json = await res.json();
        if (alive && json?.data?.length) {
          setMatches(json.data);
        }
      } catch {
        // keep existing data as fallback
      }
    };
    fetchMatches();
    // Silent auto-refresh every 5 minutes (no loading state, no blank page)
    const interval = setInterval(fetchMatches, 5 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [sport]);

  return (
    <div className="ac-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Header onMenuClick={() => setMenuOpen(true)} />
      <TopNav active={sport} onChange={setSport} />

      <main
        style={{
          padding: "8px 14px 8px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <BannerCarousel />

        <div className="ac-section-title">
          <h4>
            <span className="ac-live-dot" aria-hidden="true" />
            Upcoming Matches
          </h4>
          <button
            type="button"
            className="ac-link-btn"
            onClick={() => router.push("/savedmatches")}
          >
            <History size={13} />
            Saved
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
          {matches.length === 0 && (
            <div className="ac-empty">
              <div className="ac-empty-icon">
                <PlusSquare size={26} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                No upcoming matches
              </div>
              <div style={{ fontSize: 12 }}>
                {sport} matches will appear here soon.
              </div>
            </div>
          )}
        </div>

        <div className="ac-credits">
          <div style={{ marginBottom: 4 }}>
            <Flame size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Crafted for fantasy cricket champions
          </div>
          <div>
            © 2025 <b>Apna Cricket</b> · All Rights Reserved
          </div>
        </div>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
