"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Trophy,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  AlertCircle,
  Users,
  Gift,
  ChevronRight,
  Crown,
} from "lucide-react";
import { Header } from "@/components/tg/header";
import { TopNav } from "@/components/tg/top-nav";
import { BottomNav } from "@/components/tg/bottom-nav";
import { SideNav } from "@/components/tg/side-nav";
import { useToast } from "@/hooks/use-toast";
import { FANTASY_PLATFORMS } from "@/lib/fantasy";

const PLATFORM_STYLE: Record<string, { bg: string; color: string; abbr: string }> = {
  dream11: { bg: "#d13239", color: "#fff", abbr: "D11" },
  my11circle: { bg: "#1a936f", color: "#fff", abbr: "M11" },
  jumbo: { bg: "#f6ae2d", color: "#3d2817", abbr: "JB" },
};

interface Account {
  slug: string;
  name: string;
  mobileNumber: string;
  authToken: string | null;
  linked: boolean;
}

interface Contest {
  contestId: string;
  contestName?: string;
  name?: string;
  availableSlots?: number;
  maxAllowedTeams?: number;
  maxJoinTeamCount?: number;
  notJoinedTeamIds?: number[];
  joinedTeamIds?: number[];
  joinedCount?: number;
  totalPrizeAmount?: number;
  prizeDisplayText?: string;
  entryFee?: number;
  teamCount?: number;
}

interface JoinResult {
  teamId: number;
  success: boolean;
  message?: string;
}

