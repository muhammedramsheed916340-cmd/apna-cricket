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
} from "lucide-react";
import { MatchShell } from "@/components/tg/match-shell";
import { useAuth } from "@/components/tg/auth-provider";
import { useToast } from "@/hooks/use-toast";

export default function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [matchId, setMatchId] = useState("");
  const [hash, setHash] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferred, setTransferred] = useState<number[]>([]);
  const [teamCount, setTeamCount] = useState(5);
  const [teams, setTeams] = useState<{ team_number: number }[]>([]);

  useEffect(() => {
    params.then((p) => setMatchId(p.id));
  }, [params]);

  useEffect(() => {
    if (!matchId) return;
    // load any generated teams from session storage (set by smart/grand/advanced)
    try {
      const raw = sessionStorage.getItem(`tg_teams_${matchId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setTeams(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [matchId]);

  const refreshList = async () => {
    setRefreshing(true);
    try {
      // simulate Dream11 match list refresh
      await new Promise((r) => setTimeout(r, 900));
      setHash(`d11_${matchId}_${Date.now().toString(36)}`);
      toast({
        title: "Dream11 Match List refreshed",
        description: "Hash value updated successfully",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const transferAll = async () => {
    setTransferring(true);
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          teams: teams.length ? teams : Array.from({ length: teamCount }, (_, i) => ({ team_number: i + 1 })),
          action: "all",
        }),
      });
      const data = await res.json();
      if (data?.status === "success") {
        setTransferred(
          (data.teams || []).map((t: { team_number: number }) => t.team_number)
        );
        if (data.hash) setHash(data.hash);
        toast({
          title: "Transfer successful",
          description: data.message,
        });
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
          Transfer your generated teams to Dream11 instantly. Refresh the match
          list to get the latest hash value, then transfer all selected teams.
        </p>

        {/* Dream11 Match List / Hash */}
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
              <span style={{ fontSize: 12, fontWeight: 600 }}>Dream11 Hash Value</span>
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
            {hash || "No hash yet. Click Refresh to get Dream11 match list."}
          </div>
        </div>

        {/* Team count selector */}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Teams to Transfer
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {[1, 2, 5, 10, 20].map((n) => (
            <button
              key={n}
              onClick={() => setTeamCount(n)}
              style={{
                flex: 1,
                padding: "6px 0",
                border: teamCount === n ? "1px solid #563d7c" : "1px solid #ddd",
                background: teamCount === n ? "#563d7c" : "#fff",
                color: teamCount === n ? "#fff" : "#6c757d",
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

        {/* Transfer buttons */}
        <button
          onClick={transferAll}
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
              <Loader2 size={16} className="animate-spin" /> Transferring…
            </>
          ) : (
            <>
              <Send size={16} /> Transfer All Selected Teams
            </>
          )}
        </button>
      </div>

      {/* Transfer summary */}
      {transferred.length > 0 && (
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
            {transferred.length} teams transferred to Dream11 successfully.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {transferred.map((n) => (
              <span
                key={n}
                style={{
                  background: "#d4edda",
                  color: "#155724",
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Team #{n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dream11 link */}
      <a
        href="https://dream11.com"
        target="_blank"
        rel="noopener noreferrer"
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
          <Link2 size={18} color="#dc3545" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Open Dream11</span>
        </span>
        <ChevronRight size={16} color="#6c757d" />
      </a>
    </MatchShell>
  );
}
