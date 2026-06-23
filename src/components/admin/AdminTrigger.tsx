"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, X, Loader2 } from "lucide-react";

const ADMIN_USER = "admin";
const ADMIN_PASS = "rmsmt_admin_2025";

export function AdminTrigger({ children }: { children: React.ReactNode }) {
  const [tapCount, setTapCount] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 3000);
    if (newCount >= 5) {
      setTapCount(0);
      setShowLogin(true);
    }
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowLogin(true);
    }, 3000);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleLogin = () => {
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (username === ADMIN_USER && password === ADMIN_PASS) {
        setShowLogin(false);
        setShowDashboard(true);
        setUsername("");
        setPassword("");
      } else {
        setError("❌ Invalid credentials");
      }
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  return (
    <>
      <div
        onClick={handleTap}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        {children}
      </div>

      {/* Admin Login Popup */}
      {showLogin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#0a0a0a", border: "2px solid #0066ff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 340, boxShadow: "0 0 30px rgba(0,102,255,0.4)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Shield size={40} color="#0066ff" style={{ margin: "0 auto 8px" }} />
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0066ff" }}>🛡️ RMSMT ADMIN PANEL</h2>
            </div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", background: "#111", border: "1px solid #333", borderRadius: 6, color: "#fff", fontSize: 14, marginBottom: 10 }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{ width: "100%", padding: "10px 12px", background: "#111", border: "1px solid #333", borderRadius: 6, color: "#fff", fontSize: 14, marginBottom: 12 }}
            />
            {error && <div style={{ fontSize: 12, color: "#dc3545", marginBottom: 8, textAlign: "center" }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleLogin} disabled={loading} style={{ flex: 2, padding: "10px", background: "#00b050", border: "none", borderRadius: 6, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading ? <Loader2 size={16} className="animate-spin" style={{ margin: "0 auto" }} /> : "Login"}
              </button>
              <button onClick={() => { setShowLogin(false); setError(""); }} style={{ flex: 1, padding: "10px", background: "#333", border: "none", borderRadius: 6, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Dashboard */}
      {showDashboard && <AdminDashboard onClose={() => setShowDashboard(false)} />}
    </>
  );
}

// Inline admin dashboard import
import { AdminDashboard } from "./AdminDashboard";
