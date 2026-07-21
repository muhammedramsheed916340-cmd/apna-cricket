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
  // NO hardcoded transfer limit — backend enforces real platform limits.
  // All generated teams are attempted; failures are reported, never silently skipped.
  const presentTeamCount = existingTeams.length;
  const toAddCount = Math.max(0, totalTeams - presentTeamCount);

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
        description: `Please link your ${currentPlatform.name} account via OTP first`,
        variant: "destructive",
      });
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

    // NO hardcoded limit — process ALL generated teams.
    // Backend enforces real platform limits; failures are reported, never silently skipped.
    let teamsToAdd: number;
    let teamsToEdit: number;
    if (mode === "newOnly") {
      // Add ALL generated teams as new (no cap)
      teamsToAdd = storedTeams.length;
      teamsToEdit = 0;
    } else if (mode === "custom") {
      // User-specified X edit + Y add (bounded by available teams/existing)
      teamsToEdit = Math.min(customReplaceCount, presentCount, storedTeams.length);
      teamsToAdd = Math.min(customAddCount, storedTeams.length - teamsToEdit);
    } else {
      // mode === "all": replace ALL existing, add the rest as new — NO teams skipped
      teamsToEdit = Math.min(presentCount, storedTeams.length);
      teamsToAdd = storedTeams.length - teamsToEdit;
    }

    // Process every team in the plan — no silent skipping.
    // For "all"/"newOnly" this equals storedTeams.length; for "custom" it's X+Y.
    const totalToProcess = teamsToAdd + teamsToEdit;
    const allTransferred: any[] = [];
    const allFailed: any[] = [];
    let stopped = false;

    // Helper: transfer a single team — matches original exactly
    // Original: single attempt per team (s=!!{}[u.slug] = false → NO retry)
    // Delay: dream11=220ms, my11circle=3000ms, myteam11=3000ms
    const transferOne = async (team: any, isEdit: boolean, existingId?: string): Promise<{ ok: boolean; error?: string }> => {
      let userToken = "";
      try { userToken = localStorage.getItem("user_token") || ""; } catch {}

      // Get platform-specific fantasy IDs
      // Matches the authoritative helper in tg-api.ts — tries multiple name variants
      // because backend may store platform key as "my11circle", "mycircle", etc.
      const getPlatformId = (p: any): number => {
        if (typeof p === "number") return p;
        if (!p) return 0;
        if (p.fantasyIdList && Array.isArray(p.fantasyIdList)) {
          // Try exact match first, then variant with "11" stripped (mycircle)
          const variants = [selectedPlatform, selectedPlatform.replace("11", "")];
          for (const v of variants) {
            const found = p.fantasyIdList.find((f: any) => f.name === v);
            if (found && found.id) return found.id;
          }
        }
        // Fallback to default fantasyId (Dream11 ID) — only safe for Dream11
        return p.fantasyId || 0;
      };

      const playerIds = (team.players || []).map((p: any) => getPlatformId(p)).filter((n: number) => n > 0);

      // Captain/VC: use platform-specific ID. Do NOT fallback to random squad member
      // if mapping fails — that would send wrong captain silently.
      const captainId = getPlatformId(team.captain);
      const viceCaptainId = getPlatformId(team.vicecaptain);

      if (playerIds.length < 11) {
        return { ok: false, error: `Invalid team data (${playerIds.length} players, need 11)` };
      }
      if (!captainId) {
        return { ok: false, error: `Captain ID not found for ${selectedPlatform} (player: ${team.captain?.name || "?"})` };
      }
      if (!viceCaptainId) {
        return { ok: false, error: `Vice Captain ID not found for ${selectedPlatform} (player: ${team.vicecaptain?.name || "?"})` };
      }
      // Ensure captain and VC are different
      if (captainId === viceCaptainId) {
        return { ok: false, error: "Captain and Vice Captain cannot be the same player" };
      }

      // Build payload — EXACT match to original
      const transferPayload: Record<string, unknown> = {
        matchId,
        captain: captainId,
        vice_captain: viceCaptainId,
        players: playerIds,
        fantasyApp: selectedPlatform,
        authToken: currentAccount?.authToken || "",
        sportIndex: 0, // cricket=0 (only cricket supported)
        type: isEdit ? "edit" : "new",
        userToken,
      };

      // For edit, include the existing team_id as-is (string from backend)
      if (isEdit && existingId) {
        transferPayload.id = existingId;
      } else if (isEdit && !existingId) {
        transferPayload.type = "new"; // fall back to add
      }

      // My11Circle-specific fields (String()-convert matching original)
      if (selectedPlatform === "my11circle" && currentAccount) {
        if (currentAccount.my11circleChallenge) transferPayload.my11circleChallenge = String(currentAccount.my11circleChallenge);
        if (currentAccount.my11circleUserId) transferPayload.my11circleUserId = String(currentAccount.my11circleUserId);
        if (currentAccount.mobileNumber) transferPayload.my11circleMobile = String(currentAccount.mobileNumber);
      }
      if (currentAccount?.mobileNumber) {
        transferPayload.mobileNumber = currentAccount.mobileNumber;
      }

      try {
        const res = await fetch("/api/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transferPayload),
        });
        const data = await res.json();

        if (data?.status === "success") {
          return { ok: true };
        }

        // Token expired → hard stop
        if (data?.code === "TOKEN_EXPIRED" || data?.code === "NO_AUTH_TOKEN") {
          return { ok: false, error: data?.error || "Session expired. Re-link via OTP." };
        }
        if (data?.code === "DEADLINE_PASSED") {
          return { ok: false, error: "Match deadline passed" };
        }

        return { ok: false, error: data?.error || data?.message || data?.backendError || "Transfer failed" };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    };

    // Process teams ONE BY ONE — matches original (no retry, single attempt)
    for (let i = 0; i < totalToProcess; i++) {
      if (stopped) break;
      const team = storedTeams[i];
      const isEdit = i >= teamsToAdd; // first teamsToAdd are NEW, rest are EDIT
      setProgressCurrent(i + 1);
      setProgressTeam(`Team #${team.team_number} (${i + 1}/${totalToProcess}) ${isEdit ? "REPLACE" : "NEW"}`);

      const existingId = isEdit ? existingTeamIds[i - teamsToAdd] : undefined;
      const result = await transferOne(team, isEdit, existingId);

      if (result.ok) {
        allTransferred.push({
          team_number: team.team_number,
          status: "transferred",
          operation: isEdit ? "edit" : "add",
        });
        setTransferred([...allTransferred]);
      } else {
        // Token expired → stop the whole batch
        if (/session expired|re-link via otp|token expired|no auth token/i.test(result.error || "")) {
          allFailed.push({ team_number: team.team_number, error: result.error || "Session expired" });
          setFailedTeams([...allFailed]);
          stopped = true;
          break;
        }
        allFailed.push({ team_number: team.team_number, error: result.error || "Transfer failed" });
        setFailedTeams([...allFailed]);
      }

      // Platform-specific delay — EXACT match to original:
      // dream11=220ms, my11circle=3000ms, jumbo=3000ms
      if (i < totalToProcess - 1) {
        const delay = selectedPlatform === "dream11" ? 220 : 3000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    setProgressTeam("");
    setTransferring(false);

    if (allTransferred.length > 0) {
      setBulkResult({
        message: `${allTransferred.length}/${storedTeams.length} teams transferred to ${currentPlatform.name}`,
        existingTeamsCount: presentTeamCount,
        attempted: storedTeams.length,
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
    <MatchShell matchId={matchId || "loading"} active="transfer">
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <h3
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "#e8eefc",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Send size={16} color="#34d399" /> Transfer Arena
        </h3>
        <p style={{ fontSize: 12, color: "#8a94b3", marginBottom: 12, lineHeight: 1.5 }}>
          Transfer teams to {currentPlatform.name}. Existing teams can be replaced;
          new teams are added to empty slots.
        </p>

        {/* Platform selector */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eefc", marginBottom: 8 }}>
          Fantasy Platform
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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
                  border: isActive ? `2px solid ${style.bg}` : "1px solid rgba(255,255,255,0.08)",
                  background: isActive ? `${style.bg}20` : "rgba(255,255,255,0.03)",
                  borderRadius: 12,
                  cursor: acc ? "pointer" : "not-allowed",
                  opacity: acc ? 1 : 0.5,
                  textAlign: "center",
                  position: "relative",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: style.bg,
                    color: style.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    margin: "0 auto 4px",
                  }}
                >
                  {style.abbr}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isActive ? style.bg : "#8a94b3",
                  }}
                >
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
        {!currentAccount && !loadingAccounts && (
          <div
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertCircle size={18} color="#f59e0b" />
            <div style={{ flex: 1, fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>
              <strong>{currentPlatform.name} not linked.</strong> Link via OTP to transfer.
            </div>
            <button
              onClick={() => router.push("/fantasy")}
              style={{
                padding: "6px 12px",
                border: "none",
                borderRadius: 8,
                color: "#04130d",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: "linear-gradient(135deg, #34d399, #10b981)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Link2 size={12} /> Link
            </button>
          </div>
        )}

        {/* Account info */}
        {currentAccount && (
          <div
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: 10,
              padding: 10,
              marginBottom: 12,
              fontSize: 12,
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={14} />
            <span>
              Linked: <strong>+91 {currentAccount.mobileNumber}</strong> · No transfer limit
            </span>
          </div>
        )}

        {/* Existing teams status */}
        {currentAccount && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#e8eefc",
                }}
              >
                <Layers size={13} color="#06b6d4" /> Existing Teams on {currentPlatform.name}
              </span>
              <button
                onClick={fetchExisting}
                disabled={fetchingExisting}
                style={{
                  padding: "5px 10px",
                  border: "1px solid rgba(52,211,153,0.3)",
                  background: "rgba(16,185,129,0.1)",
                  color: "#34d399",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: fetchingExisting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {fetchingExisting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Refresh
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  padding: 8,
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f43f5e" }}>
                  {presentTeamCount}
                </div>
                <div style={{ fontSize: 9, color: "#8a94b3" }}>Present</div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  padding: 8,
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: "#34d399" }}>
                  {toAddCount}
                </div>
                <div style={{ fontSize: 9, color: "#8a94b3" }}>To add</div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  padding: 8,
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: "#06b6d4" }}>
                  {totalTeams}
                </div>
                <div style={{ fontSize: 9, color: "#8a94b3" }}>Generated</div>
              </div>
            </div>
          </div>
        )}

        {/* No generated teams warning */}
        {totalTeams === 0 && !loadingAccounts && (
          <div
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertCircle size={18} color="#f59e0b" />
            <div style={{ flex: 1, fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>
              <strong>No generated teams.</strong> Generate teams first.
            </div>
            <button
              onClick={() => router.push(`/match/${matchId}/smart`)}
              style={{
                padding: "6px 12px",
                border: "none",
                borderRadius: 8,
                color: "#04130d",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: "linear-gradient(135deg, #34d399, #10b981)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Zap size={12} /> Generate
            </button>
          </div>
        )}

        {/* Transfer modes */}
        {currentAccount && totalTeams > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eefc", marginBottom: 8 }}>
              Transfer Mode
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Mode 1 */}
              <button
                onClick={() => setTransferMode("all")}
                style={{
                  padding: 12,
                  border:
                    transferMode === "all"
                      ? "1px solid rgba(52,211,153,0.5)"
                      : "1px solid rgba(255,255,255,0.06)",
                  background:
                    transferMode === "all"
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(255,255,255,0.02)",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.2s ease",
                }}
              >
                <Edit3 size={18} color="#06b6d4" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eefc" }}>
                    Mode 1: Add New + Replace
                  </div>
                  <div style={{ fontSize: 10, color: "#8a94b3" }}>
                    Replace {Math.min(presentTeamCount, totalTeams)} existing + add{" "}
                    {Math.max(0, totalTeams - presentTeamCount)} new
                  </div>
                </div>
              </button>
              {/* Mode 2 */}
              <button
                onClick={() => setTransferMode("newOnly")}
                style={{
                  padding: 12,
                  border:
                    transferMode === "newOnly"
                      ? "1px solid rgba(52,211,153,0.5)"
                      : "1px solid rgba(255,255,255,0.06)",
                  background:
                    transferMode === "newOnly"
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(255,255,255,0.02)",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.2s ease",
                }}
              >
                <Plus size={18} color="#34d399" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eefc" }}>
                    Mode 2: Add New Only
                  </div>
                  <div style={{ fontSize: 10, color: "#8a94b3" }}>
                    Add all {totalTeams} generated teams as new
                  </div>
                </div>
              </button>
              {/* Mode 3 */}
              <button
                onClick={() => setTransferMode("custom")}
                style={{
                  padding: 12,
                  border:
                    transferMode === "custom"
                      ? "1px solid rgba(52,211,153,0.5)"
                      : "1px solid rgba(255,255,255,0.06)",
                  background:
                    transferMode === "custom"
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(255,255,255,0.02)",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.2s ease",
                }}
              >
                <Layers size={18} color="#f59e0b" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eefc" }}>
                    Mode 3: Custom (X + Y)
                  </div>
                  <div style={{ fontSize: 10, color: "#8a94b3" }}>
                    Replace X + add Y teams
                  </div>
                </div>
              </button>
            </div>

            {/* Custom inputs */}
            {transferMode === "custom" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#8a94b3",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Replace (max {presentTeamCount})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={presentTeamCount}
                    value={customReplaceCount}
                    onChange={(e) =>
                      setCustomReplaceCount(
                        Math.max(0, Math.min(parseInt(e.target.value, 10) || 0, presentTeamCount))
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#e8eefc",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#8a94b3",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Add
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={totalTeams}
                    value={customAddCount}
                    onChange={(e) =>
                      setCustomAddCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#e8eefc",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
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
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 800,
              color: "#04130d",
              background: "linear-gradient(135deg, #34d399, #10b981)",
              cursor: transferring ? "wait" : "pointer",
              opacity: transferring ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 6px 16px rgba(16,185,129,0.3)",
              transition: "all 0.2s ease",
            }}
          >
            {transferring ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Transferring {progressCurrent}/
                {progressTotal}...
              </>
            ) : (
              <>
                <Send size={16} /> Start Transfer (
                {transferMode === "all"
                  ? totalTeams
                  : transferMode === "newOnly"
                  ? totalTeams
                  : customReplaceCount + customAddCount}{" "}
                teams)
              </>
            )}
          </button>
        )}

        {/* Live progress bar */}
        {transferring && progressTotal > 0 && (
          <div style={{ marginTop: 12, marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontWeight: 700,
                color: "#34d399",
                marginBottom: 4,
              }}
            >
              <span>{progressTeam || "Transferring..."}</span>
              <span>
                {progressCurrent}/{progressTotal} (
                {Math.round((progressCurrent / progressTotal) * 100)}%)
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(progressCurrent / progressTotal) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #34d399, #06b6d4)",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11 }}>
              <span style={{ color: "#34d399", fontWeight: 700 }}>
                ✓ {transferred.length} transferred
              </span>
              <span style={{ color: "#f43f5e", fontWeight: 700 }}>
                ✗ {failedTeams.length} failed
              </span>
              <span style={{ color: "#8a94b3" }}>
                ⏳{" "}
                {Math.max(0, progressTotal - transferred.length - failedTeams.length)}{" "}
                remaining
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transfer result summary */}
      {bulkResult && (
        <div
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 14,
            marginBottom: 12,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <h4
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: transferred.length > 0 ? "#34d399" : "#f43f5e",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {transferred.length > 0 ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            Transfer Summary
          </h4>
          <div
            style={{
              background:
                transferred.length > 0
                  ? "rgba(16,185,129,0.1)"
                  : "rgba(244,63,94,0.1)",
              border:
                transferred.length > 0
                  ? "1px solid rgba(16,185,129,0.25)"
                  : "1px solid rgba(244,63,94,0.25)",
              borderRadius: 10,
              padding: 10,
              marginBottom: 10,
              fontSize: 12,
              color: transferred.length > 0 ? "#34d399" : "#f43f5e",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{bulkResult.message}</div>
            <div>
              Existing: {bulkResult.existingTeamsCount} · Attempted: {bulkResult.attempted} ·
              Edit: {bulkResult.teamsToEdit} · Add: {bulkResult.teamsToAdd}
            </div>
          </div>
          {transferred.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                maxHeight: 100,
                overflowY: "auto",
              }}
              className="ac-scroll"
            >
              {transferred.map((t: any, i: number) => (
                <span
                  key={i}
                  style={{
                    background:
                      t.operation === "edit"
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(16,185,129,0.15)",
                    border:
                      t.operation === "edit"
                        ? "1px solid rgba(245,158,11,0.3)"
                        : "1px solid rgba(16,185,129,0.3)",
                    color:
                      t.operation === "edit" ? "#f59e0b" : "#34d399",
                    padding: "3px 7px",
                    borderRadius: 5,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  #{t.team_number} {t.operation === "edit" ? "↻" : "+"}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Failed teams */}
      {failedTeams.length > 0 && (
        <div
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(244,63,94,0.3)",
            borderRadius: 16,
            padding: 14,
            marginBottom: 12,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <h4
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#f43f5e",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircle size={16} /> Failed Teams ({failedTeams.length})
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {failedTeams.map((f: any, i: number) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  padding: "6px 10px",
                  background: "rgba(244,63,94,0.08)",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontWeight: 700, color: "#f43f5e" }}>
                  Team #{f.team_number}
                </span>
                <span style={{ color: "#8a94b3", textAlign: "right", flex: 1, marginLeft: 8 }}>
                  {f.error}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manage accounts link */}
      <a
        href="/fantasy"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "14px 16px",
          textDecoration: "none",
          color: "#e8eefc",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link2 size={18} color="#06b6d4" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Manage Fantasy Accounts</span>
        </span>
        <ChevronRight size={16} color="#8a94b3" />
      </a>
    </MatchShell>
  );
}
