"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Home, Shield, Zap, Trophy, Target, Lightbulb } from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";

export default function LoginPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="tg-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <nav
        className="tg-header"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
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

      <main style={{ padding: "20px 16px 24px" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 8, fontSize: 22, fontWeight: 700, color: "#212529" }}>
          Welcome 👋
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#212529", marginBottom: 6 }}>
          Login or Sign Up
        </div>
        <div style={{ fontSize: 14, color: "#6c757d", marginBottom: 16 }}>
          Sign in to create high quality teams, transfer and join seamlessly.
        </div>

        {/* Illustration */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <img
            src="https://i.ibb.co/3SHqJqL/login-illustration.png"
            alt="login illustration"
            style={{ width: "70%", maxWidth: 240 }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={() => {
            /* Google OAuth placeholder - sign-in flow */
            alert("Google sign-in is not configured in this demo build.");
          }}
          style={{
            width: "100%",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontSize: 15,
            fontWeight: 500,
            color: "#212529",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
              fill="#FF3D00"
              d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
          </svg>
          Sign in with Google
        </button>

        {/* Feature cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            marginTop: 18,
          }}
        >
          {[
            { icon: Shield, color: "#563d7c", t: "Secure & Safe", s: "Your data is protected" },
            { icon: Zap, color: "#f0ad4e", t: "Fast & Reliable", s: "Instant team generation" },
            { icon: Trophy, color: "#e67e22", t: "Smart Teams", s: "AI-powered accuracy" },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.t}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: "12px 6px",
                  textAlign: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <Icon size={24} color={f.color} style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: "#212529" }}>
                  {f.t}
                </div>
                <div style={{ fontSize: 10, color: "#6c757d", marginTop: 2 }}>
                  {f.s}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 14,
          }}
        >
          <div
            style={{
              flex: 1,
              background: "#fff",
              borderRadius: 8,
              padding: "14px 10px",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <Target size={22} color="#563d7c" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: "#563d7c" }}>
              91.2%
            </div>
            <div style={{ fontSize: 11, color: "#6c757d" }}>Accuracy</div>
          </div>
          <div
            style={{
              flex: 1,
              background: "#fff",
              borderRadius: 8,
              padding: "14px 10px",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <Lightbulb size={22} color="#563d7c" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: "#563d7c" }}>
              Premium
            </div>
            <div style={{ fontSize: 11, color: "#6c757d" }}>Software</div>
          </div>
        </div>

        {/* WhatsApp help */}
        <a
          href="https://wa.me/919848579715"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#25D366",
            color: "#fff",
            borderRadius: 8,
            padding: "12px 14px",
            marginTop: 16,
            textDecoration: "none",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z" />
            </svg>
            Need help? Contact us on WhatsApp
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <strong>9848579715</strong>
            <span aria-hidden="true">›</span>
          </span>
        </a>

        {/* Footer */}
        <div className="tg-credits" style={{ marginTop: 18 }}>
          <div>
            Developed By{" "}
            <a
              href="https://www.youtube.com/c/Believer01"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <span className="bel">Believer01</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff0000" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>
          <div style={{ color: "#6c757d", marginTop: 2 }}>
            Refer your friends for benefits
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
