"use client";

import { useState } from "react";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { useLicense } from "@/lib/license-context";

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const { verified, loading, verify } = useLicense();
  const [keyInput, setKeyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Loader2 size={32} className="animate-spin" color="#0066ff" />
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, padding: 20 }}>
      <div style={{ background: "#0a0a0a", border: "2px solid #0066ff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 340, textAlign: "center", boxShadow: "0 0 20px rgba(0,102,255,0.3)" }}>
        <Lock size={48} color="#0066ff" style={{ margin: "0 auto 12px" }} />
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0066ff", marginBottom: 6 }}>🔒 License Required</h2>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
          Activate your RMSMT license key to unlock all team generation features.
        </p>
        <input
          type="text"
          placeholder="Enter your license key (RMSMT-XXXX-XXXX-XXXX)"
          value={keyInput}
          onChange={e => setKeyInput(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", background: "#111", border: "1px solid #333", borderRadius: 6, color: "#fff", fontSize: 13, textAlign: "center", marginBottom: 10 }}
        />
        <button
          onClick={handleVerify}
          disabled={verifying || keyInput.length < 10}
          style={{ width: "100%", padding: "10px", background: "#00b050", border: "none", borderRadius: 6, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: verifying || keyInput.length < 10 ? 0.5 : 1 }}
        >
          {verifying ? <Loader2 size={16} className="animate-spin" style={{ margin: "0 auto" }} /> : "Verify Key"}
        </button>
        {result && (
          <div style={{ marginTop: 10, fontSize: 12, color: result.success ? "#00b050" : "#dc3545", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {result.success ? <CheckCircle2 size={14} /> : <Lock size={14} />} {result.message}
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 10, color: "#555", textAlign: "left" }}>
          • 1 Key = 1 Device<br />
          • Device Binding Enabled<br />
          • Online Verification Required<br />
          • Stay Logged In Automatically
        </div>
      </div>
    </div>
  );
}
