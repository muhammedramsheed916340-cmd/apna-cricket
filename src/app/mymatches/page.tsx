"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Home, Clock, ChevronRight } from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";
import { useAuth } from "@/components/tg/auth-provider";
import { CRICKET_MATCHES, type Match } from "@/lib/matches";
import { MatchCard } from "@/components/tg/match-card";

export default function MyMatchesPage() {
  const router = useRouter();
  const { user, authChecked } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>(CRICKET_MATCHES);

  useEffect(() => {
    if (authChecked && !user) {
      router.replace("/login?redirect=/mymatches");
    }
  }, [authChecked, user, router]);

  useEffect(() => {
    fetch("/api/matches", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.length) setMatches(d.data);
      })
      .catch(() => {});
  }, []);

  if (authChecked && !user) {
    return (
      <div className="tg-app">
        <div style={{ padding: 40, textAlign: "center", color: "#6c757d" }}>
          Redirecting to login…
        </div>
      </div>
    );
  }

  return (
    <div className="tg-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <nav className="tg-header" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Menu
          size={32}
          className="text-white"
          style={{ marginLeft: 5, cursor: "pointer" }}
          onClick={() => setMenuOpen(true)}
        />
        <span className="navbar-brand mb-0 text-center">
          <img className="tg-logo" alt="tg logo" src="/tg_dark_logo.png" />
        </span>
        <Home
          size={28}
          className="text-white"
          style={{ marginRight: 8, cursor: "pointer" }}
          onClick={() => router.push("/")}
        />
      </nav>

      <main style={{ padding: "12px 10px 24px" }}>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: "#212529", margin: "8px 0 12px" }}>
          My Matches
        </h4>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
        <a
          href="/savedmatches"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fff",
            borderRadius: 8,
            padding: "12px 14px",
            marginTop: 8,
            textDecoration: "none",
            color: "#212529",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={18} color="#28a745" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Saved Matches</span>
          </span>
          <ChevronRight size={16} color="#6c757d" />
        </a>
      </main>

      <BottomNav active="mymatches" />
    </div>
  );
}
