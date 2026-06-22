"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, ChevronRight } from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { ROLE_LABELS, type Player } from "@/lib/players";

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
    <MatchShell matchId={matchId || "nz-sco-wt20"} active="vicecaptain">
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
          <Star size={16} /> Vice Captain Selection
        </h3>
        <p style={{ fontSize: 12, color: "#6c757d", marginBottom: 12 }}>
          Select 2 or more players for vice captain. These will be used as VC
          pool across generated teams.
        </p>

        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          VC Count: <span style={{ color: "#0066ff" }}>{vcIds.length}/{vcCount}</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {[2, 3, 5, 8].map((n) => (
            <button
              key={n}
              onClick={() => setVcCount(n)}
              style={{
                flex: 1,
                padding: "6px 0",
                border: vcCount === n ? "1px solid #0066ff" : "1px solid #ddd",
                background: vcCount === n ? "#0066ff" : "#fff",
                color: vcCount === n ? "#fff" : "#6c757d",
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
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "#6c757d", fontSize: 13 }}>
          Loading players…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {players
            .sort((a, b) => b.selBy - a.selBy)
            .map((p) => {
              const isVC = vcIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    background: isVC ? "#d4edda" : "#fff",
                    border: isVC ? "1px solid #28a745" : "1px solid #eee",
                    borderRadius: 6,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: isVC ? "#28a745" : p.team === "left" ? "#0066ff" : "#dc3545",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isVC ? "VC" : p.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#212529" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 10, color: "#6c757d" }}>
                      {ROLE_LABELS[p.role]} · Sel {p.selBy}%
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0066ff" }}>
                    {p.credits} cr
                  </div>
                </button>
              );
            })}
        </div>
      )}

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
          onClick={() => setVcIds([])}
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
          onClick={() => router.push(`/match/${matchId}/combination`)}
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
            opacity: vcIds.length < 2 ? 0.5 : 1,
          }}
          disabled={vcIds.length < 2}
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </MatchShell>
  );
}
