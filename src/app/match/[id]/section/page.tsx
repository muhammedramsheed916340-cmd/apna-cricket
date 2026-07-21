"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users, Coins, ChevronRight, CheckCircle2, Layers } from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { ROLE_LABELS, ROLE_FULL, type Player } from "@/lib/players";
import { storePlayerPool } from "@/lib/teams-storage";
import {
  cardStyle,
  sectionTitle,
  subtitle,
  statBox,
  statNum,
  statLabel,
  playerRow,
  avatar,
  playerName,
  playerSub,
  creditsVal,
  creditsLabel,
  actionBar,
  resetBtn,
  primaryBtn,
  ROLE_COLORS,
  loadingStyle,
} from "@/components/tg/match-styles";

export default function SectionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [matchId, setMatchId] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [teamCount, setTeamCount] = useState(5);
  const [lineupOut, setLineupOut] = useState(false);

  useEffect(() => {
    params.then((p) => setMatchId(p.id));
  }, [params]);

  useEffect(() => {
    if (!matchId) return;
    fetch(`/api/players?matchId=${matchId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.players) {
          setPlayers(d.players);
          setLineupOut(!!d.lineupOut);
          if (d.lineupOut) {
            const autoSel: Record<string, boolean> = {};
            d.players.forEach((p: any) => {
              autoSel[p.id] = true;
            });
            setSelected(autoSel);
          }
        }
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
    storePlayerPool(matchId, selectedPlayers);
    router.push(`/match/${matchId}/smart`);
  };

  if (!matchId) {
    return (
      <div className="ac-app">
        <div style={loadingStyle}>Loading…</div>
      </div>
    );
  }

  return (
    <MatchShell matchId={matchId} active="section">
      {/* Lineup status banner */}
      {lineupOut && (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))",
            border: "1px solid rgba(52,211,153,0.4)",
            color: "#34d399",
            padding: "10px 14px",
            borderRadius: 12,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={16} />
          LINEUPS OUT — STRICT MODE: Only {players.length} Playing XI players shown. Bench/substitute/reserve/injured HIDDEN.
        </div>
      )}

      {/* Header */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Layers size={16} color="#34d399" />
          Player Selection
        </div>
        <p style={subtitle}>
          Select exactly <b style={{ color: "#34d399" }}>11 players</b> from the playing XI.
          These form the pool for AI team generation.
        </p>
      </div>

      {/* Top stats bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={statBox}>
          <Users size={16} color="#06b6d4" />
          <div>
            <div style={statNum}>{selectedPlayers.length}/11</div>
            <div style={statLabel}>Players</div>
          </div>
        </div>
        <div style={statBox}>
          <Coins size={16} color="#34d399" />
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
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {ROLE_LABELS.map((r, i) => {
          const count = counts[i === 0 ? "wk" : i === 1 ? "bat" : i === 2 ? "ar" : "bowl"];
          return (
            <div
              key={r}
              style={{
                flex: 1,
                background: `${ROLE_COLORS[i]}1A`,
                border: `1px solid ${ROLE_COLORS[i]}44`,
                color: ROLE_COLORS[i],
                padding: "8px 4px",
                borderRadius: 10,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800 }}>{count}</div>
              <div style={{ fontSize: 9, opacity: 0.8 }}>{r}</div>
            </div>
          );
        })}
      </div>

      {/* Team split */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
          fontSize: 12,
          fontWeight: 600,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
        }}
      >
        <span style={{ color: "#8a94b3" }}>
          Team A: <strong style={{ color: "#06b6d4" }}>{leftCount}</strong>
        </span>
        <span style={{ color: "#8a94b3" }}>
          Team B: <strong style={{ color: "#f43f5e" }}>{rightCount}</strong>
        </span>
      </div>

      {/* Team count selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
        }}
      >
        <label style={{ fontSize: 13, fontWeight: 700, flex: 1, color: "#e8eefc" }}>
          Team Count
        </label>
        <select
          value={teamCount}
          onChange={(e) => setTeamCount(parseInt(e.target.value, 10))}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: "#0d1428",
            color: "#e8eefc",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 13,
            fontWeight: 700,
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
        <div style={loadingStyle}>Loading players…</div>
      ) : (
        ROLE_LABELS.map((role, ri) => {
          const rolePlayers = players.filter((p) => p.role === ri);
          const roleColor = ROLE_COLORS[ri];
          return (
            <div key={role} style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 4px",
                  borderBottom: `2px solid ${roleColor}`,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: roleColor }}>
                  {ROLE_FULL[ri]} ({role})
                </span>
                <span style={{ fontSize: 11, color: "#8a94b3" }}>
                  {rolePlayers.length} players
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rolePlayers.map((p) => {
                  const isSel = !!selected[p.id];
                  const teamBg = p.team === "left" ? "#06b6d4" : "#f43f5e";
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p)}
                      style={{
                        ...playerRow(isSel, roleColor),
                        opacity: (p as any).playing === false ? 0.5 : 1,
                      }}
                    >
                      <div style={avatar(isSel ? roleColor : teamBg)}>
                        {isSel ? "✓" : p.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={playerName}>{p.name}</div>
                        <div style={playerSub}>
                          {p.team === "left" ? "Team A" : "Team B"} · Sel {p.selBy}%
                          {(p as any).playing === true && (
                            <span style={{ color: "#34d399", fontWeight: 700 }}> · ✅ Playing</span>
                          )}
                          {(p as any).playing === false && (
                            <span style={{ color: "#f43f5e", fontWeight: 700 }}> · ❌ Bench</span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={creditsVal}>{p.credits}</div>
                        <div style={creditsLabel}>cr</div>
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
      <div style={actionBar}>
        <button onClick={() => setSelected({})} style={resetBtn}>
          Reset
        </button>
        <button
          onClick={continueToSmart}
          style={primaryBtn(selectedPlayers.length !== 11)}
          disabled={selectedPlayers.length !== 11}
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </MatchShell>
  );
}
