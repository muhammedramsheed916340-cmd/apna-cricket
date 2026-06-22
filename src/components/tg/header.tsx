"use client";

import { useRouter } from "next/navigation";
import { Menu, RefreshCw } from "lucide-react";

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
        <img className="tg-logo" alt="tg logo" src="/tg_dark_logo.png" />
      </span>
      <RefreshCw
        size={32}
        className="text-white"
        style={{ marginRight: 5, cursor: "pointer" }}
        onClick={() => router.refresh()}
        aria-label="Refresh"
      />
    </nav>
  );
}
