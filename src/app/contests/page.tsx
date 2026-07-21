"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  AlertCircle,
  Gift,
  ChevronRight,
  Crown,
  RefreshCcw,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { Header } from "@/components/tg/header";
import { TopNav } from "@/components/tg/top-nav";
import { BottomNav } from "@/components/tg/bottom-nav";
import { SideNav } from "@/components/tg/side-nav";
import { FeatureLock } from "@/components/premium/FeatureLock";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/lib/subscription-context";
import { FANTASY_PLATFORMS } from "@/lib/fantasy";
import type { Match } from "@/lib/matches";
import { formatCountdown } from "@/lib/matches";

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

// ====== JWT validation (internal — user never sees the token) ======
function isValidJWT(token: string): boolean {
  if (!token || token.trim().length < 20) return false;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0);
}

// Load JWT from user localStorage (shared across all platforms — single login)
function loadJWT(): string {
  try {
    return localStorage.getItem("user_token") || "";
  } catch {
    return "";
  }
}

// Save JWT to user localStorage (shared — single login session)
function saveJWTToStorage(token: string): void {
  try {
    if (token) {
      localStorage.setItem("user_token", token);
    } else {
      localStorage.removeItem("user_token");
    }
  } catch {}
}

export default function ContestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { verified, loading: subLoading, checkAndLock } = useSubscription();
  const [menuOpen, setMenuOpen] = useState(false);
  const [licenseChecked, setLicenseChecked] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("dream11");
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string>("");
  const [matchId, setMatchId] = useState<string>("");
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestsError, setContestsError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinResults, setJoinResults] = useState<Record<string, JoinResult[]>>({});
  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState(false);
  const [now, setNow] = useState<number>(Date.now());

  // ====== Live countdown ticker ======
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ====== Fetch all upcoming matches (with retry) ======
  const fetchMatches = useCallback(async (retryCount = 0): Promise<void> => {
    setMatchesLoading(true);
    setMatchesError("");
    try {
      const res = await fetch("/api/matches", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      const list: Match[] = d?.data || [];
      setMatches(list);

      // Auto-select first match if none selected
      if (list.length > 0) {
        setMatchId((prev) => {
          // Keep existing if still in list, else pick first
          if (prev && list.find((m) => m.id === prev)) return prev;
          return list[0].id;
        });
      } else {
        setMatchesError("No upcoming matches available right now.");
      }
    } catch (e) {
      if (retryCount < 2) {
        // Retry up to 2 times with delay
        setTimeout(() => fetchMatches(retryCount + 1), 1500 * (retryCount + 1));
        setMatchesError(`Network error. Retrying… (${retryCount + 1}/2)`);
      } else {
        setMatchesError("Failed to load matches. Check your connection and try again.");
      }
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  // Initial match fetch
  useEffect(() => {
    // Check URL for matchId param
    try {
      const params = new URLSearchParams(window.location.search);
      const mid = params.get("matchId");
      if (mid) setMatchId(mid);
    } catch {}
    fetchMatches();
    // Auto-refresh matches every 2 minutes
    const interval = setInterval(() => fetchMatches(0), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  // ====== Fetch linked accounts ======
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

  // ====== Auto-load saved JWT on mount (single login session) ======
  useEffect(() => {
    setConnected(!!loadJWT());
  }, []);

  const linkedAccounts = accounts.filter((a) => a.linked);
  const currentAccount = linkedAccounts.find((a) => a.slug === selectedPlatform);
  const currentPlatform = FANTASY_PLATFORMS.find((p) => p.slug === selectedPlatform);
  const selectedMatch = matches.find((m) => m.id === matchId);

  // ====== Connect Account (auto-fetch admin-saved JWT) ======
  // User NEVER sees or edits the JWT value.
  // Click → fetch from admin settings → validate → save to user storage.
  const handleConnectAccount = async (): Promise<void> => {
    setConnecting(true);
    try {
      const res = await fetch("/api/admin/get-jwt", { cache: "no-store" });
      const data = await res.json();

      if (data?.status === "success" && data.available && data.token) {
        // Validate the fetched JWT before saving
        if (!isValidJWT(data.token)) {
          toast({
            title: "Connection failed",
            description: "Admin JWT is invalid. Contact admin to fix.",
            variant: "destructive",
          });
          setConnecting(false);
          return;
        }

        // Never overwrite a valid JWT with empty/invalid — we only save valid tokens
        saveJWTToStorage(data.token);
        setConnected(true);
        toast({
          title: "Account Connected!",
          description: "Session established. All features unlocked.",
        });
      } else {
        toast({
          title: "Not available",
          description: data?.message || "No valid session found. Admin must configure first.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Connection error",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  // ====== Fetch with timeout + retry helper ======
  const fetchWithRetry = async (
    url: string,
    body: Record<string, unknown>,
    maxRetries = 3
  ): Promise<{ ok: boolean; data: any; error: string }> => {
    let lastError = "";
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20000), // 20s timeout
        });

        if (!res.ok) {
          lastError = `HTTP ${res.status} ${res.statusText}`;
          console.warn(`[Contests] ${url} attempt ${attempt + 1} failed: ${lastError}`);
          if (attempt < maxRetries - 1) {
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); // 1.5s, 3s, 4.5s
            continue;
          }
          return { ok: false, data: null, error: lastError };
        }

        const data = await res.json().catch(() => ({}));
        return { ok: true, data, error: "" };
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        const isTimeout = lastError.includes("timeout") || lastError.includes("abort");
        console.warn(`[Contests] ${url} attempt ${attempt + 1} error: ${lastError}`);
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, isTimeout ? 3000 : 1500 * (attempt + 1)));
          continue;
        }
        return {
          ok: false,
          data: null,
          error: isTimeout ? "Request timed out. Check your connection." : lastError,
        };
      }
    }
    return { ok: false, data: null, error: lastError || "Unknown error" };
  };

  // ====== Fetch contests (with retry, timeout, error handling) ======
  const fetchContests = useCallback(async (): Promise<void> => {
    // ====== VALIDATION before fetch ======
    // 1. Match ID must be a non-empty string
    if (!matchId || typeof matchId !== "string" || matchId === "undefined" || matchId === "null") {
      console.warn("[Contests] fetchContests skipped: invalid matchId", matchId);
      return;
    }
    // 2. Account must be linked
    if (!currentAccount || !currentAccount.authToken) {
      console.warn("[Contests] fetchContests skipped: account not linked");
      return;
    }

    setLoading(true);
    setContests([]);
    setContestsError("");

    const userToken = loadJWT();
    console.log(`[Contests] Fetching contests: platform=${selectedPlatform}, matchId=${matchId}, hasJWT=${!!userToken}, hasAuth=${!!currentAccount.authToken}`);

    try {
      // ====== Step 1: Fetch existing teams on the platform ======
      const listResult = await fetchWithRetry("/api/fantasy/list-of-teams", {
        fantasyApp: selectedPlatform,
        matchId,
        userToken,
      }, 3);

      if (!listResult.ok) {
        setContestsError(listResult.error || "Failed to fetch teams");
        toast({
          title: "Failed to fetch teams",
          description: listResult.error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const listData = listResult.data;

      // Check if account is linked
      if (listData?.code === "NOT_LINKED" || listData?.code === "NO_AUTH_TOKEN") {
        setContestsError(`Account not linked. Link your ${currentPlatform?.name} account first.`);
        toast({
          title: "Account not linked",
          description: `Link your ${currentPlatform?.name} account via OTP first.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const teamIds = (listData?.teams_list || [])
        .map((t: any) => parseInt(t.team_id, 10))
        .filter((n: number) => !isNaN(n) && n > 0);

      console.log(`[Contests] Teams found: ${teamIds.length}`);

      if (teamIds.length === 0) {
        setContestsError("NO_TEAMS");
        toast({
          title: "No teams found",
          description: `Transfer teams to ${currentPlatform?.name} first, then come back to join contests.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // ====== Step 2: Fetch free contests for those teams ======
      const contestResult = await fetchWithRetry("/api/fantasy/contests", {
        fantasyApp: selectedPlatform,
        matchId,
        authToken: currentAccount.authToken,
        allTeamIds: teamIds,
        userToken,
      }, 3);

      if (!contestResult.ok) {
        setContestsError(contestResult.error || "Failed to fetch contests");
        toast({
          title: "Failed to fetch contests",
          description: contestResult.error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const data = contestResult.data;

      // Check for auth errors
      if (data?.code === "TOKEN_EXPIRED" || data?.needsReauth) {
        setContestsError(`Session expired on ${currentPlatform?.name}. Re-link via OTP.`);
        toast({
          title: "Session expired",
          description: `Re-link your ${currentPlatform?.name} account via OTP.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data?.status === "success" && Array.isArray(data.contests) && data.contests.length > 0) {
        // ====== Verify contests are open + match not started ======
        const nowMs = Date.now();
        const openContests = data.contests.filter((c: Contest) => {
          // Contest must have available slots
          const available = c.availableSlots || c.maxAllowedTeams || c.maxJoinTeamCount || 0;
          return available > 0;
        });

        console.log(`[Contests] Success: ${data.contests.length} contests, ${openContests.length} open`);

        if (openContests.length > 0) {
          setContests(openContests);
          setContestsError("");
          toast({
            title: "Contests loaded",
            description: `${openContests.length} free contests available on ${currentPlatform?.name}`,
          });
        } else {
          setContests([]);
          setContestsError("NO_OPEN_CONTESTS");
          toast({
            title: "No open contests",
            description: `All contests are full on ${currentPlatform?.name} right now.`,
          });
        }
      } else {
        // Empty response — could be "no contests" or error
        setContests([]);
        const errMsg = data?.error || data?.message || "";
        if (errMsg) {
          setContestsError(errMsg);
          toast({
            title: "No free contests",
            description: errMsg,
          });
        } else {
          setContestsError("NO_CONTESTS");
          toast({
            title: "No free contests",
            description: `No free contests available on ${currentPlatform?.name} right now.`,
          });
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("[Contests] fetchContests error:", errMsg);
      setContestsError(errMsg);
      toast({
        title: "Failed to fetch",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [matchId, currentAccount, selectedPlatform]);

  // ====== Auto-fetch contests when match/platform/account changes ======
  // Use primitive deps (slug, linked, authToken presence) to avoid stale closures
  const accountSlug = currentAccount?.slug;
  const accountLinked = currentAccount?.linked;
  const hasAuthToken = !!currentAccount?.authToken;

  useEffect(() => {
    if (matchId && accountSlug && accountLinked && hasAuthToken) {
      fetchContests();
    }
  }, [matchId, accountSlug, accountLinked, hasAuthToken, fetchContests]);

  // ====== Join Contest with full validation ======
  const joinContest = async (contest: Contest): Promise<void> => {
    // ====== VALIDATION (all checks before join) ======

    // 1. Match selected
    if (!matchId) {
      toast({ title: "No match selected", description: "Select a match first.", variant: "destructive" });
      return;
    }

    // 2. Contest selected (contest object passed)
    if (!contest || !contest.contestId) {
      toast({ title: "No contest selected", description: "Select a contest to join.", variant: "destructive" });
      return;
    }

    // 3. JWT available (auto-loaded from admin settings via Connect Account)
    const userToken = loadJWT();
    if (!userToken) {
      toast({
        title: "Account not connected",
        description: "Click 'Connect Account' to establish your session.",
        variant: "destructive",
      });
      return;
    }

    // 4. Account logged in
    if (!currentAccount || !currentAccount.authToken) {
      toast({
        title: "Account not linked",
        description: `Link your ${currentPlatform?.name} account via OTP first.`,
        variant: "destructive",
      });
      return;
    }

    // 5. Match not started
    if (selectedMatch && selectedMatch.targetTime > 0 && now > selectedMatch.targetTime) {
      toast({
        title: "Match already started",
        description: "Cannot join contests for a match that has already started.",
        variant: "destructive",
      });
      return;
    }

    // 6. Contest still open (available slots > 0)
    const available = contest.availableSlots || contest.maxAllowedTeams || contest.maxJoinTeamCount || 0;
    if (available <= 0) {
      toast({
        title: "Contest full",
        description: "This contest has no available slots.",
        variant: "destructive",
      });
      return;
    }

    // 7. Required IDs available (team IDs to join)
    const toJoin = (contest.notJoinedTeamIds || []).slice(0, available);
    if (toJoin.length === 0) {
      toast({
        title: "Nothing to join",
        description: "All your teams have already joined this contest.",
      });
      return;
    }

    setJoining(contest.contestId);
    try {
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

  // ====== Helper: join a single contest (used by Join All + Smart Mix) ======
  const joinOneContest = async (
    contest: Contest,
    teamIdsToJoin: number[],
    userToken: string,
    retryCount = 0
  ): Promise<{ success: boolean; joined: number; failed: number; error?: string }> => {
    try {
      const res = await fetch("/api/fantasy/join-contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fantasyApp: selectedPlatform,
          matchId,
          authToken: currentAccount?.authToken,
          contestId: contest.contestId,
          teamIds: teamIdsToJoin,
          userToken,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json();

      if (data?.status === "success") {
        const results = data.joinResults || [];
        const success = data.summary?.successCount || results.filter((r: any) => r.success).length;
        const failed = data.summary?.failedCount || results.filter((r: any) => !r.success).length;
        return { success: true, joined: success, failed };
      }

      // Retry on failure (up to 3)
      if (retryCount < 3) {
        await new Promise((r) => setTimeout(r, 1500 * (retryCount + 1)));
        return joinOneContest(contest, teamIdsToJoin, userToken, retryCount + 1);
      }

      return {
        success: false,
        joined: 0,
        failed: teamIdsToJoin.length,
        error: data?.error || "Join failed after 3 retries",
      };
    } catch (e) {
      if (retryCount < 3) {
        await new Promise((r) => setTimeout(r, 1500 * (retryCount + 1)));
        return joinOneContest(contest, teamIdsToJoin, userToken, retryCount + 1);
      }
      return {
        success: false,
        joined: 0,
        failed: teamIdsToJoin.length,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  };

  // ====== Join All — one click joins all available contests ======
  const [joinAllProgress, setJoinAllProgress] = useState<{ current: number; total: number; joined: number; failed: number; status: string } | null>(null);
  const [joinAllRunning, setJoinAllRunning] = useState(false);

  const handleJoinAll = async (): Promise<void> => {
    // ====== VALIDATION ======
    if (!matchId) {
      toast({ title: "No match selected", description: "Select a match first.", variant: "destructive" });
      return;
    }
    if (!currentAccount?.authToken) {
      toast({ title: "Account not linked", description: `Link your ${currentPlatform?.name} account first.`, variant: "destructive" });
      return;
    }
    const userToken = loadJWT();
    if (!userToken) {
      toast({ title: "Account not connected", description: "Click 'Connect Account' first.", variant: "destructive" });
      return;
    }
    if (selectedMatch && selectedMatch.targetTime > 0 && now > selectedMatch.targetTime) {
      toast({ title: "Match started", description: "Cannot join after match started.", variant: "destructive" });
      return;
    }

    // Filter contests: open + has not-joined teams
    const joinable = contests.filter((c) => {
      const available = c.availableSlots || c.maxAllowedTeams || c.maxJoinTeamCount || 0;
      const notJoined = c.notJoinedTeamIds || [];
      return available > 0 && notJoined.length > 0;
    });

    if (joinable.length === 0) {
      toast({ title: "Nothing to join", description: "All contests are full or already joined.", variant: "destructive" });
      return;
    }

    setJoinAllRunning(true);
    setJoinAllProgress({ current: 0, total: joinable.length, joined: 0, failed: 0, status: "Starting…" });

    let totalJoined = 0;
    let totalFailed = 0;
    const failedContests: string[] = [];

    for (let i = 0; i < joinable.length; i++) {
      const contest = joinable[i];
      const available = contest.availableSlots || contest.maxAllowedTeams || contest.maxJoinTeamCount || 1;
      const toJoin = (contest.notJoinedTeamIds || []).slice(0, available);

      setJoinAllProgress({
        current: i + 1,
        total: joinable.length,
        joined: totalJoined,
        failed: totalFailed,
        status: `Joining ${i + 1}/${joinable.length}…`,
      });

      const result = await joinOneContest(contest, toJoin, userToken);
      if (result.success) {
        totalJoined += result.joined;
        totalFailed += result.failed;
      } else {
        totalFailed += result.failed;
        failedContests.push(contest.contestName || contest.contestId);
      }

      // Small delay between contests
      if (i < joinable.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setJoinAllProgress({
      current: joinable.length,
      total: joinable.length,
      joined: totalJoined,
      failed: totalFailed,
      status: `${joinable.length}/${joinable.length} Completed`,
    });

    toast({
      title: "Join All Complete",
      description: `✅ Joined: ${totalJoined}${totalFailed > 0 ? ` · ⚠ Failed: ${totalFailed}` : ""}`,
    });

    setJoinAllRunning(false);
    // Refresh contests
    fetchContests();
  };

  // ====== Smart Mix Join — distribute teams across contests ======
  const [smartMixProgress, setSmartMixProgress] = useState<{ current: number; total: number; joined: number; failed: number; status: string } | null>(null);
  const [smartMixRunning, setSmartMixRunning] = useState(false);

  const handleSmartMixJoin = async (): Promise<void> => {
    // ====== VALIDATION ======
    if (!matchId) {
      toast({ title: "No match selected", description: "Select a match first.", variant: "destructive" });
      return;
    }
    if (!currentAccount?.authToken) {
      toast({ title: "Account not linked", description: `Link your ${currentPlatform?.name} account first.`, variant: "destructive" });
      return;
    }
    const userToken = loadJWT();
    if (!userToken) {
      toast({ title: "Account not connected", description: "Click 'Connect Account' first.", variant: "destructive" });
      return;
    }
    if (selectedMatch && selectedMatch.targetTime > 0 && now > selectedMatch.targetTime) {
      toast({ title: "Match started", description: "Cannot join after match started.", variant: "destructive" });
      return;
    }

    // Collect all not-joined team IDs across contests (deduped)
    const allTeamIdsSet = new Set<number>();
    contests.forEach((c) => {
      (c.notJoinedTeamIds || []).forEach((id) => allTeamIdsSet.add(id));
    });
    const allTeamIds = Array.from(allTeamIdsSet);

    if (allTeamIds.length === 0) {
      toast({ title: "No teams", description: "No teams available to distribute.", variant: "destructive" });
      return;
    }

    // Filter open contests (skip full + already joined)
    const openContests = contests.filter((c) => {
      const available = c.availableSlots || c.maxAllowedTeams || c.maxJoinTeamCount || 0;
      const notJoined = c.notJoinedTeamIds || [];
      return available > 0 && notJoined.length > 0;
    });

    if (openContests.length === 0) {
      toast({ title: "No open contests", description: "All contests are full or already joined.", variant: "destructive" });
      return;
    }

    // ====== Distribute teams across contests (balanced) ======
    // Split teams evenly: if 40 teams + 4 contests → 10 each
    // If 20 teams + 4 contests → 5 each
    const teamsPerContest = Math.floor(allTeamIds.length / openContests.length);
    const remainder = allTeamIds.length % openContests.length;

    const assignments: { contest: Contest; teamIds: number[] }[] = [];
    let teamIdx = 0;
    for (let i = 0; i < openContests.length; i++) {
      const count = teamsPerContest + (i < remainder ? 1 : 0);
      const contest = openContests[i];
      const available = contest.availableSlots || contest.maxAllowedTeams || contest.maxJoinTeamCount || count;
      // Assign min(count, available) teams, but never duplicate team to same contest
      const notJoined = contest.notJoinedTeamIds || [];
      const assigned: number[] = [];
      while (assigned.length < Math.min(count, available) && teamIdx < allTeamIds.length) {
        const tid = allTeamIds[teamIdx];
        // Only assign if this team hasn't joined this contest
        if (notJoined.includes(tid) && !assigned.includes(tid)) {
          assigned.push(tid);
        }
        teamIdx++;
      }
      if (assigned.length > 0) {
        assignments.push({ contest, teamIds: assigned });
      }
    }

    if (assignments.length === 0) {
      toast({ title: "Cannot distribute", description: "No valid team-contest assignments possible.", variant: "destructive" });
      return;
    }

    setSmartMixRunning(true);
    setSmartMixProgress({ current: 0, total: assignments.length, joined: 0, failed: 0, status: "Distributing teams…" });

    let totalJoined = 0;
    let totalFailed = 0;

    for (let i = 0; i < assignments.length; i++) {
      const { contest, teamIds } = assignments[i];
      setSmartMixProgress({
        current: i + 1,
        total: assignments.length,
        joined: totalJoined,
        failed: totalFailed,
        status: `Contest ${i + 1}/${assignments.length}: ${teamIds.length} teams`,
      });

      const result = await joinOneContest(contest, teamIds, userToken);
      if (result.success) {
        totalJoined += result.joined;
        totalFailed += result.failed;
      } else {
        totalFailed += result.failed;
      }

      if (i < assignments.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setSmartMixProgress({
      current: assignments.length,
      total: assignments.length,
      joined: totalJoined,
      failed: totalFailed,
      status: `${assignments.length}/${assignments.length} Completed`,
    });

    toast({
      title: "Smart Mix Complete",
      description: `✅ Joined: ${totalJoined}${totalFailed > 0 ? ` · ⚠ Failed: ${totalFailed}` : ""}`,
    });

    setSmartMixRunning(false);
    fetchContests();
  };

  // ====== SERVER-SIDE LICENSE VERIFICATION GATE ======
  // Contest page is a premium feature. Before showing ANY contest UI,
  // verify license server-side. If no valid license → show FeatureLock.
  useEffect(() => {
    if (licenseChecked) return; // only run once
    const verifyAccess = async () => {
      await checkAndLock(); // server-side verification
      setLicenseChecked(true);
    };
    verifyAccess();
  }, [checkAndLock, licenseChecked]);

  // Show FeatureLock if license verification completed and user is NOT verified
  if (licenseChecked && !subLoading && !verified) {
    return (
      <div className="ac-app">
        <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
        <Header onMenuClick={() => setMenuOpen(true)} />
        <main style={{ padding: "8px 14px 8px", flex: 1 }}>
          <FeatureLock featureName="🔒 Join Contest" onClose={() => router.push("/")} />
        </main>
        <BottomNav active="contests" />
      </div>
    );
  }

  // Show loading while checking license
  if (!licenseChecked || subLoading) {
    return (
      <div className="ac-app">
        <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
        <Header onMenuClick={() => setMenuOpen(true)} />
        <main style={{ padding: "40px 14px", flex: 1, textAlign: "center" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "#34d399", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: "#8a94b3" }}>Verifying subscription…</div>
        </main>
        <BottomNav active="contests" />
      </div>
    );
  }

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
            onClick={() => fetchContests()}
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

        {/* ====== Match Selector ====== */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Calendar size={14} color="#06b6d4" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#e8eefc" }}>Select Match</span>
            <span style={{ fontSize: 10, color: "#8a94b3", marginLeft: "auto" }}>
              {matches.length} upcoming
            </span>
            <button
              onClick={() => fetchMatches()}
              disabled={matchesLoading}
              style={{
                background: "none",
                border: "none",
                cursor: matchesLoading ? "wait" : "pointer",
                color: "#34d399",
                padding: 2,
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Refresh matches"
            >
              {matchesLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
            </button>
          </div>

          {matchesLoading ? (
            <div style={{ padding: 12, textAlign: "center", color: "#8a94b3", fontSize: 12 }}>
              <Loader2 size={20} className="animate-spin" style={{ color: "#34d399", margin: "0 auto 6px" }} />
              Loading matches…
            </div>
          ) : matchesError ? (
            <div style={{
              padding: 12,
              textAlign: "center",
              color: "#f59e0b",
              fontSize: 12,
              background: "rgba(245,158,11,0.08)",
              borderRadius: 8,
            }}>
              <AlertCircle size={20} style={{ margin: "0 auto 6px" }} />
              {matchesError}
            </div>
          ) : matches.length === 0 ? (
            <div style={{
              padding: 16,
              textAlign: "center",
              color: "#8a94b3",
              fontSize: 12,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 8,
            }}>
              <Trophy size={24} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              No upcoming matches available right now.
              <br />
              <button
                onClick={() => fetchMatches()}
                style={{
                  marginTop: 8,
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  color: "#34d399",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
            </div>
          ) : (
            <select
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#0d1428",
                color: "#e8eefc",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {matches.map((m) => {
                const countdown = m.targetTime > 0 ? formatCountdown(m.targetTime, now) : "";
                return (
                  <option key={m.id} value={m.id}>
                    {m.leftTeam.name} vs {m.rightTeam.name}
                    {countdown ? ` — ${countdown}` : ""}
                    {m.series ? ` (${m.series})` : ""}
                  </option>
                );
              })}
            </select>
          )}

          {/* Selected match info */}
          {selectedMatch && !matchesLoading && (
            <div style={{
              marginTop: 8,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 8,
              fontSize: 11,
              color: "#8a94b3",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span>
                {selectedMatch.leftTeam.name} vs {selectedMatch.rightTeam.name}
              </span>
              {selectedMatch.targetTime > 0 && (
                <span style={{ color: "#34d399", fontWeight: 700 }}>
                  ⏱ {formatCountdown(selectedMatch.targetTime, now)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ====== Connect Account Section ====== */}
        {/* User NEVER sees or edits JWT. Single button fetches admin-saved JWT. */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <ShieldCheck size={14} color={connected ? "#34d399" : "#8a94b3"} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#e8eefc" }}>
              Account Session
            </span>
            {connected && (
              <span style={{
                fontSize: 9,
                color: "#34d399",
                background: "rgba(16,185,129,0.12)",
                padding: "2px 6px",
                borderRadius: 4,
                fontWeight: 700,
                marginLeft: "auto",
              }}>
                ✓ CONNECTED
              </span>
            )}
          </div>

          {/* Status text */}
          <div style={{ fontSize: 11, color: "#8a94b3", marginBottom: 10, lineHeight: 1.5 }}>
            {connected
              ? "Your session is active. All features unlocked — Team Transfer, Join Contest, Free Contests."
              : "Connect to activate Team Transfer, Join Contest, and Free Contests. Single login for all features."}
          </div>

          {/* Connect Account button — the ONLY user-facing action */}
          <button
            onClick={handleConnectAccount}
            disabled={connecting}
            style={{
              width: "100%",
              padding: "11px",
              background: connected
                ? "linear-gradient(135deg, #34d399, #10b981)"
                : "linear-gradient(135deg, #06b6d4, #0891b2)",
              border: "none",
              borderRadius: 10,
              color: "#04130d",
              fontSize: 13,
              fontWeight: 800,
              cursor: connecting ? "wait" : "pointer",
              opacity: connecting ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: connected
                ? "0 4px 12px rgba(16,185,129,0.3)"
                : "0 4px 12px rgba(6,182,212,0.3)",
            }}
          >
            {connecting ? (
              <><Loader2 size={15} className="animate-spin" /> Connecting…</>
            ) : connected ? (
              <><RefreshCcw size={15} /> 🔄 Reconnect Account</>
            ) : (
              <><RefreshCcw size={15} /> 🔄 Connect Account</>
            )}
          </button>
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
        {!matchId && !matchesLoading && (
          <div className="ac-empty">
            <div className="ac-empty-icon">
              <Trophy size={26} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No match selected</div>
            <div style={{ fontSize: 12 }}>
              {matches.length > 0
                ? "Select a match from the dropdown above."
                : "No upcoming matches available right now."}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 30, color: "#8a94b3" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "#34d399", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13 }}>Fetching free contests…</div>
          </div>
        )}

        {/* ====== Bulk Action Buttons (NEW — Join All + Smart Mix Join) ====== */}
        {!loading && contests.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {/* Join All */}
            <button
              onClick={handleJoinAll}
              disabled={joinAllRunning || smartMixRunning}
              style={{
                flex: 1,
                padding: "12px 8px",
                border: "none",
                borderRadius: 12,
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                cursor: joinAllRunning || smartMixRunning ? "wait" : "pointer",
                opacity: joinAllRunning || smartMixRunning ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
                transition: "all 0.2s ease",
              }}
            >
              {joinAllRunning ? (
                <><Loader2 size={15} className="animate-spin" /> Joining {joinAllProgress?.current}/{joinAllProgress?.total}…</>
              ) : (
                <>🚀 Join All</>
              )}
            </button>

            {/* Smart Mix Join */}
            <button
              onClick={handleSmartMixJoin}
              disabled={joinAllRunning || smartMixRunning}
              style={{
                flex: 1,
                padding: "12px 8px",
                border: "none",
                borderRadius: 12,
                background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                cursor: joinAllRunning || smartMixRunning ? "wait" : "pointer",
                opacity: joinAllRunning || smartMixRunning ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                transition: "all 0.2s ease",
              }}
            >
              {smartMixRunning ? (
                <><Loader2 size={15} className="animate-spin" /> Mixing {smartMixProgress?.current}/{smartMixProgress?.total}…</>
              ) : (
                <>🎯 Smart Mix Join</>
              )}
            </button>
          </div>
        )}

        {/* ====== Join All Progress ====== */}
        {joinAllProgress && joinAllRunning && (
          <div
            style={{
              background: "linear-gradient(180deg, rgba(245,158,11,0.12), rgba(255,255,255,0.02))",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>
              <span>{joinAllProgress.status}</span>
              <span>{joinAllProgress.current}/{joinAllProgress.total}</span>
            </div>
            <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
              <div
                style={{
                  width: `${(joinAllProgress.current / joinAllProgress.total) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #f59e0b, #34d399)",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
              <span style={{ color: "#34d399", fontWeight: 700 }}>✅ {joinAllProgress.joined}</span>
              <span style={{ color: "#f43f5e", fontWeight: 700 }}>⚠ {joinAllProgress.failed}</span>
            </div>
          </div>
        )}

        {/* ====== Smart Mix Progress ====== */}
        {smartMixProgress && smartMixRunning && (
          <div
            style={{
              background: "linear-gradient(180deg, rgba(139,92,246,0.12), rgba(255,255,255,0.02))",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>
              <span>{smartMixProgress.status}</span>
              <span>{smartMixProgress.current}/{smartMixProgress.total}</span>
            </div>
            <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
              <div
                style={{
                  width: `${(smartMixProgress.current / smartMixProgress.total) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #8b5cf6, #34d399)",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
              <span style={{ color: "#34d399", fontWeight: 700 }}>✅ {smartMixProgress.joined}</span>
              <span style={{ color: "#f43f5e", fontWeight: 700 }}>⚠ {smartMixProgress.failed}</span>
            </div>
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

                  {/* Join button — existing button kept unchanged */}
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

        {/* Empty / Error state with retry button */}
        {!loading && currentAccount && matchId && contests.length === 0 && (
          <div className="ac-empty">
            <div className="ac-empty-icon">
              <Gift size={26} />
            </div>
            {contestsError === "NO_TEAMS" ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No teams transferred</div>
                <div style={{ fontSize: 12 }}>
                  Transfer teams to {currentPlatform?.name} first, then come back to join contests.
                </div>
                <a
                  href={`/match/${matchId}/transfer`}
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 16px",
                    background: "linear-gradient(135deg, #34d399, #10b981)",
                    color: "#04130d",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <Crown size={14} /> Transfer Teams
                </a>
              </>
            ) : contestsError === "NO_CONTESTS" || contestsError === "NO_OPEN_CONTESTS" ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No free contests</div>
                <div style={{ fontSize: 12 }}>
                  No free contests available on {currentPlatform?.name} for this match right now.
                </div>
                <button
                  onClick={() => fetchContests()}
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 16px",
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    color: "#34d399",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={14} /> Retry Fetch
                </button>
              </>
            ) : contestsError ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "#f43f5e" }}>
                  Fetch Error
                </div>
                <div style={{ fontSize: 12, color: "#8a94b3", wordBreak: "break-word" }}>
                  {contestsError}
                </div>
                <button
                  onClick={() => fetchContests()}
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 16px",
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    color: "#34d399",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={14} /> Retry Fetch
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No free contests</div>
                <div style={{ fontSize: 12 }}>
                  No free contests available on {currentPlatform?.name} for this match right now.
                </div>
                <button
                  onClick={() => fetchContests()}
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 16px",
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    color: "#34d399",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={14} /> Retry Fetch
                </button>
              </>
            )}
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
