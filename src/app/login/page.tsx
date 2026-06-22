"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { Menu, Home, Loader2 } from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";

function LoginInner() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [redirectLabel, setRedirectLabel] = useState("home");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("redirect") || "";

    // Auto-login bypass: create a session and redirect immediately.
    // The Google login screen is skipped — visitors are always logged in.
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Generation User",
        email: "user@gmail.com",
        picture: "",
      }),
    })
      .then((res) => res.json())
      .then(() => {
        router.push(r || "/");
      })
      .catch(() => {
        router.push(r || "/");
      });
  }, [router]);

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

      <main
        style={{
          padding: "40px 16px 24px",
          textAlign: "center",
          color: "#6c757d",
        }}
      >
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "#563d7c", marginBottom: 12 }}
        />
        <div style={{ fontSize: 14, fontWeight: 600, color: "#212529" }}>
          Signing you in…
        </div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          Redirecting to {redirectLabel}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="tg-app">
          <div style={{ padding: 40, textAlign: "center", color: "#6c757d" }}>
            Loading…
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
