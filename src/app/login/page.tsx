"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Home, Loader2 } from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";

export default function LoginPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Auto-login bypass: create session and redirect immediately.
    // Google OAuth is NOT required for transfers — OTP authToken is enough.
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
    <div className="tg-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <nav className="tg-header" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Menu size={32} className="text-white" style={{ marginLeft: 5, cursor: "pointer" }} onClick={() => setMenuOpen(true)} />
        <span className="navbar-brand mb-0 text-center">
          <img className="tg-logo" alt="Apna Cricket logo" src="/apna_cricket_logo.png" />
        </span>
        <Home size={28} className="text-white" style={{ marginRight: 8, cursor: "pointer" }} onClick={() => router.push("/")} />
      </nav>

      <main style={{ padding: "40px 16px", textAlign: "center", color: "#6c757d" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "#0066ff", marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: "#212529" }}>Signing you in…</div>
      </main>

      <BottomNav />
    </div>
  );
}
