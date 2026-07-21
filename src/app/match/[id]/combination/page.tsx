"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, ChevronRight, Check } from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { storeCombinations } from "@/lib/teams-storage";
import {
  cardStyle,
  sectionTitle,
  subtitle,
  actionBar,
  resetBtn,
  primaryBtn,
} from "@/components/tg/match-styles";

// All 9 valid combinations — matches the diversity system in the API
const COMBINATIONS = [
  { label: "1-3-3-4", wk: 1, bat: 3, ar: 3, bowl: 4 },
  { label: "1-3-4-3", wk: 1, bat: 3, ar: 4, bowl: 3 },
  { label: "1-4-2-4", wk: 1, bat: 4, ar: 2, bowl: 4 },
  { label: "1-4-3-3", wk: 1, bat: 4, ar: 3, bowl: 3 },
  { label: "1-5-2-3", wk: 1, bat: 5, ar: 2, bowl: 3 },
  { label: "1-3-2-5", wk: 1, bat: 3, ar: 2, bowl: 5 },
  { label: "2-3-2-4", wk: 2, bat: 3, ar: 2, bowl: 4 },
  { label: "2-4-2-3", wk: 2, bat: 4, ar: 2, bowl: 3 },
  { label: "2-3-3-3", wk: 2, bat: 3, ar: 3, bowl: 3 },
];

const ROLE_TILE_COLORS = ["#06b6d4", "#34d399", "#f59e0b", "#f43f5e"]; // WK, BAT, AR, BOWL

export default function CombinationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  const [selected, setSelected] = useState<string[]>(["1-4-3-3"]);

  useEffect(() => {
    params.then((p) => setMatchId(p.id));
  }, [params]);

  const toggle = (label: string) => {
    setSelected((s) =>
      s.includes(label) ? s.filter((x) => x !== label) : [...s, label]
    );
  };

  return (
    <MatchShell matchId={matchId || "loading"} active="combination">
      {/* Header */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Layers size={16} color="#06b6d4" />
          Combination Selection
        </div>
        <p style={subtitle}>
          Select team combinations <b style={{ color: "#8a94b3" }}>(WK-BAT-AR-BOWL)</b>.
          Multiple combinations can be selected for varied team generation.
          AI enforces <b style={{ color: "#34d399" }}>max 30%</b> per combo for diversity.
        </p>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eefc" }}>
          Selected: <span style={{ color: "#34d399" }}>{selected.length}</span> / {COMBINATIONS.length}
        </div>
      </div>

      {/* Combination list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {COMBINATIONS.map((c) => {
          const isSel = selected.includes(c.label);
          return (
            <button
              key={c.label}
              onClick={() => toggle(c.label)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                background: isSel
                  ? "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.08))"
                  : "rgba(255,255,255,0.03)",
                border: isSel
                  ? "1px solid rgba(52,211,153,0.5)"
                  : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              {/* Checkbox */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  border: isSel ? "none" : "2px solid rgba(255,255,255,0.2)",
                  background: isSel
                    ? "linear-gradient(135deg, #34d399, #10b981)"
                    : "transparent",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#04130d",
                  boxShadow: isSel ? "0 4px 12px rgba(16,185,129,0.3)" : "none",
                }}
              >
                {isSel && <Check size={16} strokeWidth={3} />}
              </div>

              {/* Label + breakdown */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#e8eefc" }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 10, color: "#8a94b3", marginTop: 2 }}>
                  WK:{c.wk} · BAT:{c.bat} · AR:{c.ar} · BOWL:{c.bowl}
                </div>
              </div>

              {/* Role tiles */}
              <div style={{ display: "flex", gap: 5 }}>
                {[c.wk, c.bat, c.ar, c.bowl].map((n, i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${ROLE_TILE_COLORS[i]}25`,
                      border: `1px solid ${ROLE_TILE_COLORS[i]}55`,
                      color: ROLE_TILE_COLORS[i],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Action bar */}
      <div style={actionBar}>
        <button onClick={() => setSelected([])} style={resetBtn}>
          Reset
        </button>
        <button
          onClick={() => {
            const selectedCombs = COMBINATIONS.filter((c) => selected.includes(c.label));
            storeCombinations(matchId, selectedCombs);
            router.push(`/match/${matchId}/grand`);
          }}
          style={primaryBtn(selected.length < 1)}
          disabled={selected.length < 1}
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </MatchShell>
  );
}
