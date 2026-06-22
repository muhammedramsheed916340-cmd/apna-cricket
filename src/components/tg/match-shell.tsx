"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu, RefreshCw, ChevronLeft } from "lucide-react";
import { SideNav } from "./side-nav";
import { BottomNav } from "./bottom-nav";
import { useAuth } from "./auth-provider";
import type { Match } from "@/lib/matches";
import { formatCountdown } from "@/lib/matches";
import { CRICKET_MATCHES } from "@/lib/matches";

export function MatchShell({
  matchId,
  active,
  children,
}: {
  matchId: string;
  active: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, authChecked } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [match, setMatch] = useState<Match | undefined>(() =>
    CRICKET_MATCHES.find((m) => m.id === matchId)
  );
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Auto-login bypass: user is always authenticated. No login redirect.
  }, [authChecked, user, matchId, active, router]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!authChecked) {
    return (
      <div className="tg-app">
        <div style={{ padding: 40, textAlign: "center", color: "#6c757d" }}>
          Loading…
        </div>
      </div>
    );
  }

  // Even if user object is briefly null during auto-login, render the page.
  // The session is created automatically by AuthProvider.

  const m = match || CRICKET_MATCHES[0];
  const tabs = [
    { id: "section", label: "Section" },
    { id: "smart", label: "Smart" },
    { id: "grand", label: "Grand" },
    { id: "advanced", label: "Advanced" },
    { id: "captain", label: "Captain" },
    { id: "vicecaptain", label: "VC" },
    { id: "combination", label: "Combination" },
    { id: "transfer", label: "Transfer" },
  ];

  return (
    <div className="tg-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <nav
        className="tg-header"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <ChevronLeft
          size={30}
          className="text-white"
          style={{ marginLeft: 4, cursor: "pointer" }}
          onClick={() => router.push("/")}
        />
        <span className="navbar-brand mb-0 text-center">
          <img className="tg-logo" alt="tg logo" src="/tg_dark_logo.png" />
        </span>
        <RefreshCw
          size={28}
          className="text-white"
          style={{ marginRight: 8, cursor: "pointer" }}
          onClick={() => router.refresh()}
        />
      </nav>

      {/* Match info bar */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #eee",
          padding: "8px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "#6c757d",
            marginBottom: 4,
          }}
        >
          <span style={{ fontWeight: 600, color: "#212529" }}>{m.series}</span>
          <span>{formatCountdown(m.targetTime, now)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <img
              className="team-image"
              alt="left"
              src={m.leftTeam.flag}
              style={{ width: 40, height: 28 }}
            />
            <strong style={{ fontSize: 14 }}>{m.leftTeam.name}</strong>
          </div>
          <span style={{ fontSize: 11, color: "#999" }}>vs</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <strong style={{ fontSize: 14 }}>{m.rightTeam.name}</strong>
            <img
              className="team-image"
              alt="right"
              src={m.rightTeam.flag}
              style={{ width: 40, height: 28 }}
            />
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div
        className="tg-scroll"
        style={{
          display: "flex",
          overflowX: "auto",
          background: "#fff",
          borderBottom: "1px solid #eee",
          padding: "0 4px",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => router.push(`/match/${matchId}/${t.id}`)}
            style={{
              padding: "10px 12px",
              fontSize: 12,
              fontWeight: active === t.id ? 700 : 500,
              color: active === t.id ? "#563d7c" : "#6c757d",
              borderBottom: active === t.id ? "2px solid #563d7c" : "2px solid transparent",
              background: "none",
              border: "none",
              borderBottomWidth: 2,
              borderBottomStyle: "solid",
              borderBottomColor: active === t.id ? "#563d7c" : "transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main style={{ padding: "12px 10px 80px", minHeight: 400 }}>{children}</main>

      <BottomNav />
    </div>
  );
}
