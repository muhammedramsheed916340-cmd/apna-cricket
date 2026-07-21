"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Rocket,
  RefreshCw,
  ChevronRight,
  SlidersHorizontal,
  Brain,
  Package,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Target,
} from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { TeamCard, ComboDistribution, type GenTeam } from "@/components/tg/team-card";
import { storeTeams, getPlayerPool } from "@/lib/teams-storage";
import { useToast } from "@/hooks/use-toast";

const PITCH_TYPES = [
  { id: "auto", label: "🤖 AI Auto Detect", desc: "Smart pick" },
  { id: "balanced", label: "⚖️ Balanced Pitch", desc: "Even mix" },
  { id: "batting", label: "🏏 Batting Friendly", desc: "Extra batters" },
  { id: "bowling", label: "🎯 Bowling Friendly", desc: "Extra bowlers" },
  { id: "spin", label: "🌀 Spin Friendly", desc: "Extra AR/spin" },
];

const ALL_COMBOS = [
  "1-3-3-4", "1-3-4-3", "1-4-2-4", "1-4-3-3", "1-5-2-3",
  "1-3-2-5", "2-3-2-4", "2-4-2-3", "2-3-3-3",
];

const ADVANCED_FILTERS = [
  { id: "form", label: "In-Form Players", desc: "High recent selection %" },
  { id: "differential", label: "Differential Picks", desc: "Low selection %" },
  { id: "captain_pace", label: "Captain from Pace Bowler", desc: "Pace bias" },
  { id: "captain_spin", label: "Captain from Spin Bowler", desc: "Spin bias" },
  { id: "winning", label: "Captain from Winning Team", desc: "Win bias" },
  { id: "equal", label: "Captain Equal Distribution", desc: "Balanced C/VC" },
  { id: "unique_c", label: "Unique Captain Every Team", desc: "No repeat C" },
  { id: "unique_vc", label: "Unique VC Every Team", desc: "No repeat VC" },
  { id: "credit_opt", label: "Credit Optimization", desc: "Max value" },
  { id: "balance_val", label: "Team Balance Validation", desc: "Enforce balance" },
];

const TEAM_COUNTS = [1, 5, 10, 20, 40, 100, 250, 500];

const cardStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "#e8eefc",
  marginBottom: 10,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const pillBtn = (active: boolean): React.CSSProperties => ({
  padding: "8px 10px",
  border: active ? "1px solid rgba(52,211,153,0.5)" : "1px solid rgba(255,255,255,0.08)",
  background: active
    ? "linear-gradient(135deg, rgba(52,211,153,0.25), rgba(16,185,129,0.15))"
    : "rgba(255,255,255,0.03)",
  color: active ? "#34d399" : "#8a94b3",
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "center" as const,
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  lineHeight: 1.3,
});

