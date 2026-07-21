"use client";

import { useState, useEffect } from "react";
import { X, Key, Smartphone, Users, FileText, Settings, Megaphone, BarChart3, Plus, Trash2, Ban, CheckCircle2, Clock, RefreshCw, KeyRound, Save, Eraser, Gift, Copy, CloudUpload, Database } from "lucide-react";

const ADMIN_PASS = "8950888988";

type Tab = "dashboard" | "licenses" | "devices" | "users" | "logs" | "settings" | "announcements" | "jwt" | "freeoffer";

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<any>({});
  const [keys, setKeys] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [logFilter, setLogFilter] = useState("today");
  const [genPlan, setGenPlan] = useState("monthly");
  const [genCount, setGenCount] = useState(1);
  const [genResult, setGenResult] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("all");
  const [licensePage, setLicensePage] = useState(0);
  const [jwtToken, setJwtToken] = useState("");
  const [jwtSaved, setJwtSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string>("");

  const fetchStats = async () => {
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${ADMIN_PASS}` },
    });
    const d = await res.json();
    if (d.stats) setStats(d.stats);
  };

  const fetchKeys = async () => {
    const res = await fetch("/api/license/list", {
      headers: { Authorization: `Bearer ${ADMIN_PASS}` },
    });
    const d = await res.json();
    if (d.keys) setKeys(d.keys);
  };

  const fetchDevices = async () => {
    const res = await fetch("/api/admin/devices", {
      headers: { Authorization: `Bearer ${ADMIN_PASS}` },
    });
    const d = await res.json();
    if (d.devices) setDevices(d.devices);
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${ADMIN_PASS}` },
    });
    const d = await res.json();
    if (d.users) setUsers(d.users);
  };

  const fetchLogs = async () => {
    const res = await fetch(`/api/admin/logs?filter=${logFilter}`, {
      headers: { Authorization: `Bearer ${ADMIN_PASS}` },
    });
    const d = await res.json();
    if (d.logs) setLogs(d.logs);
  };

  const fetchSettings = async () => {
    const res = await fetch("/api/admin/settings", {
      headers: { Authorization: `Bearer ${ADMIN_PASS}` },
    });
    const d = await res.json();
    if (d.settings) setSettings(d.settings);
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (tab === "licenses") fetchKeys(); }, [tab]);
  useEffect(() => { if (tab === "devices") fetchDevices(); }, [tab]);
  useEffect(() => { if (tab === "users") fetchUsers(); }, [tab]);
  useEffect(() => { if (tab === "logs") fetchLogs(); }, [tab, logFilter]);
  useEffect(() => { if (tab === "settings") fetchSettings(); }, [tab]);
  useEffect(() => {
    if (tab === "jwt") {
      // Fetch JWT from SERVER settings (not just localStorage)
      // JWT is stored server-side via /api/admin/settings
      const fetchJwt = async () => {
        try {
          const res = await fetch("/api/admin/settings", {
            headers: { Authorization: `Bearer ${ADMIN_PASS}` },
          });
          const d = await res.json();
          if (d.settings) {
            const serverJwt = d.settings.jwt_token || d.settings.user_token || "";
            if (serverJwt) {
              setJwtToken(serverJwt);
              // Also sync to localStorage
              try { localStorage.setItem("user_token", serverJwt); } catch {}
            } else {
              // Fallback to localStorage
              setJwtToken(localStorage.getItem("user_token") || "");
            }
          }
        } catch {
          // Fallback to localStorage on error
          try { setJwtToken(localStorage.getItem("user_token") || ""); } catch {}
        }
      };
      fetchJwt();
    }
  }, [tab]);

  const generateKeys = async () => {
    setLoading(true);
    setGenResult([]);
    const res = await fetch("/api/license/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: genCount, plan: genPlan, adminPassword: ADMIN_PASS }),
    });
    const d = await res.json();
    if (d.keys && d.keys.length > 0) {
      setGenResult(d.keys);
      fetchKeys();
      fetchStats();
    } else if (d.error) {
      alert("Generate failed: " + d.error);
    }
    setLoading(false);
  };

  // ====== Firebase Sync — upload all keys to Firestore ======
  const handleFirebaseSync = async () => {
    setSyncing(true);
    setSyncResult("");
    try {
      const res = await fetch("/api/admin/firebase-sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${ADMIN_PASS}` },
      });
      const d = await res.json();
      if (d.status === "success") {
        setSyncResult(`✅ Synced: ${d.synced}/${d.total}${d.failed > 0 ? ` · Failed: ${d.failed}` : ""}`);
      } else {
        setSyncResult(`❌ Sync failed: ${d.error || "unknown"}`);
      }
    } catch (e) {
      setSyncResult(`❌ Error: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(""), 5000);
    }
  };

  // ====== Copy key to clipboard ======
  const copyKey = (key: string) => {
    try {
      navigator.clipboard.writeText(key);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = key;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  // ====== Save unsaved keys to Firestore ======
  const handleSaveToFirebase = async () => {
    setSaving(true);
    setSaveResult("");
    try {
      const res = await fetch("/api/admin/firebase-sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${ADMIN_PASS}` },
      });
      const d = await res.json();
      if (d.status === "success") {
        setSaveResult(`✅ Saved: ${d.synced}/${d.total}${d.failed > 0 ? ` · Failed: ${d.failed}` : ""}`);
      } else {
        setSaveResult(`❌ Save failed: ${d.error || "unknown"}`);
      }
    } catch (e) {
      setSaveResult(`❌ Error: ${(e as Error).message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveResult(""), 5000);
    }
  };

  // ====== Format date for display ======
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB") + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  // ====== Calculate remaining time ======
  const getRemaining = (expiresAt: string | null): string => {
    if (!expiresAt) return "—";
    try {
      const exp = new Date(expiresAt).getTime();
      const now = Date.now();
      if (exp <= now) return "Expired";
      const days = Math.floor((exp - now) / 86400000);
      const hours = Math.floor(((exp - now) % 86400000) / 3600000);
      if (days > 3650) return "Never";
      return `${days}d ${hours}h`;
    } catch {
      return "—";
    }
  };

  const keyAction = async (action: string, key: string, days?: number) => {
    await fetch("/api/license/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, key, days, adminPassword: ADMIN_PASS }),
    });
    fetchKeys();
    fetchStats();
  };

  const userAction = async (action: string, userId: string) => {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId }),
    });
    fetchUsers();
  };

  const updateSetting = async (key: string, value: string) => {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value, adminPassword: ADMIN_PASS }),
    });
  };

  const saveJwtToken = async () => {
    const token = jwtToken.trim();
    try {
      if (token) {
        localStorage.setItem("user_token", token);
      } else {
        localStorage.removeItem("user_token");
      }
      // Save to server settings (Firestore source of truth)
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "jwt_token", value: token, adminPassword: ADMIN_PASS }),
      });
      // Also sync to Firestore settings collection
      try {
        const { saveSettingsToFirestore } = await import("@/lib/firestore-collections");
        await saveSettingsToFirestore("jwt_token", token);
        console.log("[JWT] Saved to Firestore settings collection");
      } catch (e) {
        console.warn("[JWT] Firestore sync failed (non-blocking):", e);
      }
      setJwtSaved(true);
      setTimeout(() => setJwtSaved(false), 2500);
    } catch (e) {
      console.error("JWT save failed", e);
    }
  };

  const clearJwtToken = async () => {
    setJwtToken("");
    try {
      localStorage.removeItem("user_token");
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "jwt_token", value: "", adminPassword: ADMIN_PASS }),
      });
    } catch {}
  };

  // ====== Filtered + searched + paginated keys ======
  const PAGE_SIZE = 50;
  const filteredKeys = keys.filter(k => {
    // Search filter
    if (search) {
      const s = search.toLowerCase();
      const matchKey = k.key?.toLowerCase().includes(s);
      const matchPlan = k.plan?.toLowerCase().includes(s);
      const matchStatus = k.status?.toLowerCase().includes(s);
      const matchDevice = k.deviceFp?.toLowerCase().includes(s);
      if (!matchKey && !matchPlan && !matchStatus && !matchDevice) return false;
    }
    // Advanced filter
    if (licenseFilter === "all") return true;
    if (licenseFilter === "free") return !k.deviceFp;
    if (licenseFilter === "active" || licenseFilter === "used" || licenseFilter === "suspended" || licenseFilter === "expired") return k.status === licenseFilter;
    if (licenseFilter === "monthly" || licenseFilter === "weekly" || licenseFilter === "lifetime" || licenseFilter === "daily" || licenseFilter === "trial") return k.plan === licenseFilter;
    return true;
  });
  const totalPages = Math.ceil(filteredKeys.length / PAGE_SIZE);
  const paginatedKeys = filteredKeys.slice(licensePage * PAGE_SIZE, (licensePage + 1) * PAGE_SIZE);

  const filteredDevices = devices.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.key?.toLowerCase().includes(s) || d.deviceFp?.toLowerCase().includes(s);
  });

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "licenses", label: "Licenses", icon: Key },
    { id: "devices", label: "Devices", icon: Smartphone },
    { id: "users", label: "Users", icon: Users },
    { id: "logs", label: "Logs", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "announcements", label: "Announce", icon: Megaphone },
    { id: "jwt", label: "JWT Token", icon: KeyRound },
    { id: "freeoffer", label: "Free Offer", icon: Gift },
  ];

  const statCards = [
    { label: "Total Keys", value: stats.totalKeys || 0, color: "#0066ff" },
    { label: "Active Keys", value: stats.activeKeys || 0, color: "#00b050" },
    { label: "Used Keys", value: stats.usedKeys || 0, color: "#ffc107" },
    { label: "Expired Keys", value: stats.expiredKeys || 0, color: "#dc3545" },
    { label: "Active Devices", value: stats.activeDevices || 0, color: "#17a2b8" },
    { label: "Today Verifs", value: stats.todayVerifications || 0, color: "#6f42c1" },
    { label: "Total Users", value: stats.totalUsers || 0, color: "#fd7e14" },
    { label: "Teams Today", value: stats.teamsToday || 0, color: "#e83e8c" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 99999, overflow: "auto" }}>
      {/* Header */}
      <div style={{ background: "#0a0a0a", borderBottom: "2px solid #0066ff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shield2 />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0066ff" }}>🛡️ RMSMT ADMIN PANEL</span>
        </div>
        <button onClick={onClose} style={{ background: "#dc3545", border: "none", borderRadius: 6, padding: "6px 12px", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          <X size={14} /> Exit
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "8px 8px", background: "#0a0a0a", borderBottom: "1px solid #222", overflowX: "auto" }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 12px", background: tab === t.id ? "#0066ff" : "#111", border: "none", borderRadius: 6, color: tab === t.id ? "#fff" : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 16, maxWidth: 700, margin: "0 auto" }}>
        {/* Dashboard Tab */}
        {tab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {statCards.map(s => (
              <div key={s.label} style={{ background: "#0a0a0a", border: `1px solid ${s.color}40`, borderRadius: 8, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Licenses Tab */}
        {tab === "licenses" && (
          <div>
            {/* Generate */}
            <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0066ff", marginBottom: 8 }}>🔑 Generate Keys</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <select value={genPlan} onChange={e => setGenPlan(e.target.value)} style={{ flex: 1, padding: "6px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12 }}>
                  <option value="trial">Trial (3 days)</option>
                  <option value="weekly">Weekly (7 days)</option>
                  <option value="monthly">Monthly (30 days)</option>
                  <option value="lifetime">Lifetime</option>
                </select>
                <select value={genCount} onChange={e => setGenCount(parseInt(e.target.value))} style={{ flex: 1, padding: "6px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12 }}>
                  <option value={1}>1 Key</option>
                  <option value={10}>10 Keys</option>
                  <option value={50}>50 Keys</option>
                  <option value={100}>100 Keys</option>
                  <option value={500}>500 Keys</option>
                </select>
              </div>
              <button onClick={generateKeys} disabled={loading} style={{ width: "100%", padding: "8px", background: "#00b050", border: "none", borderRadius: 4, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Generating..." : "Generate"}
              </button>
              {/* Save button */}
              <button onClick={handleSaveToFirebase} disabled={saving} style={{ width: "100%", padding: "6px", marginTop: 4, background: "#0066ff", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {saving ? <><RefreshCw size={11} className="animate-spin" /> Saving…</> : <><Save size={11} /> 💾 Save to Firebase</>}
              </button>
              {saveResult && <div style={{ marginTop: 4, padding: 4, background: "#111", borderRadius: 3, fontSize: 9, color: saveResult.startsWith("✅") ? "#00b050" : "#dc3545", textAlign: "center" }}>{saveResult}</div>}
              {genResult.length > 0 && (
                <div style={{ marginTop: 8, background: "#111", borderRadius: 4, padding: 8, maxHeight: 150, overflowY: "auto" }}>
                  {genResult.map((k, i) => (
                    <div key={k || `gen-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#00b050", fontFamily: "monospace", padding: "2px 0" }}>
                      <span>{k}</span>
                      <button onClick={() => copyKey(k)} style={{ padding: "2px 6px", background: "#333", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>📋</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Firebase Sync buttons */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button onClick={handleFirebaseSync} disabled={syncing} style={{ flex: 1, padding: "8px", background: "#0066ff", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 700, cursor: syncing ? "wait" : "pointer", opacity: syncing ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {syncing ? <><RefreshCw size={12} className="animate-spin" /> Syncing…</> : <><CloudUpload size={12} /> 💾 Save to Firebase</>}
              </button>
              <button onClick={handleFirebaseSync} disabled={syncing} style={{ flex: 1, padding: "8px", background: "#17a2b8", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 700, cursor: syncing ? "wait" : "pointer", opacity: syncing ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Database size={12} /> 🔄 Firebase Sync
              </button>
            </div>
            {syncResult && <div style={{ marginBottom: 8, padding: 6, background: "#111", borderRadius: 4, fontSize: 10, color: syncResult.startsWith("✅") ? "#00b050" : "#dc3545", textAlign: "center" }}>{syncResult}</div>}
            {/* Search + Filter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input type="text" placeholder="Search key, plan, status, device..." value={search} onChange={e => { setSearch(e.target.value); setLicensePage(0); }} style={{ flex: 1, padding: "6px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 11 }} />
              <select value={licenseFilter} onChange={e => { setLicenseFilter(e.target.value); setLicensePage(0); }} style={{ padding: "6px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 11 }}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="used">Used</option>
                <option value="free">Free</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="lifetime">Lifetime</option>
                <option value="daily">Daily</option>
                <option value="trial">Trial</option>
              </select>
            </div>
            <div style={{ fontSize: 10, color: "#666", marginBottom: 6 }}>{filteredKeys.length} keys {search && `(filtered from ${keys.length})`}</div>
            {/* Key list (paginated) */}
            <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 10, maxHeight: 500, overflowY: "auto" }}>
              {paginatedKeys.map((k, idx) => {
                const itemKey = k.id || k.key || `key-${idx}`;
                return (
                <div key={itemKey} style={{ padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#0066ff" }}>{k.key}</span>
                        <button onClick={() => copyKey(k.key)} style={{ padding: "1px 4px", background: "#333", border: "none", borderRadius: 2, fontSize: 8, color: "#fff", cursor: "pointer" }}>📋</button>
                      </div>
                      <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>
                        {k.plan} · {k.status} · {k.deviceFp ? "bound" : "free"} · Rem: {getRemaining(k.expiresAt)}
                      </div>
                      <div style={{ fontSize: 8, color: "#555", marginTop: 2 }}>
                        Created: {formatDate(k.createdAt || k.boundAt || null)}
                      </div>
                      <div style={{ fontSize: 8, color: "#555" }}>
                        Activated: {formatDate(k.boundAt || null)} · Expires: {formatDate(k.expiresAt)}
                      </div>
                      {k.updatedAt && <div style={{ fontSize: 8, color: "#444" }}>Updated: {formatDate(k.updatedAt)}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 3, flexShrink: 0, flexWrap: "wrap", maxWidth: 120 }}>
                      {k.status === "active" || k.status === "used" ? (
                        <button onClick={() => keyAction("suspend", k.key)} style={{ padding: "3px 5px", background: "#ffc107", border: "none", borderRadius: 3, fontSize: 8, cursor: "pointer" }}>Suspend</button>
                      ) : (
                        <button onClick={() => keyAction("activate", k.key)} style={{ padding: "3px 5px", background: "#00b050", border: "none", borderRadius: 3, fontSize: 8, color: "#fff", cursor: "pointer" }}>Activate</button>
                      )}
                      <button onClick={() => keyAction("extend", k.key, 30)} style={{ padding: "3px 5px", background: "#0066ff", border: "none", borderRadius: 3, fontSize: 8, color: "#fff", cursor: "pointer" }}>+30d</button>
                      {k.deviceFp && <button onClick={() => keyAction("reset_device", k.key)} style={{ padding: "3px 5px", background: "#17a2b8", border: "none", borderRadius: 3, fontSize: 8, color: "#fff", cursor: "pointer" }}>Reset</button>}
                      <button onClick={() => keyAction("delete", k.key)} style={{ padding: "3px 5px", background: "#dc3545", border: "none", borderRadius: 3, fontSize: 8, color: "#fff", cursor: "pointer" }}>Del</button>
                    </div>
                  </div>
                </div>
                );
              })}
              {paginatedKeys.length === 0 && <div style={{ textAlign: "center", color: "#666", fontSize: 12, padding: 20 }}>No keys found</div>}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
                <button onClick={() => setLicensePage(0)} disabled={licensePage === 0} style={{ padding: "4px 8px", background: "#111", border: "1px solid #333", borderRadius: 3, color: licensePage === 0 ? "#444" : "#fff", fontSize: 10, cursor: licensePage === 0 ? "default" : "pointer" }}>⟪ First</button>
                <button onClick={() => setLicensePage(p => Math.max(0, p - 1))} disabled={licensePage === 0} style={{ padding: "4px 8px", background: "#111", border: "1px solid #333", borderRadius: 3, color: licensePage === 0 ? "#444" : "#fff", fontSize: 10, cursor: licensePage === 0 ? "default" : "pointer" }}>◀ Prev</button>
                <span style={{ padding: "4px 8px", color: "#888", fontSize: 10 }}>Page {licensePage + 1} / {totalPages}</span>
                <button onClick={() => setLicensePage(p => Math.min(totalPages - 1, p + 1))} disabled={licensePage >= totalPages - 1} style={{ padding: "4px 8px", background: "#111", border: "1px solid #333", borderRadius: 3, color: licensePage >= totalPages - 1 ? "#444" : "#fff", fontSize: 10, cursor: licensePage >= totalPages - 1 ? "default" : "pointer" }}>Next ▶</button>
                <button onClick={() => setLicensePage(totalPages - 1)} disabled={licensePage >= totalPages - 1} style={{ padding: "4px 8px", background: "#111", border: "1px solid #333", borderRadius: 3, color: licensePage >= totalPages - 1 ? "#444" : "#fff", fontSize: 10, cursor: licensePage >= totalPages - 1 ? "default" : "pointer" }}>Last ⟫</button>
              </div>
            )}
          </div>
        )}

        {/* Devices Tab */}
        {tab === "devices" && (
          <div>
            <input type="text" placeholder="Search by key or device..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12, marginBottom: 10 }} />
            <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 10, maxHeight: 400, overflowY: "auto" }}>
              {filteredDevices.map((d, idx) => {
                const devKey = d.key || d.deviceFp || `dev-${idx}`;
                return (
                <div key={devKey} style={{ padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <div style={{ fontSize: 11, color: "#0066ff", fontFamily: "monospace" }}>{d.key}</div>
                  <div style={{ fontSize: 9, color: "#888" }}>Device: {d.deviceFp?.substring(0, 20)}... · {d.plan} · {d.status}</div>
                  <div style={{ fontSize: 9, color: "#666" }}>Bound: {d.boundAt ? new Date(d.boundAt).toLocaleDateString() : "N/A"}</div>
                  <button onClick={() => keyAction("reset_device", d.key)} style={{ marginTop: 4, padding: "3px 8px", background: "#dc3545", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Unbind</button>
                </div>
                );
              })}
              {filteredDevices.length === 0 && <div style={{ textAlign: "center", color: "#666", fontSize: 12, padding: 20 }}>No devices</div>}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 10, maxHeight: 500, overflowY: "auto" }}>
            {users.map((u, idx) => {
              const userKey = u.id || u.email || u.name || `user-${idx}`;
              return (
              <div key={userKey} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#fff" }}>{u.name || u.email}</div>
                  <div style={{ fontSize: 9, color: u.banned ? "#dc3545" : "#00b050" }}>{u.banned ? "BANNED" : "Active"} · {u.licenseKey || "No license"}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {u.banned ? <button onClick={() => userAction("unban", u.id)} style={{ padding: "3px 6px", background: "#00b050", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Unban</button> : <button onClick={() => userAction("ban", u.id)} style={{ padding: "3px 6px", background: "#dc3545", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Ban</button>}
                  <button onClick={() => userAction("delete", u.id)} style={{ padding: "3px 6px", background: "#666", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Del</button>
                </div>
              </div>
              );
            })}
            {users.length === 0 && <div style={{ textAlign: "center", color: "#666", fontSize: 12, padding: 20 }}>No users</div>}
          </div>
        )}

        {/* Logs Tab */}
        {tab === "logs" && (
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {["today", "7days", "30days", "all"].map(f => (
                <button key={f} onClick={() => setLogFilter(f)} style={{ flex: 1, padding: "6px", background: logFilter === f ? "#0066ff" : "#111", border: "none", borderRadius: 4, color: logFilter === f ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{f}</button>
              ))}
            </div>
            <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 10, maxHeight: 400, overflowY: "auto" }}>
              {logs.map(l => (
                <div key={l.id} style={{ padding: "4px 0", borderBottom: "1px solid #1a1a1a", fontSize: 10 }}>
                  <span style={{ color: "#0066ff", fontWeight: 600 }}>[{l.type}]</span>{" "}
                  <span style={{ color: "#ccc" }}>{l.message}</span>
                  <span style={{ color: "#555", float: "right" }}>{new Date(l.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
              {logs.length === 0 && <div style={{ textAlign: "center", color: "#666", fontSize: 12, padding: 20 }}>No logs</div>}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 14 }}>
            {[
              { key: "admin_password", label: "Admin Password" },
              { key: "api_url", label: "API URL" },
              { key: "license_prefix", label: "License Prefix" },
              { key: "app_version", label: "App Version" },
              { key: "maintenance_mode", label: "Maintenance Mode (true/false)" },
              { key: "enable_team_generator", label: "Enable Team Generator (true/false)" },
              { key: "enable_transfers", label: "Enable Transfers (true/false)" },
              { key: "enable_new_activations", label: "Enable New Activations (true/false)" },
            ].map(s => (
              <div key={s.key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 3 }}>{s.label}</label>
                <input type="text" defaultValue={settings[s.key] || ""} key={s.key + (settings[s.key] || "")} onBlur={e => updateSetting(s.key, e.target.value)} style={{ width: "100%", padding: "6px 8px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12 }} />
              </div>
            ))}
          </div>
        )}

        {/* Announcements Tab */}
        {tab === "announcements" && (
          <AnnouncementTab />
        )}

        {/* JWT Token Tab */}
        {tab === "jwt" && (
          <div style={{ background: "#0a0a0a", border: "1px solid #0066ff40", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0066ff", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <KeyRound size={16} /> JWT Token / Bearer Auth
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/settings", {
                      headers: { Authorization: `Bearer ${ADMIN_PASS}` },
                    });
                    const d = await res.json();
                    if (d.settings) {
                      const serverJwt = d.settings.jwt_token || d.settings.user_token || "";
                      setJwtToken(serverJwt);
                      if (serverJwt) { try { localStorage.setItem("user_token", serverJwt); } catch {} }
                    }
                  } catch {}
                }}
                style={{
                  padding: "4px 10px",
                  background: "#111",
                  border: "1px solid #333",
                  borderRadius: 4,
                  color: "#34d399",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <RefreshCw size={11} /> Refresh
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#888", marginBottom: 14, lineHeight: 1.5 }}>
              This token is sent as <code style={{ color: "#34d399" }}>Authorization: Bearer &lt;token&gt;</code> header
              for team transfers and free contest joins. Paste your backend JWT here and Save.
            </p>

            <label style={{ fontSize: 11, fontWeight: 600, color: "#888", display: "block", marginBottom: 6 }}>
              Backend JWT Token (user_token)
            </label>
            <textarea
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={jwtToken}
              onChange={e => setJwtToken(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                background: "#111",
                border: "1px solid #333",
                borderRadius: 6,
                color: "#fff",
                fontSize: 11,
                fontFamily: "monospace",
                minHeight: 90,
                marginBottom: 12,
                resize: "vertical",
              }}
            />

            {/* Status indicator */}
            {jwtSaved && (
              <div style={{ background: "#0d2818", border: "1px solid #00b050", borderRadius: 6, padding: "8px 10px", marginBottom: 10, fontSize: 11, color: "#00b050", display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={14} /> JWT token saved! It will be used for all transfers and contest joins.
              </div>
            )}
            {jwtToken && !jwtSaved && (
              <div style={{ background: "#1a1a00", border: "1px solid #ffc107", borderRadius: 6, padding: "8px 10px", marginBottom: 10, fontSize: 11, color: "#ffc107" }}>
                ⚠ Token present — click Save to persist, or Clear to remove.
              </div>
            )}
            {!jwtToken && !jwtSaved && (
              <div style={{ background: "#1a0010", border: "1px solid #dc3545", borderRadius: 6, padding: "8px 10px", marginBottom: 10, fontSize: 11, color: "#dc3545" }}>
                ✗ No token set. Transfers will still work but contest joins may fail.
              </div>
            )}

            {/* 2 buttons: Save + Clear */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveJwtToken}
                style={{
                  flex: 2,
                  padding: "10px",
                  background: "#00b050",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Save size={14} /> Save Token
              </button>
              <button
                onClick={clearJwtToken}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#dc3545",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Eraser size={14} /> Clear
              </button>
            </div>

            {/* Token info */}
            <div style={{ marginTop: 14, padding: 10, background: "#111", borderRadius: 6, fontSize: 10, color: "#666", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: "#888", marginBottom: 4 }}>ℹ How it works:</div>
              <div>• Token stored in <code style={{ color: "#34d399" }}>localStorage</code> as <code>user_token</code></div>
              <div>• Sent as <code style={{ color: "#34d399" }}>Authorization: Bearer</code> header</div>
              <div>• Used by: Transfer API, Free Contest fetch + join</div>
              <div>• Also persisted server-side via admin settings</div>
            </div>
          </div>
        )}

        {/* Free Offer Key Tab */}
        {tab === "freeoffer" && <FreeOfferTab />}
      </div>
    </div>
  );
}

function Shield2() {
  return <span style={{ fontSize: 18 }}>🛡️</span>;
}

// ====== Free Offer Key Tab ======
function FreeOfferTab() {
  const [offerKeys, setOfferKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [validityHours, setValidityHours] = useState(24);
  const [maxUsers, setMaxUsers] = useState(100);
  const [generatedKey, setGeneratedKey] = useState("");

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/free-offer-generate?adminPassword=${ADMIN_PASS}`);
      const d = await res.json();
      if (d.keys) setOfferKeys(d.keys);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/free-offer-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: ADMIN_PASS, validityHours, maxUsers }),
      });
      const d = await res.json();
      if (d.status === "success") {
        setGeneratedKey(d.key);
        fetchKeys();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (key: string) => {
    await fetch("/api/admin/free-offer-generate", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPassword: ADMIN_PASS, key }),
    });
    fetchKeys();
  };

  return (
    <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0066ff", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <Gift size={16} /> 🎁 Generate Free Offer Key
      </div>
      <p style={{ fontSize: 11, color: "#666", marginBottom: 12 }}>
        Generate a free offer key that unlocks PRO features for 24 hours. Max 100 users.
      </p>

      {/* Config */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 4 }}>Validity (hours)</label>
          <input type="number" value={validityHours} onChange={e => setValidityHours(parseInt(e.target.value) || 24)} min={1} max={720} style={{ width: "100%", padding: "6px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12 }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 4 }}>Max Users</label>
          <input type="number" value={maxUsers} onChange={e => setMaxUsers(parseInt(e.target.value) || 100)} min={1} max={1000} style={{ width: "100%", padding: "6px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12 }} />
        </div>
      </div>

      <button onClick={handleGenerate} disabled={generating} style={{ width: "100%", padding: "10px", background: "#00b050", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700, cursor: generating ? "wait" : "pointer", marginBottom: 10 }}>
        {generating ? "Generating…" : "🎁 Generate Free Offer Key"}
      </button>

      {generatedKey && (
        <div style={{ background: "#0d2818", border: "1px solid #00b050", borderRadius: 6, padding: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#00b050", marginBottom: 4 }}>✅ Generated Key:</div>
          <div style={{ fontSize: 14, fontFamily: "monospace", color: "#fff", fontWeight: 700 }}>{generatedKey}</div>
          <div style={{ fontSize: 9, color: "#888", marginTop: 4 }}>Share this key with users. Valid for {validityHours}h, max {maxUsers} activations.</div>
        </div>
      )}

      {/* Existing keys */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eefc", marginBottom: 8, marginTop: 14 }}>Existing Free Offer Keys</div>
      {loading ? (
        <div style={{ textAlign: "center", color: "#666", fontSize: 12, padding: 20 }}>Loading…</div>
      ) : offerKeys.length === 0 ? (
        <div style={{ textAlign: "center", color: "#666", fontSize: 12, padding: 20 }}>No free offer keys yet</div>
      ) : (
        offerKeys.map((k, idx) => {
          const itemKey = k.key || `offer-${idx}`;
          return (
            <div key={itemKey} style={{ padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00b050", fontWeight: 700 }}>{k.key}</div>
              <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>
                {k.activationCount}/{k.maxUsers} activations · {k.validityHours}h · Exp: {new Date(k.expiryDate).toLocaleDateString()}
                {k.isExpired && <span style={{ color: "#dc3545", marginLeft: 6 }}>· EXPIRED</span>}
                {k.isFull && !k.isExpired && <span style={{ color: "#ffc107", marginLeft: 6 }}>· FULL</span>}
              </div>
              <button onClick={() => handleDelete(k.key)} style={{ marginTop: 4, padding: "3px 8px", background: "#dc3545", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Delete</button>
            </div>
          );
        })
      )}
    </div>
  );
}

function AnnouncementTab() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [sent, setSent] = useState(false);

  const send = async () => {
    await fetch("/api/admin/announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, target, adminPassword: "8950888988" }),
    });
    setSent(true);
    setTitle(""); setMessage("");
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0066ff", marginBottom: 10 }}>📢 Send Announcement</div>
      <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12, marginBottom: 8 }} />
      <textarea placeholder="Message" value={message} onChange={e => setMessage(e.target.value)} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12, marginBottom: 8, minHeight: 80 }} />
      <select value={target} onChange={e => setTarget(e.target.value)} style={{ width: "100%", padding: "6px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12, marginBottom: 8 }}>
        <option value="all">All Users</option>
        <option value="premium">Premium Users</option>
        <option value="selected">Selected Users</option>
      </select>
      <button onClick={send} style={{ width: "100%", padding: "8px", background: "#00b050", border: "none", borderRadius: 4, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        {sent ? "✅ Sent!" : "Send"}
      </button>
    </div>
  );
}
