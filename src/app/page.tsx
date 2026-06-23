"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History, PlusSquare } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/matches", { cache: "no-store" });
        const json = await res.json();
        if (alive && json?.data?.length) {
          setMatches(json.data);
        }
      } catch {
        // keep captured real data as fallback
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sport]);

  return (
    <div className="tg-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Header onMenuClick={() => setMenuOpen(true)} />
      <TopNav active={sport} onChange={setSport} />

      <main style={{ padding: "8px 10px 24px" }}>
        <BannerCarousel />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 4px",
          }}
        >
          <h4
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#212529",
              margin: 0,
            }}
          >
            Upcoming Matches
          </h4>
          <button
            type="button"
            className="btn-tg-success"
            style={{
              fontWeight: 400,
              fontSize: 12,
              padding: "4px 8px",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => router.push("/login")}
          >
            <History size={14} />
            <span>Saved Matches</span>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 20, color: "#6c757d", fontSize: 13 }}>
              Loading matches…
            </div>
          )}
          {!loading &&
            matches.map((m) => <MatchCard key={m.id} match={m} />)}
          {!loading && matches.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 30,
                color: "#6c757d",
                fontSize: 13,
              }}
            >
              <PlusSquare size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div>No upcoming matches for {sport}</div>
            </div>
          )}
        </div>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
