"use client";

import { useRouter } from "next/navigation";
import { Menu, RefreshCw } from "lucide-react";
import { AdminTrigger } from "@/components/admin/AdminTrigger";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  return (
    <nav
      className="tg-header"
      style={{ justifyContent: "space-between", alignItems: "center" }}
    >
      <Menu
        size={32}
        className="text-white"
        style={{ marginLeft: 5, cursor: "pointer" }}
        onClick={onMenuClick}
        aria-label="Open menu"
      />
      <span className="navbar-brand mb-0 text-center">
        <AdminTrigger>
          <img className="tg-logo" alt="Apna Cricket logo" src="/apna_cricket_logo.png" />
        </AdminTrigger>
      </span>
      <RefreshCw
        size={32}
        className="text-white"
        style={{ marginRight: 5, cursor: "pointer" }}
        onClick={() => window.location.reload()}
        aria-label="Refresh"
      />
    </nav>
  );
}
