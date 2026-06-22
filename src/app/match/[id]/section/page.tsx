"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users, Coins, ChevronRight, Info } from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { ROLE_LABELS, ROLE_FULL, type Player } from "@/lib/players";

const ROLE_COLORS = ["#17a2b8", "#28a745", "#ffc107", "#dc3545"];
const ROLE_BG = ["#e3f7fa", "#e8f8ea", "#fff8e1", "#fdecee"];

export default function SectionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [matchId, setMatchId] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [combination, setCombination] = useState({ wk: 1, bat: 4, ar: 3, bowl: 3 });
  const [teamCount, setTeamCount] = useState(5);

  useEffect(() => {
    params.then((p) => setMatchId(p.id));
  }, [params]);

  useEffect(() => {
    if (!matchId) return;
    fetch(`/api/players?matchId=${matchId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.players) setPlayers(d.players);
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  const selectedPlayers = useMemo(
    () => players.filter((p) => selected[p.id]),
    [players, selected]
  );
  const creditsLeft = useMemo(
    () => parseFloat((100 - selectedPlayers.reduce((s, p) => s + p.credits, 0)).toFixed(1)),
    [selectedPlayers]
  );
  const counts = useMemo(() => {
    const c = [0, 0, 0, 0];
    selectedPlayers.forEach((p) => (c[p.role] += 1));
    return { wk: c[0], bat: c[1], ar: c[2], bowl: c[3] };
  }, [selectedPlayers]);
  const leftCount = selectedPlayers.filter((p) => p.team === "left").length;
  const rightCount = selectedPlayers.filter((p) => p.team === "right").length;

  const toggle = (p: Player) => {
    setSelected((s) => {
      const next = { ...s };
      if (next[p.id]) {
        delete next[p.id];
      } else {
        if (selectedPlayers.length >= 11) return s;
        next[p.id] = true;
      }
      return next;
    });
  };

  const continueToSmart = () => {
    if (selectedPlayers.length !== 11) {
      alert("Select exactly 11 players");
      return;
    }
    router.push(`/match/${matchId}/smart`);
  };

  if (!matchId) {
    return (
      <div className="tg-app">
        <div style={{ padding: 40, textAlign: "center", color: "#6c757d" }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <MatchShell matchId={matchId} active="section">
      {/* Top stats bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={statBox}>
          <Users size={14} color="#563d7c" />
          <div>
            <div style={statNum}>{selectedPlayers.length}/11</div>
            <div style={statLabel}>Players Selected</div>
          </div>
        </div>
        <div style={statBox}>
          <Coins size={14} color="#28a745" />
          <div>
            <div style={statNum}>{creditsLeft}</div>
            <div style={statLabel}>Credits Left</div>
          </div>
        </div>
        <div style={statBox}>
          <div>
            <div style={statNum}>{teamCount}</div>
            <div style={statLabel}>Team Count</div>
          </div>
        </div>
      </div>

      {/* Role count display */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 12,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {ROLE_LABELS.map((r, i) => (
          <div
            key={r}
            style={{
              flex: 1,
              background: ROLE_BG[i],
              color: ROLE_COLORS[i],
              padding: "6px 4px",
              borderRadius: 6,
              textAlign: "center",
            }}
          >
            {r}: {counts[
              i === 0 ? "wk" : i === 1 ? "bat" : i === 2 ? "ar" : "bowl"
            ]}
          </div>
        ))}
      </div>

      {/* Team split */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
          fontSize: 12,
          padding: "6px 10px",
          background: "#fff",
          borderRadius: 6,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <span>Left: <strong>{leftCount}</strong></span>
        <span>Right: <strong>{rightCount}</strong></span>
      </div>

      {/* Team count selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          padding: "8px 10px",
          background: "#fff",
          borderRadius: 6,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <label style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Team Count</label>
        <select
          value={teamCount}
          onChange={(e) => setTeamCount(parseInt(e.target.value, 10))}
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            border: "1px solid #ddd",
            fontSize: 13,
          }}
        >
          {[1, 2, 5, 10, 15, 20].map((n) => (
            <option key={n} value={n}>
              {n} teams
            </option>
          ))}
        </select>
      </div>

      {/* Players by role */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "#6c757d", fontSize: 13 }}>
          Loading players…
        </div>
      ) : (
        ROLE_LABELS.map((role, ri) => {
          const rolePlayers = players.filter((p) => p.role === ri);
          return (
            <div key={role} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 4px",
                  borderBottom: `2px solid ${ROLE_COLORS[ri]}`,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: ROLE_COLORS[ri] }}>
                  {ROLE_FULL[ri]} ({role})
                </span>
                <span style={{ fontSize: 11, color: "#6c757d" }}>
                  {rolePlayers.length} players
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {rolePlayers.map((p) => {
                  const isSel = !!selected[p.id];
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        background: isSel ? ROLE_BG[ri] : "#fff",
                        border: isSel
                          ? `1px solid ${ROLE_COLORS[ri]}`
                          : "1px solid #eee",
                        borderRadius: 6,
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 13,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: p.team === "left" ? "#563d7c" : "#dc3545",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#212529",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#6c757d" }}>
                          {p.team === "left" ? "Team A" : "Team B"} · Sel {p.selBy}%
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#563d7c",
                            fontSize: 13,
                          }}
                        >
                          {p.credits}
                        </div>
                        <div style={{ fontSize: 9, color: "#999" }}>cr</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Bottom action bar */}
      <div
        style={{
          position: "sticky",
          bottom: 60,
          left: 0,
          right: 0,
          background: "#fff",
          padding: "10px",
          borderTop: "1px solid #eee",
          display: "flex",
          gap: 8,
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setSelected({})}
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
          onClick={continueToSmart}
          className="btn-tg-success"
          style={{
            flex: 2,
            padding: "10px",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            cursor: "pointer",
          }}
          disabled={selectedPlayers.length !== 11}
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </MatchShell>
  );
}

const statBox: React.CSSProperties = {
  flex: 1,
  background: "#fff",
  borderRadius: 6,
  padding: "8px 10px",
  display: "flex",
  alignItems: "center",
  gap: 6,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};
const statNum: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "#212529",
  lineHeight: 1,
};
const statLabel: React.CSSProperties = {
  fontSize: 9,
  color: "#6c757d",
  marginTop: 2,
};
