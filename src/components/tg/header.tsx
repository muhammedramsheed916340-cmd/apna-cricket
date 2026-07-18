"use client";

import { useRouter } from "next/navigation";
import { Menu, RefreshCw } from "lucide-react";
import { AdminTrigger } from "@/components/admin/AdminTrigger";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  return (
    <header className="ac-header">
      <button
        type="button"
        className="ac-icon-btn"
        onClick={onMenuClick}
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
        onClick={() => window.location.reload()}
        aria-label="Refresh"
      >
        <RefreshCw size={18} />
      </button>
    </header>
  );
}
