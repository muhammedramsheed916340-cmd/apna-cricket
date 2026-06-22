"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Home, Trash2, Star } from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";
import { useAuth } from "@/components/tg/auth-provider";
import { type Match } from "@/lib/matches";
import { formatCountdown } from "@/lib/matches";

export default function SavedMatchesPage() {
  const router = useRouter();
  const { user, authChecked } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState<Match[]>([]);

  useEffect(() => {
    // Auto-login bypass: always authenticated. No login redirect.
  }, [authChecked, user, router]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tg_saved_matches") || "[]";
      setSaved(JSON.parse(raw));
    } catch {
      setSaved([]);
    }
  }, []);

  const remove = (id: string) => {
    const next = saved.filter((m) => m.id !== id);
    setSaved(next);
    localStorage.setItem("tg_saved_matches", JSON.stringify(next));
  };

  if (!authChecked) {
    return (
      <div className="tg-app">
        <div style={{ padding: 40, textAlign: "center", color: "#6c757d" }}>
          Loading…
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
          Saved Matches ({saved.length})
        </h4>
        {saved.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "#6c757d",
              fontSize: 13,
            }}
          >
            <Star size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div>No saved matches yet</div>
            <button
              onClick={() => router.push("/")}
              className="btn-tg-primary"
              style={{
                marginTop: 12,
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Browse Matches
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {saved.map((m) => (
              <div
                key={m.id}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: "10px 12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  onClick={() => router.push(`/match/${m.id}/section`)}
                  style={{ flex: 1, cursor: "pointer" }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#212529" }}>
                    {m.series}
                  </div>
                  <div style={{ fontSize: 11, color: "#6c757d", marginTop: 2 }}>
                    {m.leftTeam.name} vs {m.rightTeam.name}
                  </div>
                  <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                    {formatCountdown(m.targetTime, Date.now())}
                  </div>
                </div>
                <button
                  onClick={() => remove(m.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 6,
                    color: "#dc3545",
                  }}
                  aria-label="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav active="mymatches" />
    </div>
  );
}
