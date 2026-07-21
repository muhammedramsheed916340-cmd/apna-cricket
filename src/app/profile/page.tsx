"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Menu, Home, User, Mail, LogOut, Settings, Bell, HelpCircle, ChevronRight, Shield, Trophy, Crown, Key, RefreshCw, Trash2, CheckCircle2, AlertCircle, Loader2, Lock, Sparkles, Gift } from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";
import { Header } from "@/components/tg/header";
import { useAuth } from "@/components/tg/auth-provider";
import { useSubscription } from "@/lib/subscription-context";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const router = useRouter();
  const { user, authChecked, logout } = useAuth();
  const { verified, plan, features, loading: subLoading, checkAndLock } = useSubscription();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [licenseData, setLicenseData] = useState<any>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Fetch license details from server
  const fetchLicense = useCallback(async () => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("licenseKey") : null;
      if (!stored) {
        setLicenseData(null);
        setLicenseLoading(false);
        return;
      }
      const deviceId = localStorage.getItem("deviceId") || "unknown";
      const res = await fetch("/api/subscription/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: stored, deviceFp: deviceId }),
      });
      const data = await res.json();
      setLicenseData(data);
    } catch {
      setLicenseData(null);
    } finally {
      setLicenseLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  // ====== Mask license key (never show full key) ======
  const maskKey = (key: string): string => {
    if (!key || key.length < 8) return "XXXX-XXXX-XXXX-XXXX";
    const parts = key.split("-");
    return parts.map((p, i) => {
      if (i === 0 || i === parts.length - 1) return p; // show prefix + last segment
      return "XXXX";
    }).join("-");
  };

  // ====== Remove license from this device ======
  const handleRemoveLicense = async () => {
    setRemoving(true);
    try {
      const stored = localStorage.getItem("licenseKey") || "";
      const deviceId = localStorage.getItem("deviceId") || "unknown";

      // Server: unbind device
      await fetch("/api/license/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_device", key: stored, adminPassword: "8950888988" }),
      }).catch(() => {});

      // Clear local storage
      localStorage.removeItem("licenseKey");
      localStorage.removeItem("licenseVerified");
      localStorage.removeItem("subscriptionVerified");

      // Refresh subscription state
      await checkAndLock();
      await fetchLicense();

      toast({
        title: "License Removed",
        description: "License has been unlinked from this device. Premium features locked.",
      });
      setShowRemoveConfirm(false);
    } catch (e) {
      toast({
        title: "Remove failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  // ====== License status calculation ======
  const getLicenseStatus = (): { label: string; color: string; emoji: string } => {
    if (!licenseData) return { label: "No License", color: "#8a94b3", emoji: "⚪" };
    if (!licenseData.valid) return { label: "Invalid", color: "#f43f5e", emoji: "🔴" };
    if (licenseData.expiresAt) {
      const now = Date.now();
      const daysLeft = Math.ceil((licenseData.expiresAt - now) / (24 * 60 * 60 * 1000));
      if (daysLeft < 0) return { label: "Expired", color: "#f43f5e", emoji: "🔴" };
      if (daysLeft <= 3) return { label: "Expiring Soon", color: "#f59e0b", emoji: "🟡" };
      return { label: "Active", color: "#34d399", emoji: "🟢" };
    }
    return { label: "Active", color: "#34d399", emoji: "🟢" };
  };

  const status = getLicenseStatus();
  const storedKey = typeof window !== "undefined" ? localStorage.getItem("licenseKey") : null;
  const remainingDays = licenseData?.expiresAt
    ? Math.max(0, Math.ceil((licenseData.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  useEffect(() => {
    // Auto-login bypass: always authenticated.
  }, [authChecked, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!authChecked) {
    return (
      <div className="ac-app">
        <div style={{ padding: 40, textAlign: "center", color: "#8a94b3" }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="ac-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Header onMenuClick={() => setMenuOpen(true)} />

      <main style={{ padding: "16px 14px 8px", flex: 1 }}>
        {/* Profile header */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: 22,
            marginBottom: 12,
            textAlign: "center",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: user.picture
                ? "transparent"
                : "linear-gradient(135deg, #34d399, #06b6d4)",
              color: "#04130d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              margin: "0 auto 12px",
              overflow: "hidden",
              border: "3px solid rgba(52,211,153,0.3)",
              boxShadow: "0 8px 24px rgba(16,185,129,0.25)",
            }}
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#e8eefc" }}>
            {user.name}
          </div>
          <div style={{ fontSize: 12, color: "#8a94b3", marginTop: 4 }}>
            {user.email}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 10,
              padding: "4px 12px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              color: "#34d399",
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          >
            <Shield size={11} /> Premium Member
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div
            style={{
              flex: 1,
              background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: 14,
              textAlign: "center",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <Trophy size={18} color="#f59e0b" style={{ margin: "0 auto 4px" }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>0</div>
            <div style={{ fontSize: 10, color: "#8a94b3", marginTop: 2 }}>Teams Generated</div>
          </div>
          <div
            style={{
              flex: 1,
              background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: 14,
              textAlign: "center",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <Crown size={18} color="#8b5cf6" style={{ margin: "0 auto 4px" }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: "#8b5cf6" }}>0</div>
            <div style={{ fontSize: 10, color: "#8a94b3", marginTop: 2 }}>Saved Matches</div>
          </div>
        </div>

        {/* ====== License & Subscription Card (Premium Glassmorphism) ====== */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(245,158,11,0.08), rgba(255,255,255,0.02))",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 18,
            padding: 18,
            marginBottom: 12,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Key size={16} color="#f59e0b" />
              <span style={{ fontSize: 14, fontWeight: 800, color: "#e8eefc" }}>License & Subscription</span>
            </div>
            <button
              onClick={() => { fetchLicense(); checkAndLock(); }}
              disabled={licenseLoading}
              style={{
                background: "none",
                border: "none",
                cursor: licenseLoading ? "wait" : "pointer",
                color: "#34d399",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {licenseLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Refresh
            </button>
          </div>

          {licenseLoading ? (
            <div style={{ textAlign: "center", padding: 20, color: "#8a94b3", fontSize: 12 }}>
              <Loader2 size={24} className="animate-spin" style={{ color: "#f59e0b", margin: "0 auto 8px" }} />
              Loading license details…
            </div>
          ) : !storedKey ? (
            /* No license */
            <div style={{ textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eefc", marginBottom: 4 }}>No License Active</div>
              <div style={{ fontSize: 11, color: "#8a94b3", marginBottom: 12 }}>
                Activate a license key to unlock premium features.
              </div>
              <button
                onClick={() => router.push("/premium")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={14} /> ⭐ Upgrade Now
              </button>
            </div>
          ) : (
            <>
              {/* License Key (masked) */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 10,
                marginBottom: 10,
              }}>
                <span style={{ fontSize: 11, color: "#8a94b3" }}>🔑 License Key</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#f59e0b", letterSpacing: "0.05em" }}>
                  {maskKey(storedKey || "")}
                </span>
              </div>

              {/* Status badge */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: `${status.color}15`,
                border: `1px solid ${status.color}33`,
                borderRadius: 10,
                marginBottom: 10,
              }}>
                <span style={{ fontSize: 11, color: "#8a94b3" }}>🟢 Status</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: status.color }}>
                  {status.emoji} {status.label}
                </span>
              </div>

              {/* Dates grid */}
              {licenseData?.valid && licenseData.expiresAt && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <div style={{ padding: 8, background: "rgba(255,255,255,0.03)", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#8a94b3" }}>Activated</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#e8eefc" }}>
                      {new Date().toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: 9, color: "#8a94b3" }}>
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div style={{ padding: 8, background: "rgba(255,255,255,0.03)", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#8a94b3" }}>Expiry</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#e8eefc" }}>
                      {new Date(licenseData.expiresAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: 9, color: "#8a94b3" }}>
                      {new Date(licenseData.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              )}

              {/* Remaining days + device status */}
              {licenseData?.valid && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, padding: 8, background: "rgba(16,185,129,0.1)", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#8a94b3" }}>⏳ Remaining</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#34d399" }}>{remainingDays}d</div>
                  </div>
                  <div style={{ flex: 1, padding: 8, background: "rgba(6,182,212,0.1)", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#8a94b3" }}>📱 Device</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#06b6d4" }}>Bound</div>
                  </div>
                </div>
              )}

              {/* Current plan + features */}
              <div style={{
                padding: "10px 14px",
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: 10,
                marginBottom: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#8a94b3" }}>💎 Current Plan</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase" }}>
                    {(licenseData?.plan || plan || "free")}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(licenseData?.features || features || []).slice(0, 6).map((f: string, i: number) => (
                    <span key={`feat-${f}-${i}`} style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.05)",
                      color: "#b4bcd6",
                      fontWeight: 600,
                    }}>
                      {f.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  onClick={() => router.push("/premium")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "none",
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <Sparkles size={13} /> ⭐ Upgrade Plan
                </button>
                <button
                  onClick={() => router.push("/contactus")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    color: "#e8eefc",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  📞 Support
                </button>
              </div>

              {/* Remove Key button */}
              <button
                onClick={() => setShowRemoveConfirm(true)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid rgba(244,63,94,0.3)",
                  borderRadius: 10,
                  background: "rgba(244,63,94,0.08)",
                  color: "#f43f5e",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Trash2 size={13} /> 🗑 Remove Key
              </button>
            </>
          )}
        </div>

        {/* ====== Remove License Confirmation Popup ====== */}
        {showRemoveConfirm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 320,
                background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(5,8,22,0.98))",
                border: "1px solid rgba(244,63,94,0.3)",
                borderRadius: 20,
                padding: 24,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  margin: "0 auto 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(244,63,94,0.15)",
                  border: "1px solid rgba(244,63,94,0.3)",
                }}
              >
                <Trash2 size={26} color="#f43f5e" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#e8eefc", marginBottom: 6 }}>
                Remove License Key?
              </div>
              <div style={{ fontSize: 12, color: "#8a94b3", marginBottom: 18, lineHeight: 1.5 }}>
                Are you sure you want to remove this license from this device?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  disabled={removing}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.04)",
                    color: "#e8eefc",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ❌ Cancel
                </button>
                <button
                  onClick={handleRemoveLicense}
                  disabled={removing}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "none",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #f43f5e, #e11d48)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: removing ? "wait" : "pointer",
                    opacity: removing ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  🗑 Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====== Membership Plans Section ====== */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#e8eefc", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Crown size={16} color="#f59e0b" /> Membership Plans
          </div>
          {[
            { id: "free", emoji: "🆓", name: "FREE", price: "₹0", color: "#8a94b3", features: ["10 Teams / Match", "Basic AI", "1 Dream11 Account", "Join Contest Locked"] },
            { id: "match_pass", emoji: "⭐", name: "MATCH PASS", price: "₹49", color: "#06b6d4", features: ["1 Match Access", "20 Teams", "Unlimited Transfer", "Join Contest"] },
            { id: "daily", emoji: "🔥", name: "DAILY PRO", price: "₹99", color: "#f59e0b", features: ["24 Hours", "40 Teams", "Dream11 + My11Circle", "Smart Mix Join"], popular: true },
            { id: "monthly", emoji: "💎", name: "PRO", price: "₹499", color: "#8b5cf6", features: ["30 Days", "40 Teams Every Match", "Auto Team Transfer", "Priority Server"] },
            { id: "elite", emoji: "👑", name: "ELITE AI", price: "₹1499", color: "#fbbf24", features: ["90 Days", "500 Teams", "Elite AI (173 Analysis)", "VIP Server"], bestValue: true },
          ].map((p) => {
            const isCurrent = (licenseData?.plan || plan) === p.id;
            return (
              <div
                key={`plan-${p.id}`}
                style={{
                  position: "relative",
                  background: isCurrent
                    ? `linear-gradient(180deg, ${p.color}20, ${p.color}05)`
                    : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                  border: isCurrent ? `1px solid ${p.color}55` : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 8,
                }}
              >
                {p.popular && (
                  <span style={{
                    position: "absolute",
                    top: -6,
                    right: 8,
                    fontSize: 8,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                    color: "#fff",
                  }}>⭐ POPULAR</span>
                )}
                {p.bestValue && (
                  <span style={{
                    position: "absolute",
                    top: -6,
                    right: 8,
                    fontSize: 8,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    color: "#1a1a1a",
                  }}>💎 BEST VALUE</span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 22 }}>{p.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: p.color }}>{p.name}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#e8eefc" }}>{p.price}</div>
                  </div>
                  {isCurrent && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: `${p.color}20`,
                      color: p.color,
                      border: `1px solid ${p.color}44`,
                    }}>✓ CURRENT</span>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {p.features.map((f, i) => (
                    <span key={`pf-${p.id}-${i}`} style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.04)",
                      color: "#b4bcd6",
                    }}>{f}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Menu items */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            overflow: "hidden",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          {[
            { icon: Settings, label: "Settings", color: "#06b6d4" },
            { icon: Bell, label: "Notifications", color: "#f59e0b" },
            { icon: HelpCircle, label: "Help & Support", color: "#8b5cf6" },
            { icon: Mail, label: "Contact Us", color: "#34d399", path: "/contactus" },
          ].map((item, i, arr) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => item.path && router.push(item.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: `${item.color}1A`,
                    border: `1px solid ${item.color}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={16} color={item.color} />
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#e8eefc" }}>
                  {item.label}
                </span>
                <ChevronRight size={16} color="#8a94b3" />
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            marginTop: 14,
            padding: "14px",
            border: "1px solid rgba(244,63,94,0.3)",
            background: "rgba(244,63,94,0.08)",
            color: "#f43f5e",
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <LogOut size={16} /> Logout
        </button>

        <div className="ac-credits" style={{ marginTop: 18 }}>
          <div>
            © 2025 <b>Apna Cricket</b> · All Rights Reserved
          </div>
        </div>
      </main>

      <BottomNav active="user" />
    </div>
  );
}
