"use client";

import { useState, useEffect } from "react";
import { Lock, Loader2, CheckCircle2, ShieldCheck, KeyRound } from "lucide-react";
import { useLicense } from "@/lib/license-context";

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const { verified, loading, verify } = useLicense();
  const [keyInput, setKeyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, render children (no loading, no gate)
  if (!mounted) return <>{children}</>;

  if (loading) {
    const locallyVerified =
      typeof window !== "undefined" &&
      localStorage.getItem("licenseVerified") === "true";
    if (locallyVerified) return <>{children}</>;
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 300,
        }}
      >
        <Loader2 size={28} className="animate-spin" color="#34d399" />
      </div>
    );
  }

  if (verified) return <>{children}</>;

  const handleVerify = async () => {
    if (!keyInput || keyInput.length < 10) return;
    setVerifying(true);
    setResult(null);
    const res = await verify(keyInput);
    setResult(res);
    setVerifying(false);
    if (res.success) {
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 420,
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 22,
          padding: 28,
          width: "100%",
          maxWidth: 360,
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4), 0 0 30px rgba(16,185,129,0.12)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            margin: "0 auto 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, rgba(52,211,153,0.18), rgba(6,182,212,0.18))",
            border: "1px solid rgba(16,185,129,0.35)",
          }}
        >
          <ShieldCheck size={32} color="#34d399" />
        </div>
        <h2
          style={{
            fontSize: 19,
            fontWeight: 800,
            color: "#e8eefc",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          License Required
        </h2>
        <p style={{ fontSize: 12, color: "#8a94b3", marginBottom: 18, lineHeight: 1.5 }}>
          Activate your <b style={{ color: "#34d399" }}>RMSMT</b> license key to unlock
          all team generation features.
        </p>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <KeyRound
            size={15}
            color="#8a94b3"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            type="text"
            placeholder="RMSMT-XXXX-XXXX-XXXX"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 12px 12px 34px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "#e8eefc",
              fontSize: 13,
              textAlign: "left",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(16,185,129,0.5)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          />
        </div>
        <button
          onClick={handleVerify}
          disabled={verifying || keyInput.length < 10}
          style={{
            width: "100%",
            padding: "12px",
            background:
              "linear-gradient(135deg, #34d399, #10b981)",
            border: "none",
            borderRadius: 12,
            color: "#04130d",
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
            opacity: verifying || keyInput.length < 10 ? 0.5 : 1,
            boxShadow: "0 6px 16px rgba(16,185,129,0.3)",
            transition: "all 0.2s ease",
          }}
        >
          {verifying ? (
            <Loader2 size={16} className="animate-spin" style={{ margin: "0 auto" }} />
          ) : (
            "Verify & Unlock"
          )}
        </button>
        {result && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              fontWeight: 600,
              color: result.success ? "#34d399" : "#f43f5e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {result.success ? <CheckCircle2 size={14} /> : <Lock size={14} />}{" "}
            {result.message}
          </div>
        )}
        <div
          style={{
            marginTop: 16,
            padding: "10px 12px",
            fontSize: 10,
            color: "#8a94b3",
            textAlign: "left",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 10,
            lineHeight: 1.7,
          }}
        >
          <div>• 1 Key = 1 Device</div>
          <div>• Device Binding Enabled</div>
          <div>• Online Verification Required</div>
          <div>• Stay Logged In Automatically</div>
        </div>
      </div>
    </div>
  );
}
