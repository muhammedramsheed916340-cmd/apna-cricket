"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, ChevronRight } from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { ROLE_LABELS, type Player } from "@/lib/players";
import {
  cardStyle,
  sectionTitle,
  subtitle,
  playerRow,
  avatar,
  playerName,
  playerSub,
  creditsVal,
  creditsLabel,
  actionBar,
  resetBtn,
  primaryBtn,
  loadingStyle,
} from "@/components/tg/match-styles";

export default function CaptainPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [captainIds, setCaptainIds] = useState<string[]>([]);
  const [capCount, setCapCount] = useState(3);

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

  const toggleCaptain = (p: Player) => {
    setCaptainIds((ids) => {
      if (ids.includes(p.id)) return ids.filter((x) => x !== p.id);
      if (ids.length >= capCount) return ids;
      return [...ids, p.id];
    });
  };

  return (
    <MatchShell matchId={matchId || "loading"} active="captain">
      {/* Header */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Crown size={16} color="#f59e0b" />
          Captain Selection
        </div>
        <p style={subtitle}>
          Select 1 or more players for <b style={{ color: "#f59e0b" }}>captain</b>.
          These will be used as the captain pool across generated teams.
        </p>

        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#e8eefc" }}>
          Captain Count:{" "}
          <span style={{ color: "#f59e0b" }}>
            {captainIds.length}/{capCount}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 3, 5, 8].map((n) => {
            const active = capCount === n;
            return (
              <button
                key={n}
                onClick={() => setCapCount(n)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  border: active
                    ? "1px solid rgba(245,158,11,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active
                    ? "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.15))"
                    : "rgba(255,255,255,0.03)",
                  color: active ? "#f59e0b" : "#8a94b3",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* Player list */}
      {loading ? (
        <div style={loadingStyle}>Loading players…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {players
            .sort((a, b) => b.selBy - a.selBy)
            .map((p) => {
              const isCap = captainIds.includes(p.id);
              const teamBg = p.team === "left" ? "#06b6d4" : "#f43f5e";
              return (
                <button
                  key={p.id}
                  onClick={() => toggleCaptain(p)}
                  style={playerRow(isCap, "#f59e0b")}
                >
                  <div style={avatar(isCap ? "#f59e0b" : teamBg)}>
                    {isCap ? "👑" : p.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={playerName}>{p.name}</div>
                    <div style={playerSub}>
                      {ROLE_LABELS[p.role]} · Sel {p.selBy}%
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={creditsVal}>{p.credits}</div>
                    <div style={creditsLabel}>cr</div>
                  </div>
                </button>
              );
            })}
        </div>
      )}

      {/* Action bar */}
      <div style={actionBar}>
        <button onClick={() => setCaptainIds([])} style={resetBtn}>
          Reset
        </button>
        <button
          onClick={() => router.push(`/match/${matchId}/vicecaptain`)}
          style={primaryBtn(captainIds.length < 1)}
          disabled={captainIds.length < 1}
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </MatchShell>
  );
}
