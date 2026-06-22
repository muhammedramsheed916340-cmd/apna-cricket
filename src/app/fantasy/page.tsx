"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Home,
  Phone,
  Shield,
  Link2,
  Unlink,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  Send,
  KeyRound,
} from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";
import { FANTASY_PLATFORMS, type FantasyPlatform } from "@/lib/fantasy";
import { useToast } from "@/hooks/use-toast";

interface Account {
  slug: string;
  name: string;
  mobileNumber: string;
  authToken: string | null;
  linked: boolean;
  linkedAt: number | null;
  logo?: string;
  limit?: number;
}

const PLATFORM_STYLE: Record<
  string,
  { bg: string; color: string; abbr: string }
> = {
  dream11: { bg: "#d13239", color: "#fff", abbr: "D11" },
  my11circle: { bg: "#1a936f", color: "#fff", abbr: "M11" },
  jumbo: { bg: "#f6ae2d", color: "#3d2817", abbr: "JB" },
};

export default function FantasyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // OTP modal state
  const [activePlatform, setActivePlatform] = useState<FantasyPlatform | null>(null);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [retriesLeft, setRetriesLeft] = useState<number | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fantasy/accounts", { cache: "no-store" });
      const data = await res.json();
      setAccounts(data?.accounts || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const openLink = (p: FantasyPlatform) => {
    setActivePlatform(p);
    setMobile("");
    setOtp("");
    setStep("mobile");
    setRetriesLeft(null);
  };

  const sendOtp = async () => {
    if (!activePlatform) return;
    if (!/^\d{10}$/.test(mobile)) {
      toast({
        title: "Invalid mobile",
        description: "Enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/fantasy/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fantasyApp: activePlatform.slug,
          mobileNumber: mobile,
        }),
      });
      const data = await res.json();
      if (data?.status === "success") {
        setStep("otp");
        setResendTimer(60);
        setRetriesLeft(data.data?.retriesLeft ?? null);
        toast({
          title: "OTP Sent via SMS",
          description: `A real OTP has been sent to ${mobile} via SMS. Check your phone. ${
            data.data?.retriesLeft != null ? `(${data.data.retriesLeft} attempts left)` : ""
          }`,
        });
      } else {
        toast({
          title: "Failed",
          description: data?.message || "Failed to send OTP",
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!activePlatform) return;
    if (!/^\d{4,6}$/.test(otp)) {
      toast({
        title: "Invalid OTP",
        description: "Enter the OTP received via SMS (4-6 digits)",
        variant: "destructive",
      });
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/fantasy/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fantasyApp: activePlatform.slug,
          mobileNumber: mobile,
          verificationCode: otp,
        }),
      });
      const data = await res.json();
      if (data?.status === "success") {
        toast({
          title: "Account Linked",
          description: `${activePlatform.name} linked successfully`,
        });
        setActivePlatform(null);
        loadAccounts();
      } else {
        toast({
          title: "Verification failed",
          description: data?.message || "Invalid OTP",
          variant: "destructive",
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  const unlink = async (slug: string) => {
    if (!confirm(`Unlink ${slug} account?`)) return;
    const res = await fetch("/api/fantasy/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyApp: slug }),
    });
    const data = await res.json();
    if (data?.status === "success") {
      toast({ title: "Unlinked", description: `${slug} account unlinked` });
      loadAccounts();
    }
  };

  const linkedMap = new Map(accounts.map((a) => [a.slug, a]));

  return (
    <div className="tg-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <nav className="tg-header" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Menu
          size={32}
          className="text-white"
          style={{ marginLeft: 5, cursor: "pointer" }}
          onClick={() => setMenuOpen(true)}
        />
        <span className="navbar-brand mb-0 text-center">
          <img className="tg-logo" alt="tg logo" src="/tg_dark_logo.png" />
        </span>
        <Home
          size={28}
          className="text-white"
          style={{ marginRight: 8, cursor: "pointer" }}
          onClick={() => router.push("/")}
        />
      </nav>

      <main style={{ padding: "12px 10px 24px" }}>
        <h4
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#212529",
            margin: "8px 0 4px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Shield size={18} color="#563d7c" /> Fantasy App Preference
        </h4>
        <p style={{ fontSize: 12, color: "#6c757d", marginBottom: 12 }}>
          Link your fantasy platforms (Dream11, My11Circle, Jumbo) via OTP to
          transfer generated teams directly.
        </p>

        {/* Platform list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 20, color: "#6c757d", fontSize: 13 }}>
            Loading…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FANTASY_PLATFORMS.map((p) => {
              const acc = linkedMap.get(p.slug);
              const style = PLATFORM_STYLE[p.slug];
              return (
                <div
                  key={p.slug}
                  style={{
                    background: "#fff",
                    borderRadius: 10,
                    padding: 14,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: style.bg,
                        color: style.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {style.abbr}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#212529" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#6c757d" }}>
                        {acc?.linked
                          ? `Linked: ${acc.mobileNumber}`
                          : `Not linked · Limit ${p.limit} teams/batch`}
                      </div>
                    </div>
                    {acc?.linked ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <span
                          style={{
                            background: "#d4edda",
                            color: "#155724",
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <CheckCircle2 size={11} /> Linked
                        </span>
                        <button
                          onClick={() => unlink(p.slug)}
                          style={{
                            padding: "4px 8px",
                            border: "1px solid #dc3545",
                            background: "#fff",
                            color: "#dc3545",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Unlink size={11} /> Unlink
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openLink(p)}
                        className="btn-tg-primary"
                        style={{
                          padding: "6px 12px",
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Transfer arena shortcut */}
        <a
          href="/match/nz-sco-wt20/transfer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fff",
            borderRadius: 8,
            padding: "12px 14px",
            marginTop: 14,
            textDecoration: "none",
            color: "#212529",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={18} color="#563d7c" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Go to Transfer Arena
            </span>
          </span>
          <ChevronRight size={16} color="#6c757d" />
        </a>

      </main>

      {/* OTP Modal */}
      {activePlatform && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setActivePlatform(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              width: "100%",
              maxWidth: 360,
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: PLATFORM_STYLE[activePlatform.slug].bg,
                  color: PLATFORM_STYLE[activePlatform.slug].color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {PLATFORM_STYLE[activePlatform.slug].abbr}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  Link {activePlatform.name}
                </div>
                <div style={{ fontSize: 11, color: "#6c757d" }}>
                  OTP-based secure login
                </div>
              </div>
            </div>

            {step === "mobile" ? (
              <>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#212529",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Mobile Number
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: "0 12px",
                    marginBottom: 14,
                  }}
                >
                  <Phone size={16} color="#6c757d" />
                  <span style={{ fontSize: 14, color: "#6c757d" }}>+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) =>
                      setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="9848579715"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      padding: "12px 0",
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  />
                </div>
                <button
                  onClick={sendOtp}
                  disabled={sending || mobile.length !== 10}
                  className="btn-tg-primary"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: sending ? "wait" : "pointer",
                    opacity: sending || mobile.length !== 10 ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {sending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Sending OTP…
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Send OTP
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    background: "#e3f2fd",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 14,
                    fontSize: 12,
                    color: "#0d47a1",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <Phone size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                  <div>
                    A <strong>real OTP</strong> has been sent via SMS to{" "}
                    <strong>+91 {mobile}</strong>. Enter the code you received
                    below.
                    {retriesLeft != null && (
                      <div style={{ marginTop: 4, fontSize: 11 }}>
                        {retriesLeft} verification attempt(s) left
                      </div>
                    )}
                  </div>
                </div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#212529",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Verification Code
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: "0 12px",
                    marginBottom: 14,
                  }}
                >
                  <KeyRound size={16} color="#6c757d" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter OTP from SMS"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      padding: "12px 0",
                      fontSize: 18,
                      fontWeight: 700,
                      letterSpacing: 4,
                    }}
                  />
                </div>
                <button
                  onClick={verifyOtp}
                  disabled={verifying || otp.length < 4}
                  className="btn-tg-success"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: verifying ? "wait" : "pointer",
                    opacity: verifying || otp.length < 4 ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {verifying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Verify &amp; Login
                    </>
                  )}
                </button>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={() => setStep("mobile")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6c757d",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Change number
                  </button>
                  <button
                    onClick={sendOtp}
                    disabled={resendTimer > 0}
                    style={{
                      background: "none",
                      border: "none",
                      color: resendTimer > 0 ? "#999" : "#563d7c",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: resendTimer > 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => setActivePlatform(null)}
              style={{
                width: "100%",
                marginTop: 12,
                background: "none",
                border: "none",
                color: "#6c757d",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// Shared Token section — allows setting a Google JWT (Bearer token) for transfers.
// The tgsoftware-api.online backend requires Authorization: Bearer <jwt> for
// add-team/edit-team. Without it, transfers return "Something Went Wrong!".
function SharedTokenSection() {
  const [hasToken, setHasToken] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const check = async () => {
    try {
      const res = await fetch("/api/auth/shared-token", { cache: "no-store" });
      const data = await res.json();
      setHasToken(!!data?.hasSharedToken);
    } catch {}
  };

  useEffect(() => {
    check();
  }, []);

  const save = async () => {
    if (!token || token.length < 20) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/shared-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password || "8950888988", token }),
      });
      const data = await res.json();
      if (data?.status === "success") {
        setHasToken(true);
        setShowInput(false);
        setToken("");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        padding: 14,
        marginTop: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Shield size={16} color={hasToken ? "#28a745" : "#dc3545"} />
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
          Transfer Bearer Token
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 4,
            background: hasToken ? "#d4edda" : "#fdecee",
            color: hasToken ? "#155724" : "#dc3545",
          }}
        >
          {hasToken ? "ACTIVE" : "MISSING"}
        </span>
      </div>
      <p style={{ fontSize: 11, color: "#6c757d", marginBottom: 8 }}>
        The backend requires a Bearer JWT for team transfers. Without it, transfers
        will fail with "Something Went Wrong!". Set a Google JWT to enable transfers.
      </p>
      {!hasToken && !showInput && (
        <button
          onClick={() => setShowInput(true)}
          className="btn-tg-primary"
          style={{
            padding: "8px 12px",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Set Bearer Token
        </button>
      )}
      {showInput && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste Google JWT token here"
            style={{
              padding: "8px 10px",
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: 12,
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password (default: 8950888988)"
            style={{
              padding: "8px 10px",
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: 12,
            }}
          />
          <button
            onClick={save}
            disabled={saving || token.length < 20}
            className="btn-tg-success"
            style={{
              padding: "8px 12px",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
              opacity: saving || token.length < 20 ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Token"}
          </button>
        </div>
      )}
    </div>
  );
}
