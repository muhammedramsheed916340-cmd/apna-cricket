"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Home, Loader2 } from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";

const GOOGLE_CLIENT_ID = "377910069955-90ivls7ne2qk81tkgurj52jc1cgqg7r4.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualToken, setManualToken] = useState("");

  useEffect(() => {
    // If already have user_token, redirect
    try {
      const token = localStorage.getItem("user_token");
      if (token && token.length > 20) {
        const params = new URLSearchParams(window.location.search);
        router.push(params.get("redirect") || "/");
        return;
      }
    } catch {}

    // Load Google Identity Services
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogle();
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [router]);

  const initGoogle = () => {
    if (!window.google?.accounts?.oauth2) {
      setError("Google Sign-In not available");
      return;
    }

    try {
      window.google.accounts.oauth2.initCodeClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid profile email",
        callback: async (response: { code?: string }) => {
          if (response.code) {
            await exchangeCode(response.code);
          }
        },
      }).requestCode();
    } catch (e) {
      setError("Google Sign-In failed to initialize");
    }
  };

  const exchangeCode = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("user_token", data.token);
        if (data.user) {
          localStorage.setItem("user_data", JSON.stringify(data.user));
        }
        const params = new URLSearchParams(window.location.search);
        router.push(params.get("redirect") || "/");
      } else {
        setError(data.message || data.error || "Google authentication failed");
      }
    } catch (e) {
      setError("Network error during Google sign-in");
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = () => {
    if (!window.google?.accounts?.oauth2) {
      setError("Google Sign-In not loaded yet. Wait a moment and try again.");
      return;
    }
    initGoogle();
  };

  return (
    <div className="tg-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <nav className="tg-header" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Menu size={32} className="text-white" style={{ marginLeft: 5, cursor: "pointer" }} onClick={() => setMenuOpen(true)} />
        <span className="navbar-brand mb-0 text-center">
          <img className="tg-logo" alt="tg logo" src="/tg_dark_logo.png" />
        </span>
        <Home size={28} className="text-white" style={{ marginRight: 8, cursor: "pointer" }} onClick={() => router.push("/")} />
      </nav>

      <main style={{ padding: "40px 16px 24px", textAlign: "center" }}>
        {loading ? (
          <>
            <Loader2 size={32} className="animate-spin" style={{ color: "#563d7c", marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "#212529" }}>Signing in with Google…</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#212529", marginBottom: 8 }}>
              Sign in required
            </div>
            <p style={{ fontSize: 13, color: "#6c757d", marginBottom: 20 }}>
              Google sign-in is required to transfer teams to Dream11, My11Circle, and Jumbo.
            </p>
            <button
              onClick={handleManualLogin}
              className="btn-tg-primary"
              style={{
                padding: "12px 24px",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              Sign in with Google
            </button>
            {error && (
              <div style={{ marginTop: 12, fontSize: 12, color: "#dc3545" }}>{error}</div>
            )}

            {/* Manual token input (for environments where Google OAuth origin isn't authorized) */}
            <div style={{ marginTop: 24, padding: 16, background: "#fff8e1", borderRadius: 8, border: "1px solid #ffc107", textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#856404", marginBottom: 6 }}>
                Manual Token (if Google sign-in fails)
              </div>
              <p style={{ fontSize: 11, color: "#856404", marginBottom: 8 }}>
                Go to teamgeneration.in → Sign in with Google → Open DevTools (F12) →
                Application → Local Storage → copy the value of "user_token" → paste here:
              </p>
              <input
                type="text"
                placeholder="Paste user_token here..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 12,
                  marginBottom: 8,
                }}
                onChange={(e) => setManualToken(e.target.value)}
              />
              <button
                onClick={() => {
                  if (manualToken && manualToken.length > 20) {
                    localStorage.setItem("user_token", manualToken);
                    const params = new URLSearchParams(window.location.search);
                    router.push(params.get("redirect") || "/");
                  }
                }}
                disabled={!manualToken || manualToken.length < 20}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "none",
                  borderRadius: 4,
                  background: manualToken && manualToken.length > 20 ? "#28a745" : "#ccc",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: manualToken && manualToken.length > 20 ? "pointer" : "not-allowed",
                }}
              >
                Save Token & Continue
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
