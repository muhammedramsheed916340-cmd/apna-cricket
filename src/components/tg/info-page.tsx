"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Home } from "lucide-react";
import { SideNav } from "./side-nav";
import { BottomNav } from "./bottom-nav";
import { AdminTrigger } from "@/components/admin/AdminTrigger";

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

      <main style={{ padding: "16px 14px 8px", flex: 1 }}>
        <div className="ac-info">
          <h3>{title}</h3>
          <hr
            style={{
              border: 0,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              margin: "8px 0 14px",
            }}
          />
          {children}
        </div>

        <div className="ac-credits">
          <div>
            © 2025 <b>Apna Cricket</b> · All Rights Reserved
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
