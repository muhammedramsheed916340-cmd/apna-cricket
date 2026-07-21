"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Rocket,
  RefreshCw,
  ChevronRight,
  Target,
  Brain,
  Crown,
  Medal,
  Settings2,
  Package,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { TeamCard, ComboDistribution, type GenTeam } from "@/components/tg/team-card";
import { ROLE_LABELS } from "@/lib/players";
import { storeTeams, getPlayerPool } from "@/lib/teams-storage";

// ====== Rank 1 AI Configuration ======

const GENERATE_MODES = [
  { id: "rank1", label: "Rank 1 AI", emoji: "⭐", desc: "Recommended", recommended: true },
  { id: "grand-max", label: "Grand League Max Risk", emoji: "🏆", desc: "High ceiling" },
  { id: "small-safe", label: "Small League Safe", emoji: "💰", desc: "Safe picks" },
  { id: "mega-killer", label: "Mega Contest Killer", emoji: "🔥", desc: "Balanced risk" },
  { id: "differential", label: "Differential Hunter", emoji: "🎲", desc: "Low ownership" },
  { id: "high-ceiling", label: "High Ceiling Teams", emoji: "⚡", desc: "Max upside" },
  { id: "consistency", label: "Consistency Mode", emoji: "📈", desc: "Steady picks" },
  { id: "elite", label: "Elite AI Analysis", emoji: "🤖", desc: "Full AI" },
];

const AI_STRATEGIES = [
  { id: "balanced", label: "Balanced", comb: { wk: 1, bat: 4, ar: 3, bowl: 3 } },
  { id: "aggressive", label: "Aggressive", comb: { wk: 1, bat: 5, ar: 2, bowl: 3 } },
  { id: "ultra-aggressive", label: "Ultra Aggressive", comb: { wk: 1, bat: 5, ar: 3, bowl: 2 } },
  { id: "differential-heavy", label: "Differential Heavy", comb: { wk: 1, bat: 4, ar: 3, bowl: 3 } },
  { id: "low-ownership", label: "Low Ownership", comb: { wk: 1, bat: 4, ar: 3, bowl: 3 } },
  { id: "high-projection", label: "High Projection", comb: { wk: 1, bat: 4, ar: 3, bowl: 3 } },
  { id: "safe-diff-mix", label: "Safe + Differential Mix", comb: { wk: 1, bat: 4, ar: 3, bowl: 3 } },
];

const CAPTAIN_STRATEGIES = [
  { id: "safe-c", label: "Safe Captain", pick: "safe" },
  { id: "diff-c", label: "Differential Captain", pick: "differential" },
  { id: "ultra-diff-c", label: "Ultra Differential", pick: "ultra-diff" },
  { id: "ai-best-c", label: "AI Best Captain", pick: "ai-best" },
  { id: "high-ceiling-c", label: "High Ceiling Captain", pick: "high-ceiling" },
  { id: "bowling-c", label: "Bowling Captain", pick: "bowling" },
  { id: "ar-c", label: "All-rounder Captain", pick: "ar" },
];

const VC_STRATEGIES = [
  { id: "safe-vc", label: "Safe VC", pick: "safe" },
  { id: "diff-vc", label: "Differential VC", pick: "differential" },
  { id: "ai-best-vc", label: "AI Best VC", pick: "ai-best" },
  { id: "bowling-vc", label: "Bowling VC", pick: "bowling" },
  { id: "finisher-vc", label: "Finisher VC", pick: "finisher" },
  { id: "high-ceiling-vc", label: "High Ceiling VC", pick: "high-ceiling" },
];

const AI_INTELLIGENCE = [
  "Official Playing XI Only",
  "Toss Impact",
  "Pitch Analysis",
  "Weather Analysis",
  "Dew Impact",
  "Venue Records",
  "Head-to-Head",
  "Recent Form",
  "Matchup Analysis",
  "Death Overs",
  "Powerplay Impact",
  "Batting Position",
  "Ownership %",
  "Risk Score",
  "Ceiling Score",
];

const GL_TARGETS = [
  { id: "rank1", label: "Rank 1 Focus", emoji: "🎯" },
  { id: "top10", label: "Top 10 Focus", emoji: "🔟" },
  { id: "top100", label: "Top 100 Focus", emoji: "💯" },
  { id: "max-unique", label: "Maximum Uniqueness", emoji: "🎲" },
  { id: "max-ceiling", label: "Maximum Ceiling", emoji: "⚡" },
  { id: "low-owner", label: "Low Ownership", emoji: "📉" },
];

const ADVANCED_OPTS = [
  "Exclude Bench Players",
  "Lock Playing XI Only",
  "Auto Replace Offline Players",
  "Avoid Duplicate Teams",
  "Unique Captain in Every Team",
  "Unique Vice Captain in Every Team",
  "Credit Optimization",
  "Team Balance Validation",
];

const TEAM_COUNTS = [1, 5, 10, 20, 40, 100, 250, 500];

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

