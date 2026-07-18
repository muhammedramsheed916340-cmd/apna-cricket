"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Home, Loader2 } from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";
import { AdminTrigger } from "@/components/admin/AdminTrigger";

export default function LoginPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect") || "/";

    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Apna Cricket User",
        email: "user@gmail.com",
        picture: "",
      }),
    })
      .then(() => router.push(redirect))
      .catch(() => router.push(redirect));
  }, [router]);

  return (
    <div className="ac-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />

      <header className="ac-header">
        <button
          type="button"
          className="ac-icon-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <AdminTrigger>
          <img
            className="ac-logo"
            alt="Apna Cricket logo"
            src="/apna_cricket_logo.png"
          />
        </AdminTrigger>
        <button
          type="button"
          className="ac-icon-btn"
          onClick={() => router.push("/")}
          aria-label="Home"
        >
          <Home size={18} />
        </button>
      </header>

      <main
        style={{
          padding: "60px 24px",
          textAlign: "center",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(6,182,212,0.15))",
            border: "1px solid rgba(16,185,129,0.3)",
            marginBottom: 18,
          }}
        >
          <Loader2 size={30} className="animate-spin" style={{ color: "#34d399" }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e8eefc", marginBottom: 6 }}>
          Signing you in…
        </div>
        <div style={{ fontSize: 13, color: "#8a94b3" }}>
          Setting up your Apna Cricket session
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
