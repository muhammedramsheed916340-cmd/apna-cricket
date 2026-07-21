"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { ROLE_LABELS } from "@/lib/players";

export interface GenTeam {
  team_number: number;
  players: { id: string; name: string; role: number; team: string; credits: number; selBy: number }[];
  captain: { id: string; name: string; role: number; selBy: number };
  vicecaptain: { id: string; name: string; role: number; selBy: number };
  wk: number;
  bat: number;
  ar: number;
  bowl: number;
  leftCount: number;
  rightCount: number;
  totalCredits: number;
  combination_label?: string;
}

const COMB_COLORS: Record<string, string> = {
  "1-4-3-3": "#34d399",
  "1-3-3-4": "#06b6d4",
  "1-3-4-3": "#8b5cf6",
  "1-4-2-4": "#f59e0b",
  "1-5-2-3": "#f43f5e",
  "1-3-2-5": "#ec4899",
  "2-3-2-4": "#14b8a6",
  "2-4-2-3": "#a78bfa",
  "2-3-3-3": "#fb923c",
};

export function TeamCard({ team }: { team: GenTeam }) {
  const [expanded, setExpanded] = useState(false);
  const combColor = team.combination_label ? COMB_COLORS[team.combination_label] || "#34d399" : "#34d399";

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        marginBottom: 8,
        overflow: "hidden",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 14px",
          cursor: "pointer",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#e8eefc" }}>
              Team #{team.team_number}
            </span>
            {team.combination_label && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: combColor,
                  background: `${combColor}20`,
                  border: `1px solid ${combColor}40`,
                  padding: "2px 7px",
                  borderRadius: 6,
                }}
              >
                {team.combination_label}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: "#8a94b3" }}>
            {ROLE_LABELS[0]}:{team.wk} · {ROLE_LABELS[1]}:{team.bat} ·{" "}
            {ROLE_LABELS[2]}:{team.ar} · {ROLE_LABELS[3]}:{team.bowl} | A:{team.leftCount} B:{team.rightCount}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <span
              style={{
                background: "rgba(245,158,11,0.15)",
                color: "#f59e0b",
                border: "1px solid rgba(245,158,11,0.3)",
                padding: "2px 7px",
                borderRadius: 5,
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              👑 {team.captain.name}
            </span>
            <span
              style={{
                background: "rgba(139,92,246,0.15)",
                color: "#a78bfa",
                border: "1px solid rgba(139,92,246,0.3)",
                padding: "2px 7px",
                borderRadius: 5,
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              🥈 {team.vicecaptain.name}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#34d399" }}>
            {team.totalCredits}
          </div>
          <div style={{ fontSize: 9, color: "#8a94b3" }}>credits</div>
          {expanded ? (
            <ChevronUp size={14} color="#8a94b3" />
          ) : (
            <ChevronDown size={14} color="#8a94b3" />
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 8 }}>
            {team.players.map((p) => {
              const isCap = p.id === team.captain.id;
              const isVc = p.id === team.vicecaptain.id;
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    padding: "5px 8px",
                    background: isCap
                      ? "rgba(245,158,11,0.1)"
                      : isVc
                      ? "rgba(139,92,246,0.1)"
                      : "rgba(255,255,255,0.03)",
                    borderRadius: 6,
                    border: isCap
                      ? "1px solid rgba(245,158,11,0.2)"
                      : isVc
                      ? "1px solid rgba(139,92,246,0.2)"
                      : "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <span style={{ color: "#b4bcd6", fontWeight: isCap || isVc ? 700 : 400 }}>
                    {isCap && "👑 "}{isVc && "🥈 "}{ROLE_LABELS[p.role]} · {p.name}
                  </span>
                  <span style={{ color: "#34d399", fontWeight: 700 }}>{p.credits}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ====== Combination Distribution Summary ======
export function ComboDistribution({ distribution }: { distribution: Record<string, number> }) {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (total === 0) return null;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(16,185,129,0.08), rgba(255,255,255,0.02))",
        border: "1px solid rgba(52,211,153,0.25)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: "#34d399", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <CheckCircle2 size={15} /> Combination Diversity ({entries.length} combos)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {entries.map(([label, n]) => {
          const pct = Math.round((n / total) * 100);
          const color = COMB_COLORS[label] || "#34d399";
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
              <span style={{ width: 55, fontWeight: 700, color }}>{label}</span>
              <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${color}, ${color}80)`,
                    borderRadius: 4,
                  }}
                />
              </div>
              <span style={{ width: 40, textAlign: "right", color: "#b4bcd6", fontWeight: 600 }}>
                {n} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
