"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Send,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Link2,
  Hash,
  Layers,
  Zap,
  Trophy,
  AlertCircle,
  Plus,
  Edit3,
} from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { useToast } from "@/hooks/use-toast";
import { FANTASY_PLATFORMS } from "@/lib/fantasy";
import { getTeams } from "@/lib/teams-storage";

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
  limit?: number;
  my11circleChallenge?: string | null;
  my11circleUserId?: string | null;
}

interface ExistingTeam {
  team_id: string;
  captain: number;
  vice_captain: number;
  player_list: number[];
}

export default function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [matchId, setMatchId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("dream11");
  const [hash, setHash] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressTeam, setProgressTeam] = useState<string>("");
  const [transferred, setTransferred] = useState<any[]>([]);
  const [failedTeams, setFailedTeams] = useState<any[]>([]);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [totalTeams, setTotalTeams] = useState(0);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [existingTeams, setExistingTeams] = useState<ExistingTeam[]>([]);
  const [fetchingExisting, setFetchingExisting] = useState(false);
  // Transfer mode: "all" (edit + add), "newOnly" (add only), "custom" (X edit + Y add)
  const [transferMode, setTransferMode] = useState<"all" | "newOnly" | "custom">("all");
  const [customReplaceCount, setCustomReplaceCount] = useState(0);
  const [customAddCount, setCustomAddCount] = useState(0);

  useEffect(() => {
    params.then((p) => setMatchId(p.id));
  }, [params]);

  useEffect(() => {
    fetch("/api/fantasy/accounts", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d?.accounts || []);
        if (d?.accounts?.length && !d.accounts.find((a: Account) => a.slug === selectedPlatform)) {
          setSelectedPlatform(d.accounts[0].slug);
        }
      })
      .finally(() => setLoadingAccounts(false));
  }, [selectedPlatform]);

  useEffect(() => {
    if (!matchId) return;
    const stored = getTeams(matchId);
    setTotalTeams(stored?.teams.length || 0);
  }, [matchId]);

  const linkedAccounts = accounts.filter((a) => a.linked);
  const currentAccount = linkedAccounts.find((a) => a.slug === selectedPlatform);
  const currentPlatform = FANTASY_PLATFORMS.find((p) => p.slug === selectedPlatform)!;
  // maxTeams per platform — EXACT match to original TeamTransferScreen.tsx
  const limit = selectedPlatform === "dream11" ? 11 : 40;
  const presentTeamCount = existingTeams.length;
  const newSlots = Math.max(0, limit - presentTeamCount);

  // Fetch existing teams from the fantasy platform
  const fetchExisting = async () => {
    if (!matchId || !currentAccount) return;
    setFetchingExisting(true);
    try {
      let userToken = "";
      try { userToken = localStorage.getItem("user_token") || ""; } catch {}
      const res = await fetch("/api/fantasy/list-of-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fantasyApp: selectedPlatform, matchId, userToken }),
      });
      const data = await res.json();
      if (data?.status === "success" || Array.isArray(data?.teams_list)) {
        setExistingTeams(data.teams_list || []);
        toast({
          title: "Teams fetched",
          description: `${(data.teams_list || []).length} existing teams on ${currentPlatform.name}`,
        });
      } else {
        setExistingTeams([]);
        toast({
          title: "No existing teams",
          description: data?.message || `No teams found on ${currentPlatform.name}`,
        });
      }
    } finally {
      setFetchingExisting(false);
    }
  };

  useEffect(() => {
    if (matchId && currentAccount) {
      fetchExisting();
    }
  }, [matchId, selectedPlatform, currentAccount?.linked]);

  const doTransfer = async (mode: "all" | "newOnly" | "custom" | "replace", extra?: any) => {
    if (!currentAccount) {
      toast({
        title: "Account not linked",
        description: `Please link your ${currentPlatform.name} account first`,
        variant: "destructive",
      });
      router.push("/fantasy");
      return;
    }
    const stored = getTeams(matchId);
    const storedTeams = stored?.teams || [];
    if (storedTeams.length === 0) {
      toast({
        title: "No teams",
        description: "Generate teams first",
        variant: "destructive",
      });
      return;
    }

    setTransferring(true);
    setTransferred([]);
    setFailedTeams([]);
    setBulkResult(null);
    setProgressCurrent(0);
    setProgressTotal(storedTeams.length);

    // Fetch existing teams FIRST to determine edit vs add
    let existingTeamIds: string[] = [];
    try {
      let userToken = "";
      try { userToken = localStorage.getItem("user_token") || ""; } catch {}
      const listRes = await fetch("/api/fantasy/list-of-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fantasyApp: selectedPlatform, matchId, userToken }),
      });
      const listData = await listRes.json();
      if (listData?.teams_list) {
        existingTeamIds = listData.teams_list.map((t: any) => t.team_id);
      }
    } catch {}

    const presentCount = existingTeamIds.length;
    const maxTeams = selectedPlatform === "dream11" ? 11 : 40;
    const newSlots = Math.max(0, maxTeams - presentCount);

    // Determine how many to add vs edit
    let teamsToAdd: number;
    let teamsToEdit: number;
    if (mode === "newOnly") {
      teamsToAdd = Math.min(storedTeams.length, newSlots);
      teamsToEdit = 0;
    } else if (mode === "custom") {
      teamsToEdit = Math.min(customReplaceCount, presentCount, storedTeams.length);
      teamsToAdd = Math.min(customAddCount, newSlots, storedTeams.length - teamsToEdit);
    } else {
      // mode === "all": add new FIRST, then edit
      teamsToAdd = Math.min(storedTeams.length, newSlots);
      teamsToEdit = Math.min(storedTeams.length - teamsToAdd, presentCount);
    }

    const totalToProcess = teamsToAdd + teamsToEdit;
    const allTransferred: any[] = [];
    const allFailed: any[] = [];
    let stopped = false;

    // Process teams ONE BY ONE
    for (let i = 0; i < totalToProcess; i++) {
      if (stopped) break;
      const team = storedTeams[i];
      const isEdit = i >= teamsToAdd; // first teamsToAdd are NEW, rest are EDIT
      setProgressCurrent(i + 1);
      setProgressTeam(`Team #${team.team_number} (${i + 1}/${totalToProcess}) ${isEdit ? "REPLACE" : "NEW"}`);

      try {
        let userToken = "";
        try { userToken = localStorage.getItem("user_token") || ""; } catch {}

        // Get platform-specific fantasy IDs
        const getPlatformId = (p: any): number => {
          if (typeof p === "number") return p;
          if (p?.fantasyIdList) {
            const found = p.fantasyIdList.find((f: any) => f.name === selectedPlatform);
            if (found?.id) return found.id;
          }
          return p?.fantasyId || 0;
        };

        const playerIds = (team.players || []).map((p: any) => getPlatformId(p)).filter((n: number) => n > 0);
        const captainId = getPlatformId(team.captain) || playerIds[0] || 0;
        const viceCaptainId = getPlatformId(team.vicecaptain) || playerIds[1] || 0;

        if (playerIds.length < 11 || !captainId || !viceCaptainId) {
          allFailed.push({ team_number: team.team_number, error: `Invalid team data (${playerIds.length} players)` });
          setFailedTeams([...allFailed]);
          continue;
        }

        // Build the EXACT payload the transfer API expects
        const transferPayload: Record<string, unknown> = {
          matchId,
          fantasyApp: selectedPlatform,
          captain: captainId,
          vice_captain: viceCaptainId,
          players: playerIds,
          sportIndex: 0,
          type: isEdit ? "edit" : "new",
          userToken,
        };

        // For edit, include the existing team_id
        if (isEdit) {
          const editIndex = i - teamsToAdd;
          if (existingTeamIds[editIndex]) {
            transferPayload.id = existingTeamIds[editIndex];
          }
        }

        // My11Circle fields from account
        if (selectedPlatform === "my11circle" && currentAccount) {
          if (currentAccount.my11circleChallenge) transferPayload.my11circleChallenge = currentAccount.my11circleChallenge;
          if (currentAccount.my11circleUserId) transferPayload.my11circleUserId = currentAccount.my11circleUserId;
          if (currentAccount.mobileNumber) transferPayload.my11circleMobile = currentAccount.mobileNumber;
        }
        if (currentAccount?.mobileNumber) transferPayload.mobileNumber = currentAccount.mobileNumber;

        const res = await fetch("/api/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transferPayload),
        });
        const data = await res.json();

        if (data?.status === "success") {
          allTransferred.push({
            team_number: team.team_number,
            status: "transferred",
            operation: isEdit ? "edit" : "add",
          });
          setTransferred([...allTransferred]);
        } else {
          if (data?.code === "TOKEN_EXPIRED" || data?.code === "NO_AUTH_TOKEN") {
            toast({ title: "Re-link required", description: data.error, variant: "destructive" });
            stopped = true;
            router.push("/fantasy");
            break;
          }
          allFailed.push({ team_number: team.team_number, error: data?.error || data?.message || "Transfer failed" });
          setFailedTeams([...allFailed]);

          // Rate limit → wait and retry once
          if (data?.code === "RATE_LIMITED" && i < totalToProcess - 1) {
            await new Promise((r) => setTimeout(r, 4000));
          }
        }
      } catch (e) {
        allFailed.push({ team_number: team.team_number, error: (e as Error).message });
        setFailedTeams([...allFailed]);
      }

      // Platform-specific delay between teams
      if (i < totalToProcess - 1) {
        const delay = selectedPlatform === "my11circle" ? 3000 : selectedPlatform === "jumbo" ? 1000 : 300;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    setProgressTeam("");
    setTransferring(false);

    if (allTransferred.length > 0) {
      setBulkResult({
        message: `${allTransferred.length}/${storedTeams.length} teams transferred to ${currentPlatform.name}`,
        existingTeamsCount: presentTeamCount,
        newSlots,
        teamsToEdit: allTransferred.filter((t) => t.operation === "edit").length,
        teamsToAdd: allTransferred.filter((t) => t.operation === "add").length,
      });
      toast({
        title: "Transfer complete",
        description: `${allTransferred.length}/${storedTeams.length} teams transferred to ${currentPlatform.name}`,
      });
      fetchExisting();
    } else if (!stopped) {
      toast({
        title: "Transfer failed",
        description: `${allFailed.length} teams failed. Check errors below.`,
        variant: "destructive",
      });
    }
  };

  return (
    <MatchShell matchId={matchId || "nz-sco-wt20"} active="transfer">
      <div style={{ background: "#fff", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#563d7c", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Send size={16} /> Transfer Arena
        </h3>
        <p style={{ fontSize: 12, color: "#6c757d", marginBottom: 12 }}>
          Transfer teams to {currentPlatform.name}. Existing teams can be replaced; new teams are added to empty slots.
        </p>

        {/* Platform selector */}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Fantasy Platform</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {FANTASY_PLATFORMS.map((p) => {
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
                  border: isActive ? `2px solid ${style.bg}` : "1px solid #ddd",
                  background: isActive ? `${style.bg}15` : "#fff",
                  borderRadius: 8,
                  cursor: acc ? "pointer" : "not-allowed",
                  opacity: acc ? 1 : 0.5,
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 6, background: style.bg, color: style.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, margin: "0 auto 4px" }}>
                  {style.abbr}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? style.bg : "#6c757d" }}>{p.name}</div>
                {acc && <CheckCircle2 size={12} color="#28a745" style={{ position: "absolute", top: 4, right: 4 }} />}
              </button>
            );
          })}
        </div>

        {/* Unlinked warning */}
        {!currentAccount && !loadingAccounts && (
          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} color="#856404" />
            <div style={{ flex: 1, fontSize: 12, color: "#856404" }}>
              <strong>{currentPlatform.name} not linked.</strong> Link via OTP to transfer.
            </div>
            <button onClick={() => router.push("/fantasy")} className="btn-tg-primary" style={{ padding: "6px 10px", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Link2 size={12} /> Link
            </button>
          </div>
        )}

        {/* Account info */}
        {currentAccount && (
          <div style={{ background: "#d4edda", borderRadius: 6, padding: 10, marginBottom: 12, fontSize: 12, color: "#155724", display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={14} />
            <span>Linked: <strong>+91 {currentAccount.mobileNumber}</strong> · Limit {limit} teams</span>
          </div>
        )}

        {/* Existing teams status */}
        {currentAccount && (
          <div style={{ background: "#f8f9fa", borderRadius: 6, padding: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <Layers size={12} /> Existing Teams on {currentPlatform.name}
              </span>
              <button onClick={fetchExisting} disabled={fetchingExisting} style={{ padding: "4px 8px", border: "1px solid #563d7c", background: "#fff", color: "#563d7c", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: fetchingExisting ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                {fetchingExisting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Refresh
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: "#fff", borderRadius: 4, padding: 6, textAlign: "center", border: "1px solid #eee" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#dc3545" }}>{presentTeamCount}</div>
                <div style={{ fontSize: 9, color: "#6c757d" }}>Present (replaceable)</div>
              </div>
              <div style={{ flex: 1, background: "#fff", borderRadius: 4, padding: 6, textAlign: "center", border: "1px solid #eee" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#28a745" }}>{newSlots}</div>
                <div style={{ fontSize: 9, color: "#6c757d" }}>New slots (add)</div>
              </div>
              <div style={{ flex: 1, background: "#fff", borderRadius: 4, padding: 6, textAlign: "center", border: "1px solid #eee" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#563d7c" }}>{totalTeams}</div>
                <div style={{ fontSize: 9, color: "#6c757d" }}>Generated</div>
              </div>
            </div>
          </div>
        )}

        {/* No generated teams warning */}
        {totalTeams === 0 && !loadingAccounts && (
          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} color="#856404" />
            <div style={{ flex: 1, fontSize: 12, color: "#856404" }}>
              <strong>No generated teams.</strong> Generate teams first.
            </div>
            <button onClick={() => router.push(`/match/${matchId}/smart`)} className="btn-tg-primary" style={{ padding: "6px 10px", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Zap size={12} /> Generate
            </button>
          </div>
        )}

        {/* Transfer modes (3 modes like original) */}
        {currentAccount && totalTeams > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Transfer Mode</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Mode 1: All (edit existing + add new) */}
              <button
                onClick={() => setTransferMode("all")}
                style={{
                  padding: 10,
                  border: transferMode === "all" ? "2px solid #563d7c" : "1px solid #ddd",
                  background: transferMode === "all" ? "#f5f0fa" : "#fff",
                  borderRadius: 6,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Edit3 size={16} color="#563d7c" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#212529" }}>Mode 1: Add New + Replace</div>
                  <div style={{ fontSize: 10, color: "#6c757d" }}>
                    Add {Math.min(totalTeams, newSlots)} new + replace {Math.max(0, totalTeams - newSlots)} existing
                  </div>
                </div>
              </button>
              {/* Mode 2: New only */}
              <button
                onClick={() => setTransferMode("newOnly")}
                style={{
                  padding: 10,
                  border: transferMode === "newOnly" ? "2px solid #563d7c" : "1px solid #ddd",
                  background: transferMode === "newOnly" ? "#f5f0fa" : "#fff",
                  borderRadius: 6,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Plus size={16} color="#28a745" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#212529" }}>Mode 2: Add New Only</div>
                  <div style={{ fontSize: 10, color: "#6c757d" }}>
                    Add {Math.min(totalTeams, newSlots)} new teams (no replace)
                  </div>
                </div>
              </button>
              {/* Mode 3: Custom */}
              <button
                onClick={() => setTransferMode("custom")}
                style={{
                  padding: 10,
                  border: transferMode === "custom" ? "2px solid #563d7c" : "1px solid #ddd",
                  background: transferMode === "custom" ? "#f5f0fa" : "#fff",
                  borderRadius: 6,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Layers size={16} color="#f0ad4e" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#212529" }}>Mode 3: Custom (X + Y)</div>
                  <div style={{ fontSize: 10, color: "#6c757d" }}>Replace X + add Y teams</div>
                </div>
              </button>
            </div>

            {/* Custom inputs */}
            {transferMode === "custom" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "#6c757d", display: "block", marginBottom: 4 }}>Replace (max {presentTeamCount})</label>
                  <input
                    type="number"
                    min={0}
                    max={presentTeamCount}
                    value={customReplaceCount}
                    onChange={(e) => setCustomReplaceCount(Math.max(0, Math.min(parseInt(e.target.value, 10) || 0, presentTeamCount)))}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13, fontWeight: 600 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "#6c757d", display: "block", marginBottom: 4 }}>Add (max {newSlots})</label>
                  <input
                    type="number"
                    min={0}
                    max={newSlots}
                    value={customAddCount}
                    onChange={(e) => setCustomAddCount(Math.max(0, Math.min(parseInt(e.target.value, 10) || 0, newSlots)))}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13, fontWeight: 600 }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transfer button */}
        {currentAccount && totalTeams > 0 && (
          <button
            onClick={() => doTransfer(transferMode)}
            disabled={transferring}
            className="btn-tg-success"
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: transferring ? "wait" : "pointer",
              opacity: transferring ? 0.7 : 1,
            }}
          >
            {transferring ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Transferring {progressCurrent}/{progressTotal}...
              </>
            ) : (
              <>
                <Send size={16} /> Start Transfer ({transferMode === "all" ? totalTeams : transferMode === "newOnly" ? Math.min(totalTeams, newSlots) : customReplaceCount + customAddCount} teams)
              </>
            )}
          </button>
        )}

        {/* Live progress bar during transfer */}
        {transferring && progressTotal > 0 && (
          <div style={{ marginTop: 12, marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "#563d7c", marginBottom: 4 }}>
              <span>{progressTeam || "Transferring..."}</span>
              <span>{progressCurrent}/{progressTotal} ({Math.round((progressCurrent / progressTotal) * 100)}%)</span>
            </div>
            {/* Progress bar */}
            <div style={{ width: "100%", height: 8, background: "#e9ecef", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  width: `${(progressCurrent / progressTotal) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #563d7c, #28a745)",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            {/* Live counters */}
            <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11 }}>
              <span style={{ color: "#28a745", fontWeight: 600 }}>
                ✓ {transferred.length} transferred
              </span>
              <span style={{ color: "#dc3545", fontWeight: 600 }}>
                ✗ {failedTeams.length} failed
              </span>
              <span style={{ color: "#6c757d" }}>
                ⏳ {progressTotal - progressCurrent - failedTeams.length - transferred.length} remaining
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transfer result summary */}
      {bulkResult && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: transferred.length > 0 ? "#28a745" : "#dc3545", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            {transferred.length > 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            Transfer Summary
          </h4>
          <div style={{ background: transferred.length > 0 ? "#d4edda" : "#fdecee", borderRadius: 6, padding: 10, marginBottom: 10, fontSize: 12, color: transferred.length > 0 ? "#155724" : "#dc3545" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{bulkResult.message}</div>
            <div>
              Existing: {bulkResult.existingTeamsCount} · New slots: {bulkResult.newSlots} ·
              Edit: {bulkResult.teamsToEdit} · Add: {bulkResult.teamsToAdd}
            </div>
          </div>
          {transferred.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 100, overflowY: "auto" }} className="tg-scroll">
              {transferred.map((t: any, i: number) => (
                <span key={i} style={{ background: t.operation === "edit" ? "#fff3cd" : "#d4edda", color: t.operation === "edit" ? "#856404" : "#155724", padding: "3px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600 }}>
                  #{t.team_number} {t.operation === "edit" ? "↻" : "+"}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Failed teams */}
      {failedTeams.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f5c6cb" }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "#dc3545", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={16} /> Failed Teams ({failedTeams.length})
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {failedTeams.map((f: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 8px", background: "#fdecee", borderRadius: 4 }}>
                <span style={{ fontWeight: 600, color: "#dc3545" }}>Team #{f.team_number}</span>
                <span style={{ color: "#6c757d" }}>{f.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <a href="/fantasy" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 8, padding: "12px 14px", textDecoration: "none", color: "#212529", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link2 size={18} color="#563d7c" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Manage Fantasy Accounts</span>
        </span>
        <ChevronRight size={16} color="#6c757d" />
      </a>
    </MatchShell>
  );
}