export default function ContestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("dream11");
  const [matchId, setMatchId] = useState<string>("");
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinResults, setJoinResults] = useState<Record<string, JoinResult[]>>({});

  useEffect(() => {
    // Get matchId from URL query param or default to first live match
    const mid = searchParams.get("matchId");
    if (mid) {
      setMatchId(mid);
    } else {
      // Fetch live matches and use the first one
      fetch("/api/matches", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.data?.length) setMatchId(d.data[0].id);
        })
        .catch(() => {});
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/fantasy/accounts", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d?.accounts || []);
        if (d?.accounts?.length) {
          const linked = d.accounts.filter((a: Account) => a.linked);
          if (linked.length && !linked.find((a: Account) => a.slug === selectedPlatform)) {
            setSelectedPlatform(linked[0].slug);
          }
        }
      })
      .catch(() => {});
  }, []);

  const linkedAccounts = accounts.filter((a) => a.linked);
  const currentAccount = linkedAccounts.find((a) => a.slug === selectedPlatform);
  const currentPlatform = FANTASY_PLATFORMS.find((p) => p.slug === selectedPlatform);

  const fetchContests = async () => {
    if (!matchId || !currentAccount) return;
    setLoading(true);
    setContests([]);
    try {
      let userToken = "";
      try { userToken = localStorage.getItem("user_token") || ""; } catch {}

      // First fetch existing teams on the platform
      const listRes = await fetch("/api/fantasy/list-of-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fantasyApp: selectedPlatform, matchId, userToken }),
      });
      const listData = await listRes.json();
      const teamIds = (listData?.teams_list || []).map((t: any) => parseInt(t.team_id, 10)).filter((n: number) => !isNaN(n));

      if (teamIds.length === 0) {
        toast({
          title: "No teams found",
          description: `Transfer teams to ${currentPlatform?.name} first, then come back to join contests.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch free contests for those teams
      const res = await fetch("/api/fantasy/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fantasyApp: selectedPlatform,
          matchId,
          authToken: currentAccount.authToken,
          allTeamIds: teamIds,
          userToken,
        }),
      });
      const data = await res.json();

      if (data?.status === "success" && data.contests?.length) {
        setContests(data.contests);
        toast({
          title: "Contests loaded",
          description: `${data.contests.length} free contests available on ${currentPlatform?.name}`,
        });
      } else {
        setContests([]);
        toast({
          title: "No free contests",
          description: data?.error || `No free contests available on ${currentPlatform?.name} right now.`,
        });
      }
    } catch (e) {
      toast({
        title: "Failed to fetch",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (matchId && currentAccount) {
      fetchContests();
    }
  }, [matchId, selectedPlatform, currentAccount?.linked]);

  const joinContest = async (contest: Contest) => {
    if (!currentAccount || !matchId) return;
    setJoining(contest.contestId);
    try {
      let userToken = "";
      try { userToken = localStorage.getItem("user_token") || ""; } catch {}

      const available = contest.availableSlots || contest.maxAllowedTeams || contest.maxJoinTeamCount || 1;
      const toJoin = (contest.notJoinedTeamIds || []).slice(0, available);

      if (toJoin.length === 0) {
        toast({
          title: "Nothing to join",
          description: "All your teams have already joined this contest.",
        });
        setJoining(null);
        return;
      }

      const res = await fetch("/api/fantasy/join-contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fantasyApp: selectedPlatform,
          matchId,
          authToken: currentAccount.authToken,
          contestId: contest.contestId,
          teamIds: toJoin,
          userToken,
        }),
      });
      const data = await res.json();

      if (data?.status === "success") {
        const results = data.joinResults || [];
        setJoinResults((prev) => ({ ...prev, [contest.contestId]: results }));
        const success = data.summary?.successCount || results.filter((r: JoinResult) => r.success).length;
        const failed = data.summary?.failedCount || results.filter((r: JoinResult) => !r.success).length;
        toast({
          title: "Contest joined!",
          description: `${success} team(s) joined${failed > 0 ? `, ${failed} failed` : ""}`,
        });
        // Refresh contests to update joined status
        fetchContests();
      } else {
        toast({
          title: "Join failed",
          description: data?.error || "Failed to join contest",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="ac-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Header onMenuClick={() => setMenuOpen(true)} />
      <TopNav active="cricket" onChange={() => {}} />

      <main style={{ padding: "8px 14px 8px", flex: 1 }}>
        {/* Page title */}
        <div className="ac-section-title">
          <h4>
            <Gift size={16} style={{ color: "#34d399" }} />
            Free Contests
          </h4>
          <button
            type="button"
            className="ac-link-btn"
            onClick={fetchContests}
            disabled={loading || !currentAccount}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>

        {/* Platform selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {FANTASY_PLATFORMS.filter((p) => p.slug === "dream11" || p.slug === "my11circle").map((p) => {
            const acc = linkedAccounts.find((a) => a.slug === p.slug);
            const isActive = selectedPlatform === p.slug;
            const style = PLATFORM_STYLE[p.slug];
            return (
              <button
                key={p.slug}
                onClick={() => acc && setSelectedPlatform(p.slug)}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  border: isActive ? `2px solid ${style.bg}` : "1px solid rgba(255,255,255,0.1)",
                  background: isActive ? `${style.bg}20` : "rgba(255,255,255,0.04)",
                  borderRadius: 10,
                  cursor: acc ? "pointer" : "not-allowed",
                  opacity: acc ? 1 : 0.5,
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: style.bg, color: style.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, margin: "0 auto 4px",
                }}>
                  {style.abbr}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? style.bg : "#8a94b3" }}>
                  {p.name}
                </div>
                {acc && (
                  <CheckCircle2
                    size={12}
                    color="#34d399"
                    style={{ position: "absolute", top: 4, right: 4 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Unlinked warning */}
        {!currentAccount && (
          <div style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <AlertCircle size={20} color="#f59e0b" />
            <div style={{ flex: 1, fontSize: 12, color: "#f59e0b" }}>
              <strong>{currentPlatform?.name} not linked.</strong> Link via OTP to join free contests.
            </div>
            <button
              onClick={() => router.push("/fantasy")}
              className="btn-tg-success"
              style={{
                padding: "6px 12px",
                border: "none",
                borderRadius: 8,
                color: "#04130d",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Link2 size={12} /> Link
            </button>
          </div>
        )}

        {/* No matchId */}
        {!matchId && (
          <div className="ac-empty">
            <div className="ac-empty-icon">
              <Trophy size={26} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No match selected</div>
            <div style={{ fontSize: 12 }}>Go to a match page to join its free contests.</div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 30, color: "#8a94b3" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "#34d399", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13 }}>Fetching free contests…</div>
          </div>
        )}

        {/* Contests list */}
        {!loading && contests.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {contests.map((c) => {
              const available = c.availableSlots || c.maxAllowedTeams || c.maxJoinTeamCount || 1;
              const notJoined = c.notJoinedTeamIds || [];
              const joined = c.joinedTeamIds || [];
              const isJoining = joining === c.contestId;
              const results = joinResults[c.contestId];
              const canJoin = notJoined.length > 0 && available > 0;

              return (
                <div
                  key={c.contestId}
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    padding: 14,
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {/* Contest header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Gift size={14} color="#34d399" />
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                          color: "#34d399", background: "rgba(16,185,129,0.12)",
                          padding: "2px 6px", borderRadius: 4,
                        }}>
                          FREE
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#e8eefc", marginBottom: 2 }}>
                        {c.contestName || c.name || `Contest #${c.contestId}`}
                      </div>
                      {c.prizeDisplayText && (
                        <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>
                          🏆 {c.prizeDisplayText}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#8a94b3" }}>Slots</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: canJoin ? "#34d399" : "#6c757d" }}>
                        {available}
                      </div>
                    </div>
                  </div>

                  {/* Team status */}
                  <div style={{
                    display: "flex", gap: 8, marginBottom: 10,
                    padding: 8, background: "rgba(255,255,255,0.03)",
                    borderRadius: 8, fontSize: 11,
                  }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#34d399" }}>{joined.length}</div>
                      <div style={{ fontSize: 9, color: "#8a94b3" }}>Joined</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b" }}>{notJoined.length}</div>
                      <div style={{ fontSize: 9, color: "#8a94b3" }}>Not Joined</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#06b6d4" }}>{available}</div>
                      <div style={{ fontSize: 9, color: "#8a94b3" }}>Available</div>
                    </div>
                  </div>

                  {/* Join results badges */}
                  {results && results.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {results.map((r, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 10,
                            padding: "3px 6px",
                            borderRadius: 4,
                            backgroundColor: r.success ? "#10b981" : "#ef4444",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          T{r.teamId} {r.success ? "✓" : "✗"}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Join button */}
                  <button
                    onClick={() => joinContest(c)}
                    disabled={isJoining || !canJoin}
                    className="btn-tg-success"
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isJoining || !canJoin ? "not-allowed" : "pointer",
                      opacity: isJoining || !canJoin ? 0.6 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Joining…
                      </>
                    ) : canJoin ? (
                      <>
                        <Trophy size={14} /> Join with {Math.min(notJoined.length, available)} team(s)
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} /> All teams joined
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && currentAccount && matchId && contests.length === 0 && (
          <div className="ac-empty">
            <div className="ac-empty-icon">
              <Gift size={26} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No free contests</div>
            <div style={{ fontSize: 12 }}>
              No free contests available on {currentPlatform?.name} for this match right now.
              <br />Transfer teams first, then refresh.
            </div>
          </div>
        )}

        {/* Transfer link */}
        <a
          href={matchId ? `/match/${matchId}/transfer` : "/mymatches"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 12,
            padding: "12px 14px",
            textDecoration: "none",
            color: "#e8eefc",
            border: "1px solid rgba(255,255,255,0.08)",
            marginTop: 14,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Crown size={18} color="#f59e0b" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Transfer Teams First</span>
          </span>
          <ChevronRight size={16} color="#8a94b3" />
        </a>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