// ====== Reusable styled components (dark theme) ======

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

const chipBtn = (active: boolean): React.CSSProperties => ({
  padding: "7px 12px",
  border: active ? "1px solid rgba(52,211,153,0.5)" : "1px solid rgba(255,255,255,0.08)",
  background: active ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
  color: active ? "#34d399" : "#b4bcd6",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  transition: "all 0.2s ease",
});

export default function SmartPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<GenTeam[]>([]);

  // Selections
  const [genMode, setGenMode] = useState("rank1");
  const [aiStrategy, setAiStrategy] = useState("balanced");
  const [capStrategy, setCapStrategy] = useState("ai-best-c");
  const [vcStrategy, setVcStrategy] = useState("ai-best-vc");
  const [intelligence, setIntelligence] = useState<string[]>(["Official Playing XI Only", "Recent Form", "Ownership %"]);
  const [glTarget, setGlTarget] = useState("rank1");
  const [advanced, setAdvanced] = useState<string[]>(["Exclude Bench Players", "Lock Playing XI Only", "Avoid Duplicate Teams"]);
  const [teamCount, setTeamCount] = useState(20);
  const [pitchType, setPitchType] = useState("auto");
  const [comboDist, setComboDist] = useState<Record<string, number>>({});

  useEffect(() => {
    params.then((p) => setMatchId(p.id));
  }, [params]);

  const toggleIntel = (item: string) => {
    setIntelligence((s) => (s.includes(item) ? s.filter((x) => x !== item) : [...s, item]));
  };
  const toggleAdvanced = (item: string) => {
    setAdvanced((s) => (s.includes(item) ? s.filter((x) => x !== item) : [...s, item]));
  };

  // AI Confidence + Winning Potential (simulated based on selections)
  const aiConfidence = Math.min(98, 60 + intelligence.length * 2 + (genMode === "rank1" ? 10 : 5));
  const winningPotential = Math.min(95, 55 + (glTarget === "rank1" ? 15 : 10) + advanced.length * 2);

  const generate = async () => {
    setLoading(true);
    setTeams([]);
    setComboDist({});
    try {
      const strat = AI_STRATEGIES.find((s) => s.id === aiStrategy) || AI_STRATEGIES[0];
      const comb = strat.comb;
      const playerPool = getPlayerPool(matchId);

      const res = await fetch("/api/generate-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          type: "smart",
          teamCount,
          combination: comb,
          playerPool: playerPool.length >= 11 ? playerPool : undefined,
          diversity: true,
          pitchType,
          maxSameComboPercent: 30,
        }),
      });
      const data = await res.json();
      if (data?.teams) {
        setTeams(data.teams);
        storeTeams(matchId, "smart", data.teams);
        if (data.combinationDistribution) {
          setComboDist(data.combinationDistribution);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MatchShell matchId={matchId || "loading"} active="smart">
      {/* ===== Header ===== */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Sparkles size={16} color="#34d399" />
          Rank 1 AI Generator
        </div>
        <p style={{ fontSize: 12, color: "#8a94b3", marginBottom: 0, lineHeight: 1.5 }}>
          Premium fantasy team generator with separate controls for AI strategy, captain selection,
          uniqueness, risk level, and validation.
        </p>
      </div>

      {/* ===== 1. Generate Mode ===== */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Target size={15} color="#34d399" /> Generate Mode
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {GENERATE_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setGenMode(m.id)}
              style={{
                ...pillBtn(genMode === m.id),
                flexDirection: "column",
                gap: 2,
                padding: "10px 6px",
                position: "relative",
              }}
            >
              <span style={{ fontSize: 18 }}>{m.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{m.label}</span>
              {m.recommended && genMode === m.id && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    fontSize: 8,
                    background: "#34d399",
                    color: "#04130d",
                    padding: "1px 5px",
                    borderRadius: 4,
                    fontWeight: 800,
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 2. AI Strategy ===== */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Brain size={15} color="#06b6d4" /> AI Strategy
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {AI_STRATEGIES.map((s) => (
            <button key={s.id} onClick={() => setAiStrategy(s.id)} style={chipBtn(aiStrategy === s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 3. Captain Strategy ===== */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Crown size={15} color="#f59e0b" /> Captain Strategy
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CAPTAIN_STRATEGIES.map((c) => (
            <button key={c.id} onClick={() => setCapStrategy(c.id)} style={chipBtn(capStrategy === c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 4. Vice Captain Strategy ===== */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Medal size={15} color="#8b5cf6" /> Vice Captain Strategy
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {VC_STRATEGIES.map((v) => (
            <button key={v.id} onClick={() => setVcStrategy(v.id)} style={chipBtn(vcStrategy === v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 5. AI Intelligence ===== */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Brain size={15} color="#10b981" /> AI Intelligence
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {AI_INTELLIGENCE.map((item) => (
            <button key={item} onClick={() => toggleIntel(item)} style={chipBtn(intelligence.includes(item))}>
              {intelligence.includes(item) ? "✓ " : ""}
              {item}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#6c757d", marginTop: 8 }}>
          {intelligence.length} factors enabled
        </div>
      </div>

      {/* ===== 5b. Pitch Analysis (Combination Diversity) ===== */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Brain size={15} color="#06b6d4" /> Pitch Analysis (Combo Diversity)
        </div>
        <p style={{ fontSize: 11, color: "#8a94b3", marginBottom: 10, lineHeight: 1.5 }}>
          AI intelligently selects from <b style={{ color: "#34d399" }}>9 combinations</b> based on pitch.
          Max <b style={{ color: "#f59e0b" }}>30%</b> of teams use the same combo — rest distributed for diversity.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {PITCH_TYPES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPitchType(p.id)}
              style={{
                ...pillBtn(pitchType === p.id),
                flexDirection: "column",
                gap: 2,
                padding: "10px 6px",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700 }}>{p.label}</span>
              <span style={{ fontSize: 9, opacity: 0.7 }}>{p.desc}</span>
            </button>
          ))}
        </div>
        {/* All 9 combinations preview */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {ALL_COMBOS.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#8a94b3",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "3px 7px",
                borderRadius: 5,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* ===== 6. Grand League Target ===== */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Target size={15} color="#f43f5e" /> Grand League Target
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {GL_TARGETS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGlTarget(g.id)}
              style={{
                ...pillBtn(glTarget === g.id),
                padding: "10px 8px",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 16 }}>{g.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== 7. Advanced ===== */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Settings2 size={15} color="#06b6d4" /> Advanced
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ADVANCED_OPTS.map((opt) => (
            <button
              key={opt}
              onClick={() => toggleAdvanced(opt)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                border: advanced.includes(opt)
                  ? "1px solid rgba(52,211,153,0.4)"
                  : "1px solid rgba(255,255,255,0.06)",
                background: advanced.includes(opt)
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
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: advanced.includes(opt)
                    ? "1px solid #34d399"
                    : "1px solid rgba(255,255,255,0.2)",
                  background: advanced.includes(opt) ? "#34d399" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {advanced.includes(opt) && (
                  <CheckCircle2 size={12} color="#04130d" />
                )}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: advanced.includes(opt) ? "#e8eefc" : "#8a94b3" }}>
                {opt}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== 8. Team Count ===== */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Package size={15} color="#8b5cf6" /> Team Count
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {TEAM_COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => setTeamCount(n)}
              style={{
                ...pillBtn(teamCount === n),
                padding: "10px 4px",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <input
            type="range"
            min={1}
            max={500}
            value={teamCount}
            onChange={(e) => setTeamCount(parseInt(e.target.value, 10))}
            style={{ flex: 1, accentColor: "#34d399" }}
          />
          <input
            type="number"
            min={1}
            max={500}
            value={teamCount}
            onChange={(e) => setTeamCount(Math.max(1, Math.min(parseInt(e.target.value, 10) || 1, 500)))}
            style={{
              width: 60,
              padding: "6px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#e8eefc",
              fontSize: 13,
              fontWeight: 700,
              textAlign: "center",
            }}
          />
        </div>
      </div>

      {/* ===== 9. Final AI Validation ===== */}
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
          {[
            "Playing XI Verified",
            "Credits Verified",
            "Team Combination Valid",
            "C & VC Different",
            "No Duplicate Team",
            "Grand League Optimized",
          ].map((v) => (
            <div
              key={v}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "#34d399",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={13} /> {v}
            </div>
          ))}
        </div>
        {/* Scores */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <div
            style={{
              flex: 1,
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: 10,
              padding: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399" }}>{aiConfidence}%</div>
            <div style={{ fontSize: 9, color: "#8a94b3", marginTop: 2 }}>AI Confidence</div>
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: 10,
              padding: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{winningPotential}%</div>
            <div style={{ fontSize: 9, color: "#8a94b3", marginTop: 2 }}>Winning Potential</div>
          </div>
        </div>
      </div>

      {/* ===== Generate Button ===== */}
      <button
        onClick={generate}
        disabled={loading}
        style={{
          width: "100%",
          padding: "16px",
          border: "none",
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 800,
          color: "#04130d",
          background: "linear-gradient(135deg, #34d399, #10b981)",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 8px 24px rgba(16,185,129,0.35)",
          marginBottom: 12,
          transition: "all 0.2s ease",
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Generating {teamCount} AI Teams…
          </>
        ) : (
          <>
            <Rocket size={18} /> Generate Rank 1 AI Teams
          </>
        )}
      </button>

      {/* ===== Generated Teams ===== */}
      {teams.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "#e8eefc", display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={15} color="#34d399" />
              Generated Teams ({teams.length})
            </h4>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={generate}
                style={{
                  padding: "6px 10px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#b4bcd6",
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
                style={{
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#04130d",
                  background: "linear-gradient(135deg, #34d399, #10b981)",
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
