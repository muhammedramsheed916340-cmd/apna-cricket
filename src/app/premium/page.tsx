"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Sparkles,
  Check,
  Zap,
  Rocket,
  Trophy,
  Shield,
  X,
  Loader2,
  Star,
} from "lucide-react";
import { Header } from "@/components/tg/header";
import { BottomNav } from "@/components/tg/bottom-nav";
import { SideNav } from "@/components/tg/side-nav";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/lib/subscription-context";

interface Plan {
  id: string;
  name: string;
  emoji: string;
  price: string;
  duration: string;
  features: string[];
  popular?: boolean;
  bestValue?: boolean;
  color: string;
  gradient: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "FREE",
    emoji: "🆓",
    price: "₹0",
    duration: "Forever",
    color: "#8a94b3",
    gradient: "linear-gradient(135deg, rgba(138,148,179,0.15), rgba(138,148,179,0.05))",
    features: ["10 Teams", "Basic AI", "Limited Features"],
  },
  {
    id: "match_pass",
    name: "MATCH PASS",
    emoji: "⭐",
    price: "₹49",
    duration: "1 Match",
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.05))",
    features: ["1 Match Access", "20 Teams", "Unlimited Team Transfer", "Priority Server"],
  },
  {
    id: "daily",
    name: "DAILY PRO",
    emoji: "🔥",
    price: "₹99",
    duration: "24 Hours",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))",
    features: ["24 Hours Access", "40 Teams", "Dream11 + My11Circle", "AI Captain Prediction", "Live Updates"],
    popular: true,
  },
  {
    id: "monthly",
    name: "PRO",
    emoji: "💎",
    price: "₹499",
    duration: "30 Days",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))",
    features: ["30 Days Access", "40 Teams Every Match", "Auto Team Transfer", "Premium Research", "Priority AI Engine", "Faster Servers"],
  },
  {
    id: "elite",
    name: "ELITE AI",
    emoji: "👑",
    price: "₹1499",
    duration: "90 Days",
    color: "#fbbf24",
    gradient: "linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.05))",
    features: ["90 Days Access", "500 Teams", "Elite AI Analysis", "Rank 1 Strategy", "VIP Servers", "Premium Support", "Fastest Processing", "Exclusive Features"],
    bestValue: true,
  },
];

const WHY_UPGRADE = [
  "Elite AI Analysis",
  "Faster Team Generation",
  "Auto Team Transfer",
  "Unlimited Research",
  "Premium Server",
  "VIP Support",
  "Daily Updates",
  "Highest Performance",
];

