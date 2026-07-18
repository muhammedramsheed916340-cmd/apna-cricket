"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Save, ChevronRight, Clock } from "lucide-react";
import { formatCountdown, type Match } from "@/lib/matches";

const BADGE_CLASS: Record<string, string> = {
  "Mega GL": "ac-badge ac-badge-gl",
  SL: "ac-badge ac-badge-sl",
  H2H: "ac-badge ac-badge-h2h",
};

export function MatchCard({ match }: { match: Match }) {
  const router = useRouter();
  const [now, setNow] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const openMatch = () => {
    router.push(`/match/${match.id}/section`);
  };

  const saveMatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const saved = JSON.parse(localStorage.getItem("tg_saved_matches") || "[]");
      if (!saved.find((m: Match) => m.id === match.id)) {
        saved.push(match);
        localStorage.setItem("tg_saved_matches", JSON.stringify(saved));
      }
      router.push(`/savedmatches`);
    } catch {
      /* ignore */
    }
  };

  const countdownText = mounted ? formatCountdown(match.targetTime, now) : "—";

  return (
    <article
      className="ac-match ac-fade-up"
      onClick={openMatch}
      role="button"
      tabIndex={0}
      aria-label={`${match.leftTeam.name} vs ${match.rightTeam.name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter") openMatch();
      }}
    >
      <div className="ac-match-glow" aria-hidden="true" />

      <div className="ac-match-head">
        <div className="ac-match-series">
          <Star size={13} className="ac-star" fill="currentColor" />
          <span>{match.series}</span>
        </div>
        <span className="ac-countdown">
          <Clock size={11} />
          {countdownText}
        </span>
      </div>

      <div className="ac-match-body">
        <div className="ac-team ac-team-left">
          <img
            className="ac-team-flag"
            alt={`${match.leftTeam.name} flag`}
            src={match.leftTeam.flag}
          />
          <span className="ac-team-name">{match.leftTeam.name}</span>
        </div>

        <div className="ac-vs-block">
          <span className="ac-vs-label">VS</span>
        </div>

        <div className="ac-team ac-team-right">
          <img
            className="ac-team-flag"
            alt={`${match.rightTeam.name} flag`}
            src={match.rightTeam.flag}
          />
          <span className="ac-team-name">{match.rightTeam.name}</span>
        </div>
      </div>

      <div className="ac-match-foot">
        <div className="ac-badges">
          {match.badges.map((b) => (
            <span key={b} className={BADGE_CLASS[b] || "ac-badge ac-badge-gl"}>
              {b}
            </span>
          ))}
        </div>
        <div className="ac-match-actions">
          <button
            type="button"
            className="ac-btn-save"
            onClick={saveMatch}
            aria-label="Save match"
          >
            <Save size={13} />
            Save
          </button>
          <button
            type="button"
            className="ac-btn-open"
            onClick={openMatch}
            aria-label="Open match"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
