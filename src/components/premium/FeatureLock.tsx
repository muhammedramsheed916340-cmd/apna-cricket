"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Crown, Sparkles, X, ChevronRight } from "lucide-react";

interface FeatureLockProps {
  featureName?: string;
  onClose?: () => void;
}

export function FeatureLock({ featureName = "Premium Feature", onClose }: FeatureLockProps) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        router.back();
      }
    }, 200);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 340,
          background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(5,8,22,0.98))",
          border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: 24,
          padding: 28,
          textAlign: "center",
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(245,158,11,0.15)",
          animation: "slideUp 0.3s ease",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#8a94b3",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Lock icon with glow */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))",
            border: "1px solid rgba(245,158,11,0.4)",
            boxShadow: "0 0 30px rgba(245,158,11,0.2)",
          }}
        >
          <Lock size={32} color="#f59e0b" />
        </div>

        {/* Title */}
        <div style={{ fontSize: 18, fontWeight: 800, color: "#e8eefc", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Sparkles size={16} color="#f59e0b" />
          {featureName}
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 13, color: "#8a94b3", marginBottom: 20, lineHeight: 1.5 }}>
          Upgrade your membership to unlock this feature.
        </div>

        {/* Buttons */}
        <button
          onClick={() => router.push("/premium")}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: 14,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginBottom: 10,
            boxShadow: "0 6px 20px rgba(245,158,11,0.3)",
          }}
        >
          <Crown size={16} /> ⭐ Upgrade Now
        </button>

        <button
          onClick={() => router.push("/premium")}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            color: "#e8eefc",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginBottom: 10,
          }}
        >
          📋 View Plans <ChevronRight size={14} />
        </button>

        <button
          onClick={handleClose}
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: 14,
            background: "transparent",
            color: "#8a94b3",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ❌ Close
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
