"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, ChevronRight, Check } from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { storeCombinations } from "@/lib/teams-storage";

const COMBINATIONS = [
  { label: "1-4-3-3", wk: 1, bat: 4, ar: 3, bowl: 3 },
  { label: "1-3-3-4", wk: 1, bat: 3, ar: 3, bowl: 4 },
  { label: "1-4-2-4", wk: 1, bat: 4, ar: 2, bowl: 4 },
  { label: "1-3-4-3", wk: 1, bat: 3, ar: 4, bowl: 3 },
  { label: "1-5-2-3", wk: 1, bat: 5, ar: 2, bowl: 3 },
  { label: "1-3-2-5", wk: 1, bat: 3, ar: 2, bowl: 5 },
  { label: "1-4-4-2", wk: 1, bat: 4, ar: 4, bowl: 2 },
  { label: "1-2-4-4", wk: 1, bat: 2, ar: 4, bowl: 4 },
];

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
    <MatchShell matchId={matchId || "nz-sco-wt20"} active="combination">
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 14,
          marginBottom: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#563d7c",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Layers size={16} /> Combination Selection
        </h3>
        <p style={{ fontSize: 12, color: "#6c757d", marginBottom: 12 }}>
          Select team combinations (WK-BAT-AR-BOWL). Multiple combinations can be
          selected for varied team generation.
        </p>

        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Selected: <span style={{ color: "#563d7c" }}>{selected.length}</span>
        </div>
      </div>

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
                gap: 10,
                padding: "12px 14px",
                background: isSel ? "#f5f0fa" : "#fff",
                border: isSel ? "1px solid #563d7c" : "1px solid #eee",
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: isSel ? "none" : "2px solid #ccc",
                  background: isSel ? "#563d7c" : "transparent",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                {isSel && <Check size={14} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#212529" }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 10, color: "#6c757d" }}>
                  WK:{c.wk} · BAT:{c.bat} · AR:{c.ar} · BOWL:{c.bowl}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[c.wk, c.bat, c.ar, c.bowl].map((n, i) => (
                  <div
                    key={i}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: ["#17a2b8", "#28a745", "#ffc107", "#dc3545"][i],
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
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

      <div
        style={{
          position: "sticky",
          bottom: 60,
          background: "#fff",
          padding: 10,
          borderTop: "1px solid #eee",
          display: "flex",
          gap: 8,
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setSelected([])}
          style={{
            flex: 1,
            padding: "10px",
            border: "1px solid #ddd",
            background: "#fff",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "#6c757d",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
        <button
          onClick={() => {
            // Store selected combinations for the Grand page to use
            const selectedCombs = COMBINATIONS.filter((c) => selected.includes(c.label));
            storeCombinations(matchId, selectedCombs);
            router.push(`/match/${matchId}/grand`);
          }}
          className="btn-tg-primary"
          style={{
            flex: 2,
            padding: "10px",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            cursor: "pointer",
            opacity: selected.length < 1 ? 0.5 : 1,
          }}
          disabled={selected.length < 1}
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </MatchShell>
  );
}