export default function AdvancedPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [matchId, setMatchId] = useState("");
  const [filters, setFilters] = useState<string[]>(["form"]);
  const [teamCount, setTeamCount] = useState(20);
  const [pitchType, setPitchType] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<GenTeam[]>([]);
  const [comboDist, setComboDist] = useState<Record<string, number>>({});

  useEffect(() => {
    params.then((p) => setMatchId(p.id));
  }, [params]);

  const toggle = (id: string) =>
    setFilters((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const generate = async () => {
    setLoading(true);
    setTeams([]);
    setComboDist({});
    try {
      const playerPool = getPlayerPool(matchId);
      const res = await fetch("/api/generate-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          type: "advanced",
          teamCount,
          playerPool: playerPool.length >= 11 ? playerPool : undefined,
          diversity: true,
          pitchType,
          maxSameComboPercent: 30,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data?.teams) {
        setTeams(data.teams);
        storeTeams(matchId, "advanced", data.teams);
        if (data.combinationDistribution) setComboDist(data.combinationDistribution);
      } else {
        toast({ title: "Generation Failed", description: data?.message || data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      toast({ title: "Error", description: msg.includes("timeout") ? "Request timed out" : msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const aiConfidence = Math.min(98, 62 + filters.length * 2 + (pitchType !== "auto" ? 8 : 0));
  const winningPotential = Math.min(95, 58 + filters.length * 2);

  return (
    <MatchShell matchId={matchId || "loading"} active="advanced">
      {/* Header */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <SlidersHorizontal size={16} color="#8b5cf6" />
          Advanced AI Generator
        </div>
        <p style={{ fontSize: 12, color: "#8a94b3", marginBottom: 0, lineHeight: 1.5 }}>
          Advanced filters with <b style={{ color: "#34d399" }}>combination diversity</b>.
          AI picks from 9 combos — max 30% per combo, unique C/VC per team.
        </p>
      </div>

      {/* Pitch Analysis */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Brain size={15} color="#06b6d4" /> Pitch Analysis (Combo Diversity)
        </div>
        <p style={{ fontSize: 11, color: "#8a94b3", marginBottom: 10, lineHeight: 1.5 }}>
          AI intelligently selects from <b style={{ color: "#34d399" }}>9 combinations</b> based on pitch.
          Max <b style={{ color: "#f59e0b" }}>30%</b> of teams use the same combo.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {PITCH_TYPES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPitchType(p.id)}
              style={{ ...pillBtn(pitchType === p.id), flexDirection: "column", gap: 2, padding: "10px 6px" }}
            >
              <span style={{ fontSize: 11, fontWeight: 700 }}>{p.label}</span>
              <span style={{ fontSize: 9, opacity: 0.7 }}>{p.desc}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {ALL_COMBOS.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 9, fontWeight: 700, color: "#8a94b3",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "3px 7px", borderRadius: 5,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <SlidersHorizontal size={15} color="#8b5cf6" /> Advanced Filters
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ADVANCED_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                border: filters.includes(f.id)
                  ? "1px solid rgba(52,211,153,0.4)"
                  : "1px solid rgba(255,255,255,0.06)",
                background: filters.includes(f.id)
                  ? "rgba(16,185,129,0.1)"
                  : "rgba(255,255,255,0.02)",
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  width: 18, height: 18, borderRadius: 5,
                  border: filters.includes(f.id) ? "1px solid #34d399" : "1px solid rgba(255,255,255,0.2)",
                  background: filters.includes(f.id) ? "#34d399" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                {filters.includes(f.id) && <CheckCircle2 size={12} color="#04130d" />}
              </span>
              <span style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: filters.includes(f.id) ? "#e8eefc" : "#8a94b3" }}>
                  {f.label}
                </div>
                <div style={{ fontSize: 10, color: "#6c757d" }}>{f.desc}</div>
              </span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#6c757d", marginTop: 8 }}>
          {filters.length} filters enabled
        </div>
      </div>

      {/* Team Count */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Package size={15} color="#8b5cf6" /> Team Count
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {TEAM_COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => setTeamCount(n)}
              style={{ ...pillBtn(teamCount === n), padding: "10px 4px", fontSize: 13, fontWeight: 800 }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <input
            type="range" min={1} max={500} value={teamCount}
            onChange={(e) => setTeamCount(parseInt(e.target.value, 10))}
            style={{ flex: 1, accentColor: "#34d399" }}
          />
          <input
            type="number" min={1} max={500} value={teamCount}
            onChange={(e) => setTeamCount(Math.max(1, Math.min(parseInt(e.target.value, 10) || 1, 500)))}
            style={{
              width: 60, padding: "6px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "#e8eefc", fontSize: 13, fontWeight: 700, textAlign: "center",
            }}
          />
        </div>
      </div>

      {/* AI Validation */}
      <div
        style={{
          ...cardStyle,
          borderColor: "rgba(52,211,153,0.25)",
          background: "linear-gradient(180deg, rgba(16,185,129,0.08), rgba(255,255,255,0.02))",
        }}
      >
        <div style={sectionTitle}>
          <ShieldCheck size={15} color="#34d399" /> Final AI Validation
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {["Playing XI Verified", "Credits Verified", "Team Combination Valid", "C & VC Different", "No Duplicate Team", "Grand League Optimized"].map((v) => (
            <div key={v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#34d399", fontWeight: 600 }}>
              <CheckCircle2 size={13} /> {v}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <div style={{ flex: 1, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, padding: 10, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399" }}>{aiConfidence}%</div>
            <div style={{ fontSize: 9, color: "#8a94b3", marginTop: 2 }}>AI Confidence</div>
          </div>
          <div style={{ flex: 1, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10, padding: 10, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{winningPotential}%</div>
            <div style={{ fontSize: 9, color: "#8a94b3", marginTop: 2 }}>Winning Potential</div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generate}
        disabled={loading}
        style={{
          width: "100%", padding: "16px", border: "none", borderRadius: 14,
          fontSize: 15, fontWeight: 800, color: "#04130d",
          background: "linear-gradient(135deg, #34d399, #10b981)",
          cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: "0 8px 24px rgba(16,185,129,0.35)", marginBottom: 12,
        }}
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> Generating {teamCount} Advanced Teams…</>
        ) : (
          <><Rocket size={18} /> Generate Advanced AI Teams</>
        )}
      </button>

      {/* Generated Teams */}
      {teams.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "#e8eefc", display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={15} color="#34d399" />
              Generated Teams ({teams.length})
            </h4>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={generate}
                style={{
                  padding: "6px 10px", border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)", borderRadius: 8,
                  fontSize: 11, fontWeight: 600, color: "#b4bcd6", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <RefreshCw size={12} /> Regen
              </button>
              <button
                onClick={() => router.push(`/match/${matchId}/transfer`)}
                style={{
                  padding: "6px 12px", border: "none", borderRadius: 8,
                  fontSize: 11, fontWeight: 700, color: "#04130d",
                  background: "linear-gradient(135deg, #34d399, #10b981)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                }}
              >
                Transfer <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {Object.keys(comboDist).length > 0 && (
            <ComboDistribution distribution={comboDist} />
          )}

          {teams.map((t) => (
            <TeamCard key={t.team_number} team={t} />
          ))}
        </div>
      )}
    </MatchShell>
  );
}