export default function PremiumPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { verify, verified, plan: currentPlan } = useSubscription();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  // ====== Activate License (ONLY this function unlocks premium) ======
  // Calls server-side verification. Never unlocks without server confirmation.
  const handleActivateLicense = async () => {
    if (!keyInput.trim()) {
      toast({
        title: "Enter license key",
        description: "Paste your license key to activate.",
        variant: "destructive",
      });
      return;
    }
    setActivating(true);
    try {
      const success = await verify(keyInput.trim());
      if (success) {
        toast({
          title: "Subscription Activated!",
          description: "Server verification passed. Premium features unlocked.",
        });
      } else {
        toast({
          title: "Activation Failed",
          description: "Invalid, expired, or revoked license key. Server verification failed.",
          variant: "destructive",
        });
      }
    } finally {
      setActivating(false);
    }
  };

  // ====== Buy Now → does NOT unlock. Shows purchase instructions. ======
  const handleBuyNow = (planName: string, price: string) => {
    toast({
      title: `Purchase ${planName}`,
      description: `Contact admin to purchase ${planName} (${price}). After payment, you'll receive a license key to activate.`,
    });
  };

  // ====== Restore → server-side verification with stored key ======
  const handleRestore = async () => {
    const storedKey = typeof window !== "undefined" ? localStorage.getItem("licenseKey") : null;
    if (!storedKey) {
      toast({
        title: "No license found",
        description: "Enter your license key above to restore.",
        variant: "destructive",
      });
      return;
    }
    setActivating(true);
    try {
      const success = await verify(storedKey);
      if (success) {
        toast({
          title: "License Restored!",
          description: "Server verification passed. Premium features restored.",
        });
      } else {
        toast({
          title: "Restore Failed",
          description: "License is invalid, expired, or revoked. Server verification failed.",
          variant: "destructive",
        });
      }
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="ac-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Header onMenuClick={() => setMenuOpen(true)} />

      <main style={{ padding: "8px 14px 8px", flex: 1 }}>
        {/* ====== Hero Header ====== */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(180deg, rgba(245,158,11,0.15), rgba(5,8,22,0.5))",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 24,
            padding: "28px 20px",
            marginBottom: 20,
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          {/* Floating particles effect (CSS) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `
                radial-gradient(circle at 20% 30%, rgba(251,191,36,0.15), transparent 40%),
                radial-gradient(circle at 80% 70%, rgba(6,182,212,0.1), transparent 40%),
                radial-gradient(circle at 50% 50%, rgba(245,158,11,0.08), transparent 60%)
              `,
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                margin: "0 auto 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                boxShadow: "0 8px 30px rgba(251,191,36,0.4)",
                animation: "goldPulse 2s ease-in-out infinite",
              }}
            >
              <Crown size={32} color="#fff" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fbbf24", marginBottom: 4, letterSpacing: "-0.02em" }}>
              👑 Premium Membership
            </div>
            <div style={{ fontSize: 13, color: "#e8eefc", fontWeight: 500 }}>
              Unlock Elite AI Fantasy Cricket Features
            </div>
            {verified && currentPlan && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 10,
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#34d399",
                  background: "rgba(16,185,129,0.15)",
                  border: "1px solid rgba(16,185,129,0.4)",
                }}
              >
                <Check size={11} /> ACTIVE: {currentPlan.toUpperCase()}
              </div>
            )}
          </div>

          <style>{`
            @keyframes goldPulse {
              0%, 100% { box-shadow: 0 8px 30px rgba(251,191,36,0.4); }
              50% { box-shadow: 0 8px 40px rgba(251,191,36,0.7); }
            }
          `}</style>
        </div>

        {/* ====== License Key Input ====== */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eefc", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Shield size={15} color="#fbbf24" /> Activate License Key
          </div>
          <input
            type="text"
            placeholder="RMSMT-XXXX-XXXX-XXXX"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.05)",
              color: "#e8eefc",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
              fontFamily: "monospace",
              marginBottom: 10,
              outline: "none",
              textAlign: "center",
            }}
          />
          <button
            onClick={handleActivateLicense}
            disabled={activating}
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              borderRadius: 12,
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              color: "#1a1a1a",
              fontSize: 13,
              fontWeight: 800,
              cursor: activating ? "wait" : "pointer",
              opacity: activating ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {activating ? (
              <><Loader2 size={15} className="animate-spin" /> Verifying…</>
            ) : (
              <><Zap size={15} /> Activate License</>
            )}
          </button>
        </div>

        {/* ====== Subscription Cards ====== */}
        {PLANS.map((p) => (
          <div
            key={p.id}
            style={{
              position: "relative",
              background: p.gradient,
              border: p.popular
                ? "1px solid rgba(6,182,212,0.5)"
                : p.bestValue
                ? "1px solid rgba(251,191,36,0.5)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 18,
              marginBottom: 12,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            {/* Popular / Best Value badge */}
            {p.popular && (
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  right: 12,
                  background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: 999,
                  letterSpacing: "0.04em",
                  boxShadow: "0 4px 12px rgba(6,182,212,0.4)",
                }}
              >
                ⭐ POPULAR
              </div>
            )}
            {p.bestValue && (
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  right: 12,
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  color: "#1a1a1a",
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: 999,
                  letterSpacing: "0.04em",
                  boxShadow: "0 4px 12px rgba(251,191,36,0.4)",
                }}
              >
                💎 BEST VALUE
              </div>
            )}

            {/* Plan header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `${p.color}25`,
                  border: `1px solid ${p.color}55`,
                  fontSize: 22,
                }}
              >
                {p.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: p.color }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "#8a94b3" }}>{p.duration}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: 20,
                  fontWeight: 900,
                  background: `linear-gradient(135deg, ${p.color}, ${p.color}aa)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  {p.price}
                </div>
              </div>
            </div>

            {/* Features checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {p.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: `${p.color}20`,
                      border: `1px solid ${p.color}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Check size={11} color={p.color} />
                  </div>
                  <span style={{ color: "#b4bcd6", fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Buy Now button — does NOT unlock premium */}
            <button
              onClick={() => handleBuyNow(p.name, p.price)}
              disabled={p.id === "free"}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: 12,
                background: p.id === "free"
                  ? "rgba(255,255,255,0.06)"
                  : `linear-gradient(135deg, ${p.color}, ${p.color}dd)`,
                color: p.id === "free" ? "#8a94b3" : "#fff",
                fontSize: 13,
                fontWeight: 800,
                cursor: p.id === "free" ? "default" : "pointer",
                opacity: p.id === "free" ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: p.id === "free" ? "none" : `0 4px 14px ${p.color}44`,
              }}
            >
              {p.id === "free" ? (
                <>Current Plan</>
              ) : (
                <><Rocket size={15} /> Buy Now</>
              )}
            </button>
          </div>
        ))}

        {/* ====== Why Upgrade Section ====== */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(245,158,11,0.08), rgba(255,255,255,0.02))",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 20,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fbbf24", marginBottom: 12, textAlign: "center" }}>
            Why Upgrade?
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {WHY_UPGRADE.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#b4bcd6" }}>
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                  <Check size={13} color="#34d399" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* ====== Bottom Buttons ====== */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            style={{
              flex: 1,
              padding: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
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
            onClick={handleRestore}
            disabled={activating}
          >
            {activating ? "🔄 Restoring…" : "🔄 Restore"}
          </button>
          <button
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              borderRadius: 12,
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              color: "#1a1a1a",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
            onClick={() => router.push("/")}
          >
            📋 View Plans
          </button>
        </div>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
