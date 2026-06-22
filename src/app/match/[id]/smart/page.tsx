"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, RefreshCw, Download, ChevronRight } from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { ROLE_LABELS } from "@/lib/players";
import { storeTeams } from "@/lib/teams-storage";

const STRATEGIES = [
  { id: "batting", label: "Batting", desc: "More batsmen focus" },
  { id: "bowling", label: "Bowling", desc: "More bowlers focus" },
  { id: "balanced", label: "Balanced", desc: "Equal mix" },
];

interface GenTeam {
  team_number: number;
  players: { id: string; name: string; role: number; team: string; credits: number; selBy: number }[];
  captain: { id: string; name: string };
  vicecaptain: { id: string; name: string };
  wk: number;
  bat: number;
  ar: number;
  bowl: number;
  leftCount: number;
  rightCount: number;
  totalCredits: number;
}

export default function SmartPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  const [strategy, setStrategy] = useState<string[]>(["balanced"]);
  const [teamCount, setTeamCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<GenTeam[]>([]);

  useEffect(() => {
    params.then((p) => setMatchId(p.id));
  }, [params]);

  const toggleStrategy = (id: string) => {
    setStrategy((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  };

  const generate = async () => {
    setLoading(true);
    setTeams([]);
    try {
      const comb =
        strategy[0] === "batting"
          ? { wk: 1, bat: 5, ar: 2, bowl: 3 }
          : strategy[0] === "bowling"
          ? { wk: 1, bat: 3, ar: 2, bowl: 5 }
          : { wk: 1, bat: 4, ar: 3, bowl: 3 };
      const res = await fetch("/api/generate-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          type: "smart",
          teamCount,
          combination: comb,
        }),
      });
      const data = await res.json();
      if (data?.teams) {
        setTeams(data.teams);
        // Persist generated teams to localStorage for the transfer step
        storeTeams(matchId, "smart", data.teams);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MatchShell matchId={matchId || "nz-sco-wt20"} active="smart">
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
            color: "#0066ff",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Zap size={16} /> Smart Generation Section
        </h3>
        <p style={{ fontSize: 12, color: "#6c757d", marginBottom: 12 }}>
          for Risky Grand League teams. Select a strategy and generate.
        </p>

        {/* Strategy selector */}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Strategy</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {STRATEGIES.map((s) => {
            const active = strategy.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleStrategy(s.id)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  border: active ? "1px solid #0066ff" : "1px solid #ddd",
                  background: active ? "#0066ff" : "#fff",
                  color: active ? "#fff" : "#6c757d",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Team count */}
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
                border: teamCount === n ? "1px solid #0066ff" : "1px solid #ddd",
                background: teamCount === n ? "#0066ff" : "#fff",
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
            style={{ flex: 1, accentColor: "#0066ff" }}
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
              <Zap size={16} /> Generate Teams
            </>
          )}
        </button>
      </div>

      {/* Generated teams */}
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
            <TeamCard key={t.team_number} team={t} />
          ))}
        </div>
      )}
    </MatchShell>
  );
}

function TeamCard({ team }: { team: GenTeam }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        marginBottom: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 12px",
          cursor: "pointer",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#212529" }}>
            Team #{team.team_number}
          </div>
          <div style={{ fontSize: 10, color: "#6c757d" }}>
            {ROLE_LABELS[0]}:{team.wk} · {ROLE_LABELS[1]}:{team.bat} ·{" "}
            {ROLE_LABELS[2]}:{team.ar} · {ROLE_LABELS[3]}:{team.bowl} | A:{team.leftCount} B:{team.rightCount}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0066ff" }}>
            {team.totalCredits}
          </div>
          <div style={{ fontSize: 9, color: "#999" }}>credits</div>
        </div>
      </div>
      {expanded && (
        <div
          style={{
            padding: "0 12px 12px",
            borderTop: "1px solid #eee",
          }}
        >
          <div style={{ display: "flex", gap: 6, margin: "8px 0", fontSize: 11 }}>
            <span
              style={{
                background: "#fff3cd",
                color: "#856404",
                padding: "2px 6px",
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              C: {team.captain.name}
            </span>
            <span
              style={{
                background: "#d4edda",
                color: "#155724",
                padding: "2px 6px",
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              VC: {team.vicecaptain.name}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 4,
            }}
          >
            {team.players.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  padding: "4px 6px",
                  background: "#f8f9fa",
                  borderRadius: 4,
                }}
              >
                <span>
                  {ROLE_LABELS[p.role]} · {p.name}
                </span>
                <span style={{ color: "#0066ff", fontWeight: 600 }}>
                  {p.credits}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
