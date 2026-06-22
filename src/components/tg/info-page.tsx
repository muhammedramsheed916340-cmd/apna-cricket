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
          <img className="tg-logo" alt="tg logo" src="/tg_dark_logo.png" />
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
          Developed By{" "}
          <a
            href="https://www.youtube.com/c/Believer01"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <span className="bel">Believer01</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#ff0000"
              aria-hidden="true"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>
        </div>
        <div style={{ color: "#6c757d", marginTop: 2 }}>
          Refer your friends for benefits
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
