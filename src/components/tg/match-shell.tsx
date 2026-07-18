"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, RefreshCw, Clock } from "lucide-react";
import { SideNav } from "./side-nav";
import { BottomNav } from "./bottom-nav";
import { AdminTrigger } from "@/components/admin/AdminTrigger";
import { LicenseGate } from "@/components/admin/LicenseGate";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [match, setMatch] = useState<Match | undefined>(() =>
    CRICKET_MATCHES.find((m) => m.id === matchId)
  );
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    fetch("/api/matches", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.length) {
          const found = d.data.find((m: Match) => m.id === matchId);
          if (found) setMatch(found);
        }
      })
      .catch(() => {});
  }, [matchId]);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const m: Match = match || {
    id: matchId,
    series: "Loading...",
    sport: "cricket",
    leftTeam: { name: "", flag: "" },
    rightTeam: { name: "", flag: "" },
    badges: [],
    targetTime: 0,
  };

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
    <div className="ac-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />

      <header className="ac-header">
        <button
          type="button"
          className="ac-icon-btn"
          onClick={() => router.push("/")}
          aria-label="Back to home"
        >
          <ChevronLeft size={20} />
        </button>
        <AdminTrigger>
          <img
            className="ac-logo"
            alt="Apna Cricket logo"
            src="/apna_cricket_logo.png"
          />
        </AdminTrigger>
        <button
          type="button"
          className="ac-icon-btn"
          onClick={() => window.location.reload()}
          aria-label="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </header>

      {/* Match info bar */}
      <div
        style={{
          background: "rgba(10, 16, 36, 0.6)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#34d399",
              letterSpacing: "0.02em",
            }}
          >
            {m.series}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 9px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              color: "#34d399",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Clock size={11} />
            {mounted ? formatCountdown(m.targetTime, now) : "—"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
            }}
          >
            {m.leftTeam.flag ? (
              <img
                alt="left"
                src={m.leftTeam.flag}
                style={{
                  width: 40,
                  height: 40,
                  objectFit: "contain",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  padding: 3,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            ) : null}
            <strong style={{ fontSize: 15, color: "#e8eefc" }}>
              {m.leftTeam.name}
            </strong>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.18em",
              color: "#8a94b3",
            }}
          >
            VS
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
              justifyContent: "flex-end",
            }}
          >
            <strong style={{ fontSize: 15, color: "#e8eefc" }}>
              {m.rightTeam.name}
            </strong>
            {m.rightTeam.flag ? (
              <img
                alt="right"
                src={m.rightTeam.flag}
                style={{
                  width: 40,
                  height: 40,
                  objectFit: "contain",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  padding: 3,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div
        className="ac-scroll"
        style={{
          display: "flex",
          overflowX: "auto",
          gap: 6,
          padding: "10px 12px",
          background: "rgba(5,8,22,0.5)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          position: "sticky",
          top: 68,
          zIndex: 35,
        }}
      >
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => router.push(`/match/${matchId}/${t.id}`)}
              style={{
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: isActive ? "#04130d" : "#8a94b3",
                background: isActive
                  ? "linear-gradient(135deg, #34d399, #10b981)"
                  : "rgba(255,255,255,0.04)",
                border: isActive
                  ? "1px solid rgba(52,211,153,0.5)"
                  : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 999,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: isActive
                  ? "0 4px 12px rgba(16,185,129,0.3)"
                  : "none",
                transition: "all 0.2s ease",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <main style={{ padding: "14px 14px 16px", minHeight: 400, flex: 1 }}>
        <LicenseGate>{children}</LicenseGate>
      </main>

      <BottomNav />
    </div>
  );
}
