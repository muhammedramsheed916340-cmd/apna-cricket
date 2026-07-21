"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Medal, ChevronRight } from "lucide-react";
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

export default function ViceCaptainPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [vcIds, setVcIds] = useState<string[]>([]);
  const [vcCount, setVcCount] = useState(3);

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

  const toggle = (p: Player) => {
    setVcIds((ids) => {
      if (ids.includes(p.id)) return ids.filter((x) => x !== p.id);
      if (ids.length >= vcCount) return ids;
      return [...ids, p.id];
    });
  };

  return (
    <MatchShell matchId={matchId || "loading"} active="vicecaptain">
      {/* Header */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Medal size={16} color="#8b5cf6" />
          Vice Captain Selection
        </div>
        <p style={subtitle}>
          Select 2 or more players for <b style={{ color: "#8b5cf6" }}>vice captain</b>.
          These will be used as the VC pool across generated teams.
        </p>

        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#e8eefc" }}>
          VC Count:{" "}
          <span style={{ color: "#8b5cf6" }}>
            {vcIds.length}/{vcCount}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[2, 3, 5, 8].map((n) => {
            const active = vcCount === n;
            return (
              <button
                key={n}
                onClick={() => setVcCount(n)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  border: active
                    ? "1px solid rgba(139,92,246,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active
                    ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.15))"
                    : "rgba(255,255,255,0.03)",
                  color: active ? "#8b5cf6" : "#8a94b3",
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
              const isVC = vcIds.includes(p.id);
              const teamBg = p.team === "left" ? "#06b6d4" : "#f43f5e";
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p)}
                  style={playerRow(isVC, "#8b5cf6")}
                >
                  <div style={avatar(isVC ? "#8b5cf6" : teamBg)}>
                    {isVC ? "🥈" : p.name.charAt(0)}
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
        <button onClick={() => setVcIds([])} style={resetBtn}>
          Reset
        </button>
        <button
          onClick={() => router.push(`/match/${matchId}/combination`)}
          style={primaryBtn(vcIds.length < 2)}
          disabled={vcIds.length < 2}
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </MatchShell>
  );
}
