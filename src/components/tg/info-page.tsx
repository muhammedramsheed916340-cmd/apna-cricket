"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, RefreshCw, Home } from "lucide-react";
import { SideNav } from "./side-nav";
import { BottomNav } from "./bottom-nav";

export function InfoPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
          <img className="tg-logo" alt="Apna Cricket logo" src="/apna_cricket_logo.png" />
        </span>
        <Home
          size={28}
          className="text-white"
          style={{ marginRight: 8, cursor: "pointer" }}
          onClick={() => router.push("/")}
        />
      </nav>

      <main style={{ padding: "12px 10px 24px" }}>
        <div className="info-card">
          <h3>{title}</h3>
          <hr style={{ border: 0, borderTop: "1px solid #eee", margin: "8px 0 14px" }} />
          {children}
        </div>
      </main>

      <div className="tg-credits">
        <div>
          Powered by{" "}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <span className="bel">Apna Cricket</span>
          </a>
        </div>
        <div style={{ color: "#6c757d", marginTop: 2 }}>
          ©2025 Apna Cricket — All Rights Reserved
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
