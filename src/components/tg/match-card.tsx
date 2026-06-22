"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Save, List } from "lucide-react";
import { formatCountdown, type Match } from "@/lib/matches";

export function MatchCard({ match }: { match: Match }) {
  const router = useRouter();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const badgeClass = (b: string) => {
    if (b === "Mega GL") return "badge badge-outline-success";
    if (b === "SL") return "badge badge-outline-warning";
    return "badge badge-outline-danger";
  };

  return (
    <div className="match-card">
      <div>
        <div
          className="d-flex justify-content-between border-bottom"
          style={{ marginLeft: 10, marginRight: 10, padding: "8px 0" }}
        >
          <div className="d-flex align-items-center" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Star size={18} className="vp-blink" />
            <span className="series-name">{match.series}</span>
          </div>
          <span className="lineups" />
        </div>
        <div
          className="card-middle"
          style={{
            marginLeft: 10,
            marginRight: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
          }}
        >
          <div className="combine-image" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <img className="team-image" alt="left" src={match.leftTeam.flag} />
            <span className="left-team-name">{match.leftTeam.name}</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="timer">{formatCountdown(match.targetTime, now)}</div>
          </div>
          <div className="combine-image" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="right-team-name">{match.rightTeam.name}</span>
            <img className="team-image" alt="right" src={match.rightTeam.flag} />
          </div>
        </div>
      </div>
      <div
        className="card-end-part"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {match.badges.map((b) => (
            <span key={b} className={badgeClass(b)}>
              {b}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            className="btn-tg-primary"
            style={{
              padding: "2px 8px",
              fontSize: 12,
              fontWeight: 400,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Save size={14} />
            <span style={{ marginLeft: 2 }}>save</span>
          </button>
          <List
            size={20}
            style={{ color: "#563d7c", marginLeft: 7, cursor: "pointer" }}
            onClick={() => router.push("/login")}
          />
        </div>
      </div>
    </div>
  );
}
