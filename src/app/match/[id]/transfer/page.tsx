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
} from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { useToast } from "@/hooks/use-toast";
import { FANTASY_PLATFORMS } from "@/lib/fantasy";
import { getTeams } from "@/lib/teams-storage";

const PLATFORM_STYLE: Record<
  string,
  { bg: string; color: string; abbr: string }
> = {
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
}

export default function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [matchId, setMatchId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("dream11");
  const [hash, setHash] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [bulkTransferring, setBulkTransferring] = useState(false);
  const [transferred, setTransferred] = useState<number[]>([]);
  const [failedTeams, setFailedTeams] = useState<{ team_number: number; error: string }[]>([]);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [totalTeams, setTotalTeams] = useState(20);
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(19);
  const [batchCount, setBatchCount] = useState(5);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

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

  // Load stored generated teams from localStorage so we know how many are transferable
  useEffect(() => {
    if (!matchId) return;
    const stored = getTeams(matchId);
    const count = stored?.teams.length || 0;
    setTotalTeams(count);
    if (count > 0) {
      setFromIdx(0);
      setToIdx(Math.min(count - 1, batchCount - 1));
    }
  }, [matchId, batchCount]);

  const linkedAccounts = accounts.filter((a) => a.linked);
  const currentAccount = linkedAccounts.find((a) => a.slug === selectedPlatform);
  const currentPlatform = FANTASY_PLATFORMS.find((p) => p.slug === selectedPlatform)!;
  const limit = currentPlatform?.limit || 40;

  useEffect(() => {
    // Adjust toIdx when totalTeams changes
    setToIdx(Math.min(fromIdx + batchCount - 1, totalTeams - 1));
  }, [totalTeams, fromIdx, batchCount]);

  const refreshList = async () => {
    setRefreshing(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      setHash(`${selectedPlatform}_${matchId}_${Date.now().toString(36)}`);
      toast({
        title: `${currentPlatform.name} Match List refreshed`,
        description: "Hash value updated successfully",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const transferAll = async () => {
    if (!currentAccount) {
      toast({
        title: "Account not linked",
        description: `Please link your ${currentPlatform.name} account first`,
        variant: "destructive",
      });
      router.push("/fantasy");
      return;
    }
    setTransferring(true);
    setTransferred([]);
    setFailedTeams([]);
    try {
      // Send the real generated team data from localStorage
      const stored = getTeams(matchId);
      const storedTeams = stored?.teams || [];
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          fantasyApp: selectedPlatform,
          action: "all",
          batchCount,
          teams: storedTeams.slice(0, batchCount),
        }),
      });
      const data = await res.json();
      if (data?.status === "success") {
        setTransferred((data.teams || []).map((t: any) => t.team_number));
        setFailedTeams(data.failed || []);
        if (data.hash) setHash(data.hash);
        toast({
          title: "Transfer complete",
          description: data.message,
          variant: (data.failed?.length ?? 0) > 0 ? "destructive" : "default",
        });
      } else {
        if (data?.code === "TOKEN_EXPIRED" || data?.code === "NOT_LINKED") {
          toast({
            title: "Re-link required",
            description: data.message,
            variant: "destructive",
          });
          router.push("/fantasy");
        } else {
          toast({
            title: "Transfer failed",
            description: data?.message || "Something went wrong",
            variant: "destructive",
          });
        }
      }
    } catch (e) {
      toast({
        title: "Transfer error",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const startBulkTransfer = async () => {
    if (!currentAccount) {
      toast({
        title: "Account not linked",
        description: `Please link your ${currentPlatform.name} account first`,
        variant: "destructive",
      });
      return;
    }
    const count = toIdx - fromIdx + 1;
    if (count <= 0 || count > 500) {
      toast({
        title: "Invalid range",
        description: "Range must be between 1 and 500 teams",
        variant: "destructive",
      });
      return;
    }
    setBulkTransferring(true);
    setBulkResult(null);
    try {
      const stored = getTeams(matchId);
      const storedTeams = stored?.teams || [];
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          fantasyApp: selectedPlatform,
          action: "bulk",
          fromIdx,
          toIdx,
          teams: storedTeams,
        }),
      });
      const data = await res.json();
      if (data?.status === "success") {
        setBulkResult(data);
        if (data.hash) setHash(data.hash);
        toast({ title: "Bulk Transfer Complete", description: data.message });
      } else {
        toast({
          title: "Bulk transfer failed",
          description: data?.message,
          variant: "destructive",
        });
      }
    } finally {
      setBulkTransferring(false);
    }
  };

  const joinAllContests = async () => {
    if (!currentAccount) {
      toast({
        title: "Account not linked",
        description: `Please link your ${currentPlatform.name} account first`,
        variant: "destructive",
      });
      router.push("/fantasy");
      return;
    }
    setTransferring(true);
    setTransferred([]);
    setFailedTeams([]);
    try {
      const stored = getTeams(matchId);
      const storedTeams = stored?.teams || [];
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          fantasyApp: selectedPlatform,
          action: "join-contests",
          batchCount,
          teams: storedTeams.slice(0, batchCount),
        }),
      });
      const data = await res.json();
      if (data?.status === "success") {
        setTransferred((data.teams || []).map((t: any) => t.team_number));
        setFailedTeams(data.failed || []);
        if (data.hash) setHash(data.hash);
        toast({ title: "Contests Joined", description: data.message });
      } else {
        if (data?.code === "TOKEN_EXPIRED" || data?.code === "NOT_LINKED") {
          toast({
            title: "Re-link required",
            description: data.message,
            variant: "destructive",
          });
          router.push("/fantasy");
        } else {
          toast({
            title: "Failed",
            description: data?.message || "Something went wrong",
            variant: "destructive",
          });
        }
      }
    } finally {
      setTransferring(false);
    }
  };

  return (
    <MatchShell matchId={matchId || "nz-sco-wt20"} active="transfer">
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
            color: "#563d7c",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Send size={16} /> Transfer Arena
        </h3>
        <p style={{ fontSize: 12, color: "#6c757d", marginBottom: 12 }}>
          Transfer generated teams directly to Dream11, My11Circle, or Jumbo.
          Supports 0-500 teams with bulk transfer &amp; all-contest join.
        </p>

        {/* Platform selector */}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Select Fantasy Platform
        </div>
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
                  border: isActive
                    ? `2px solid ${style.bg}`
                    : "1px solid #ddd",
                  background: isActive ? `${style.bg}15` : "#fff",
                  borderRadius: 8,
                  cursor: acc ? "pointer" : "not-allowed",
                  opacity: acc ? 1 : 0.5,
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
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
                    fontWeight: 600,
                    color: isActive ? style.bg : "#6c757d",
                  }}
                >
                  {p.name}
                </div>
                {acc && (
                  <CheckCircle2
                    size={12}
                    color="#28a745"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                    }}
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
              background: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertCircle size={18} color="#856404" />
            <div style={{ flex: 1, fontSize: 12, color: "#856404" }}>
              <strong>{currentPlatform.name} not linked.</strong> Link your
              account via OTP to transfer teams.
            </div>
            <button
              onClick={() => router.push("/fantasy")}
              className="btn-tg-primary"
              style={{
                padding: "6px 10px",
                border: "none",
                borderRadius: 4,
                color: "#fff",
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

        {/* No generated teams warning */}
        {totalTeams === 0 && !loadingAccounts && (
          <div
            style={{
              background: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertCircle size={18} color="#856404" />
            <div style={{ flex: 1, fontSize: 12, color: "#856404" }}>
              <strong>No generated teams.</strong> Generate teams first (Smart /
              Grand / Advanced) to enable transfer.
            </div>
            <button
              onClick={() => router.push(`/match/${matchId}/smart`)}
              className="btn-tg-primary"
              style={{
                padding: "6px 10px",
                border: "none",
                borderRadius: 4,
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Zap size={12} /> Generate
            </button>
          </div>
        )}

        {/* Account info */}
        {currentAccount && (
          <div
            style={{
              background: "#d4edda",
              borderRadius: 6,
              padding: 10,
              marginBottom: 12,
              fontSize: 12,
              color: "#155724",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={14} />
            <span>
              Linked: <strong>+91 {currentAccount.mobileNumber}</strong> · Limit{" "}
              {limit} teams/batch
            </span>
          </div>
        )}

        {/* Hash value */}
        <div
          style={{
            background: "#f8f9fa",
            borderRadius: 6,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Hash size={14} color="#563d7c" />
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {currentPlatform.name} Hash Value
              </span>
            </div>
            <button
              onClick={refreshList}
              disabled={refreshing}
              style={{
                padding: "4px 8px",
                border: "1px solid #563d7c",
                background: "#fff",
                color: "#563d7c",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: refreshing ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {refreshing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              Refresh
            </button>
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: hash ? "#28a745" : "#999",
              wordBreak: "break-all",
              background: "#fff",
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px solid #eee",
            }}
          >
            {hash || "No hash yet. Click Refresh to get match list."}
          </div>
        </div>

        {/* Quick transfer - batch count */}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Quick Transfer (Teams per batch)
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {[1, 5, 10, 20, 40].map((n) => (
            <button
              key={n}
              onClick={() => setBatchCount(n)}
              disabled={n > limit}
              style={{
                flex: 1,
                padding: "6px 0",
                border:
                  batchCount === n ? "1px solid #563d7c" : "1px solid #ddd",
                background: batchCount === n ? "#563d7c" : "#fff",
                color: batchCount === n ? "#fff" : "#6c757d",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: n > limit ? "not-allowed" : "pointer",
                opacity: n > limit ? 0.4 : 1,
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={transferAll}
            disabled={transferring || !currentAccount || totalTeams === 0}
            className="btn-tg-success"
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: transferring || !currentAccount || totalTeams === 0 ? "not-allowed" : "pointer",
              opacity: transferring || !currentAccount || totalTeams === 0 ? 0.6 : 1,
            }}
          >
            {transferring ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Transfer {batchCount}
          </button>
          <button
            onClick={joinAllContests}
            disabled={transferring || !currentAccount || totalTeams === 0}
            style={{
              flex: 1,
              padding: "12px",
              border: "1px solid #563d7c",
              background: "#fff",
              color: "#563d7c",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: transferring || !currentAccount || totalTeams === 0 ? "not-allowed" : "pointer",
              opacity: transferring || !currentAccount || totalTeams === 0 ? 0.6 : 1,
            }}
          >
            <Trophy size={14} />
            Join All
          </button>
        </div>
      </div>

      {/* Bulk transfer section */}
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 14,
          marginBottom: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <h4
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#212529",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Layers size={16} color="#563d7c" /> Bulk Transfer (0-500 Teams)
        </h4>
        <p style={{ fontSize: 11, color: "#6c757d", marginBottom: 12 }}>
          Transfer a range of teams. Max {limit} per batch for{" "}
          {currentPlatform.name}, up to 500 total.
        </p>

        {/* Total teams */}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Total Teams Generated:{" "}
          <span style={{ color: "#563d7c" }}>{totalTeams}</span>
        </div>
        <input
          type="range"
          min={0}
          max={500}
          value={totalTeams}
          onChange={(e) => setTotalTeams(parseInt(e.target.value, 10))}
          style={{ width: "100%", marginBottom: 14, accentColor: "#563d7c" }}
        />

        {/* From / To range */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#6c757d",
                display: "block",
                marginBottom: 4,
              }}
            >
              From Team #
            </label>
            <input
              type="number"
              min={1}
              max={totalTeams}
              value={fromIdx + 1}
              onChange={(e) =>
                setFromIdx(
                  Math.max(0, Math.min(parseInt(e.target.value, 10) - 1, totalTeams - 1))
                )
              }
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #ddd",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#6c757d",
                display: "block",
                marginBottom: 4,
              }}
            >
              To Team #
            </label>
            <input
              type="number"
              min={1}
              max={totalTeams}
              value={toIdx + 1}
              onChange={(e) =>
                setToIdx(
                  Math.max(0, Math.min(parseInt(e.target.value, 10) - 1, totalTeams - 1))
                )
              }
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #ddd",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
              }}
            />
          </div>
        </div>

        <div
          style={{
            background: "#f8f9fa",
            borderRadius: 6,
            padding: 8,
            marginBottom: 12,
            fontSize: 12,
            color: "#6c757d",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Teams in range:</span>
          <strong style={{ color: "#563d7c" }}>
            {Math.max(0, toIdx - fromIdx + 1)} teams
          </strong>
        </div>

        <button
          onClick={startBulkTransfer}
          disabled={bulkTransferring || !currentAccount || totalTeams === 0}
          className="btn-tg-primary"
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: bulkTransferring || !currentAccount || totalTeams === 0 ? "not-allowed" : "pointer",
            opacity: bulkTransferring || !currentAccount || totalTeams === 0 ? 0.6 : 1,
          }}
        >
          {bulkTransferring ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Bulk Transfer in Progress…
            </>
          ) : (
            <>
              <Zap size={16} /> Start Bulk Transfer
            </>
          )}
        </button>
      </div>

      {/* Quick transfer summary */}
      {transferred.length > 0 && !bulkResult && (
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 14,
            marginBottom: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <h4
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#28a745",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CheckCircle2 size={16} /> Transfer Summary
          </h4>
          <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 8 }}>
            {transferred.length} teams transferred to {currentPlatform.name}.
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              maxHeight: 120,
              overflowY: "auto",
            }}
            className="tg-scroll"
          >
            {transferred.map((n) => (
              <span
                key={n}
                style={{
                  background: "#d4edda",
                  color: "#155724",
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                #{n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Failed teams display */}
      {failedTeams.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 14,
            marginBottom: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #f5c6cb",
          }}
        >
          <h4
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#dc3545",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircle size={16} /> Failed Teams ({failedTeams.length})
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {failedTeams.map((f) => (
              <div
                key={f.team_number}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  padding: "4px 8px",
                  background: "#fdecee",
                  borderRadius: 4,
                }}
              >
                <span style={{ fontWeight: 600, color: "#dc3545" }}>
                  Team #{f.team_number}
                </span>
                <span style={{ color: "#6c757d" }}>{f.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk transfer summary */}
      {bulkResult && (
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 14,
            marginBottom: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <h4
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#28a745",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CheckCircle2 size={16} /> Bulk Transfer Summary
          </h4>
          <div
            style={{
              background: "#d4edda",
              borderRadius: 6,
              padding: 10,
              marginBottom: 10,
              fontSize: 12,
              color: "#155724",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {bulkResult.message}
            </div>
            <div>
              Range: Team #{bulkResult.range?.from} to #{bulkResult.range?.to} ·{" "}
              {bulkResult.transferred} teams
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              maxHeight: 120,
              overflowY: "auto",
            }}
            className="tg-scroll"
          >
            {(bulkResult.teams || []).map((t: any) => (
              <span
                key={t.team_number}
                style={{
                  background: "#d4edda",
                  color: "#155724",
                  padding: "3px 6px",
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                #{t.team_number}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Link to fantasy page */}
      <a
        href="/fantasy"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          borderRadius: 8,
          padding: "12px 14px",
          textDecoration: "none",
          color: "#212529",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link2 size={18} color="#563d7c" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Manage Fantasy Accounts
          </span>
        </span>
        <ChevronRight size={16} color="#6c757d" />
      </a>
    </MatchShell>
  );
}
