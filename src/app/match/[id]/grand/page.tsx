"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy, RefreshCw, ChevronRight } from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { ROLE_LABELS } from "@/lib/players";

const COMBINATIONS = [
  { label: "1-4-3-3", wk: 1, bat: 4, ar: 3, bowl: 3 },
  { label: "1-3-3-4", wk: 1, bat: 3, ar: 3, bowl: 4 },
  { label: "1-4-2-4", wk: 1, bat: 4, ar: 2, bowl: 4 },
  { label: "1-3-4-3", wk: 1, bat: 3, ar: 4, bowl: 3 },
  { label: "1-5-2-3", wk: 1, bat: 5, ar: 2, bowl: 3 },
  { label: "1-3-2-5", wk: 1, bat: 3, ar: 2, bowl: 5 },
];

interface GenTeam {
  team_number: number;
  players: { id: string; name: string; role: number; credits: number }[];
  captain: { name: string };
  vicecaptain: { name: string };
  wk: number;
  bat: number;
  ar: number;
  bowl: number;
  leftCount: number;
  rightCount: number;
  totalCredits: number;
}

export default function GrandPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  const [selectedComb, setSelectedComb] = useState(COMBINATIONS[0]);
  const [teamCount, setTeamCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<GenTeam[]>([]);

  useEffect(() => {
    params.then((p) => setMatchId(p.id));
  }, [params]);

  const generate = async () => {
    setLoading(true);
    setTeams([]);
    try {
      const res = await fetch("/api/generate-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          type: "grand",
          teamCount,
          combination: {
            wk: selectedComb.wk,
            bat: selectedComb.bat,
            ar: selectedComb.ar,
            bowl: selectedComb.bowl,
          },
        }),
      });
      const data = await res.json();
      if (data?.teams) setTeams(data.teams);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MatchShell matchId={matchId || "nz-sco-wt20"} active="grand">
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
          <Trophy size={16} /> Grand League Section
        </h3>
        <p style={{ fontSize: 12, color: "#6c757d", marginBottom: 12 }}>
          for Standard Grand League teams. Pick a combination &amp; generate.
        </p>

        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Combination (WK-BAT-AR-BOWL)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
          {COMBINATIONS.map((c) => {
            const active = selectedComb.label === c.label;
            return (
              <button
                key={c.label}
                onClick={() => setSelectedComb(c)}
                style={{
                  padding: "8px 4px",
                  border: active ? "1px solid #563d7c" : "1px solid #ddd",
                  background: active ? "#563d7c" : "#fff",
                  color: active ? "#fff" : "#6c757d",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {c.label}
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
              <Trophy size={16} /> Generate Grand League Teams
            </>
          )}
        </button>
      </div>

      {teams.length > 0 && (
        <div style={{ marginBottom: 12 }}>
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
              }}
            >
              <div
                style={{
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
            </div>
          ))}
        </div>
      )}
    </MatchShell>
  );
}
