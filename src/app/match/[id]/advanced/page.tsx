"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, RefreshCw, ChevronRight, SlidersHorizontal } from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { ROLE_LABELS } from "@/lib/players";

const ADVANCED_FILTERS = [
  { id: "form", label: "In-Form Players", desc: "High recent selection %" },
  { id: "differential", label: "Differential Picks", desc: "Low selection %" },
  { id: "captain_pace", label: "Captain from Pace Bowler", desc: "Pace bias" },
  { id: "captain_spin", label: "Captain from Spin Bowler", desc: "Spin bias" },
  { id: "winning", label: "Captain from Winning Team", desc: "Win bias" },
  { id: "equal", label: "Captain Equal Distribution", desc: "Balanced C/VC" },
];

export default function AdvancedPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  const [filters, setFilters] = useState<string[]>(["form"]);
  const [teamCount, setTeamCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    params.then((p) => setMatchId(p.id));
  }, [params]);

  const toggle = (id: string) =>
    setFilters((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const generate = async () => {
    setLoading(true);
    setTeams([]);
    try {
      const res = await fetch("/api/generate-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          type: "advanced",
          teamCount,
          combination: { wk: 1, bat: 4, ar: 3, bowl: 3 },
        }),
      });
      const data = await res.json();
      if (data?.teams) setTeams(data.teams);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MatchShell matchId={matchId || "nz-sco-wt20"} active="advanced">
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
          <Sparkles size={16} /> Advanced Generation Section
        </h3>
        <p style={{ fontSize: 12, color: "#6c757d", marginBottom: 12 }}>
          for more powerful teams with advanced filters.
        </p>

        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <SlidersHorizontal size={12} /> Advanced Filters
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {ADVANCED_FILTERS.map((f) => {
            const active = filters.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggle(f.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  border: active ? "1px solid #563d7c" : "1px solid #ddd",
                  background: active ? "#f5f0fa" : "#fff",
                  borderRadius: 6,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: active ? "none" : "1px solid #ccc",
                    background: active ? "#563d7c" : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 10,
                  }}
                >
                  {active ? "✓" : ""}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#212529" }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: 10, color: "#6c757d" }}>{f.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Team Count (0-500)
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {[5, 10, 20, 40, 100].map((n) => (
            <button
              key={n}
              onClick={() => setTeamCount(n)}
              style={{
                flex: 1,
                padding: "6px 0",
                border: teamCount === n ? "1px solid #563d7c" : "1px solid #ddd",
                background: teamCount === n ? "#563d7c" : "#fff",
                color: teamCount === n ? "#fff" : "#6c757d",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <input
            type="range"
            min={0}
            max={500}
            value={teamCount}
            onChange={(e) => setTeamCount(parseInt(e.target.value, 10))}
            style={{ flex: 1, accentColor: "#563d7c" }}
          />
          <input
            type="number"
            min={0}
            max={500}
            value={teamCount}
            onChange={(e) =>
              setTeamCount(Math.max(0, Math.min(parseInt(e.target.value, 10) || 0, 500)))
            }
            style={{
              width: 60,
              padding: "4px 6px",
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              textAlign: "center",
            }}
          />
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="btn-tg-success"
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles size={16} /> Generate Advanced Teams
            </>
          )}
        </button>
      </div>

      {teams.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
              Generated Teams ({teams.length})
            </h4>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={generate}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #ddd",
                  background: "#fff",
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <RefreshCw size={12} /> Regen
              </button>
              <button
                onClick={() => router.push(`/match/${matchId}/transfer`)}
                className="btn-tg-primary"
                style={{
                  padding: "4px 8px",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 11,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Transfer <ChevronRight size={12} />
              </button>
            </div>
          </div>
          {teams.map((t) => (
            <div
              key={t.team_number}
              style={{
                background: "#fff",
                borderRadius: 8,
                marginBottom: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                padding: "10px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#212529" }}>
                  Team #{t.team_number}
                </div>
                <div style={{ fontSize: 10, color: "#6c757d" }}>
                  {ROLE_LABELS[0]}:{t.wk} · {ROLE_LABELS[1]}:{t.bat} · {ROLE_LABELS[2]}:{t.ar} · {ROLE_LABELS[3]}:{t.bowl} | A:{t.leftCount} B:{t.rightCount}
                </div>
                <div style={{ fontSize: 10, marginTop: 4 }}>
                  <span style={{ background: "#fff3cd", color: "#856404", padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>C: {t.captain.name}</span>{" "}
                  <span style={{ background: "#d4edda", color: "#155724", padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>VC: {t.vicecaptain.name}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#563d7c" }}>
                  {t.totalCredits}
                </div>
                <div style={{ fontSize: 9, color: "#999" }}>credits</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </MatchShell>
  );
}
