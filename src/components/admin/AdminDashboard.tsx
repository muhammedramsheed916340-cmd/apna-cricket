"use client";

import { useState, useEffect } from "react";
import { X, Key, Smartphone, Users, FileText, Settings, Megaphone, BarChart3, Plus, Trash2, Ban, CheckCircle2, Clock, RefreshCw } from "lucide-react";

const ADMIN_PASS = "rmsmt_admin_2025";

type Tab = "dashboard" | "licenses" | "devices" | "users" | "logs" | "settings" | "announcements";

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

  const fetchStats = async () => {
    const res = await fetch("/api/admin/stats");
    const d = await res.json();
    if (d.stats) setStats(d.stats);
  };

  const fetchKeys = async () => {
    const res = await fetch("/api/license/list");
    const d = await res.json();
    if (d.keys) setKeys(d.keys);
  };

  const fetchDevices = async () => {
    const res = await fetch("/api/admin/devices");
    const d = await res.json();
    if (d.devices) setDevices(d.devices);
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    const d = await res.json();
    if (d.users) setUsers(d.users);
  };

  const fetchLogs = async () => {
    const res = await fetch(`/api/admin/logs?filter=${logFilter}`);
    const d = await res.json();
    if (d.logs) setLogs(d.logs);
  };

  const fetchSettings = async () => {
    const res = await fetch("/api/admin/settings");
    const d = await res.json();
    if (d.settings) setSettings(d.settings);
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (tab === "licenses") fetchKeys(); }, [tab]);
  useEffect(() => { if (tab === "devices") fetchDevices(); }, [tab]);
  useEffect(() => { if (tab === "users") fetchUsers(); }, [tab]);
  useEffect(() => { if (tab === "logs") fetchLogs(); }, [tab, logFilter]);
  useEffect(() => { if (tab === "settings") fetchSettings(); }, [tab]);

  const generateKeys = async () => {
    setLoading(true);
    const res = await fetch("/api/license/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: genCount, plan: genPlan, adminPassword: ADMIN_PASS }),
    });
    const d = await res.json();
    if (d.keys) { setGenResult(d.keys); fetchKeys(); fetchStats(); }
    setLoading(false);
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
              {genResult.length > 0 && (
                <div style={{ marginTop: 8, background: "#111", borderRadius: 4, padding: 8, maxHeight: 150, overflowY: "auto" }}>
                  {genResult.map((k, i) => <div key={i} style={{ fontSize: 11, color: "#00b050", fontFamily: "monospace", padding: "2px 0" }}>{k}</div>)}
                </div>
              )}
            </div>
            {/* Key list */}
            <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 10, maxHeight: 400, overflowY: "auto" }}>
              {keys.map(k => (
                <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#0066ff" }}>{k.key}</div>
                    <div style={{ fontSize: 9, color: "#666" }}>{k.plan} · {k.status} · {k.deviceFp ? "bound" : "free"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {k.status === "active" || k.status === "used" ? (
                      <button onClick={() => keyAction("suspend", k.key)} style={{ padding: "3px 6px", background: "#ffc107", border: "none", borderRadius: 3, fontSize: 9, cursor: "pointer" }}>Suspend</button>
                    ) : (
                      <button onClick={() => keyAction("activate", k.key)} style={{ padding: "3px 6px", background: "#00b050", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Activate</button>
                    )}
                    <button onClick={() => keyAction("extend", k.key, 30)} style={{ padding: "3px 6px", background: "#0066ff", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>+30d</button>
                    {k.deviceFp && <button onClick={() => keyAction("reset_device", k.key)} style={{ padding: "3px 6px", background: "#17a2b8", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Reset</button>}
                    <button onClick={() => keyAction("delete", k.key)} style={{ padding: "3px 6px", background: "#dc3545", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Del</button>
                  </div>
                </div>
              ))}
              {keys.length === 0 && <div style={{ textAlign: "center", color: "#666", fontSize: 12, padding: 20 }}>No keys yet</div>}
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {tab === "devices" && (
          <div>
            <input type="text" placeholder="Search by key or device..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", borderRadius: 4, color: "#fff", fontSize: 12, marginBottom: 10 }} />
            <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 10, maxHeight: 400, overflowY: "auto" }}>
              {filteredDevices.map((d, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <div style={{ fontSize: 11, color: "#0066ff", fontFamily: "monospace" }}>{d.key}</div>
                  <div style={{ fontSize: 9, color: "#888" }}>Device: {d.deviceFp?.substring(0, 20)}... · {d.plan} · {d.status}</div>
                  <div style={{ fontSize: 9, color: "#666" }}>Bound: {d.boundAt ? new Date(d.boundAt).toLocaleDateString() : "N/A"}</div>
                  <button onClick={() => keyAction("reset_device", d.key)} style={{ marginTop: 4, padding: "3px 8px", background: "#dc3545", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Unbind</button>
                </div>
              ))}
              {filteredDevices.length === 0 && <div style={{ textAlign: "center", color: "#666", fontSize: 12, padding: 20 }}>No devices</div>}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: 10, maxHeight: 500, overflowY: "auto" }}>
            {users.map(u => (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#fff" }}>{u.name || u.email}</div>
                  <div style={{ fontSize: 9, color: u.banned ? "#dc3545" : "#00b050" }}>{u.banned ? "BANNED" : "Active"} · {u.licenseKey || "No license"}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {u.banned ? <button onClick={() => userAction("unban", u.id)} style={{ padding: "3px 6px", background: "#00b050", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Unban</button> : <button onClick={() => userAction("ban", u.id)} style={{ padding: "3px 6px", background: "#dc3545", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Ban</button>}
                  <button onClick={() => userAction("delete", u.id)} style={{ padding: "3px 6px", background: "#666", border: "none", borderRadius: 3, fontSize: 9, color: "#fff", cursor: "pointer" }}>Del</button>
                </div>
              </div>
            ))}
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
      </div>
    </div>
  );
}

function Shield2() {
  return <span style={{ fontSize: 18 }}>🛡️</span>;
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
      body: JSON.stringify({ title, message, target, adminPassword: "rmsmt_admin_2025" }),
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
