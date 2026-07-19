"use client";

import { useRouter } from "next/navigation";
import { Home, Clock, Gift, Search, User } from "lucide-react";

const ITEMS = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "contests", label: "Contests", icon: Gift, path: "/contests" },
  { id: "mymatches", label: "My matches", icon: Clock, path: "/mymatches" },
  { id: "research", label: "Research", icon: Search, path: "/research" },
  { id: "user", label: "Profile", icon: User, path: "/profile" },
];

export function BottomNav({ active = "home" }: { active?: string }) {
  const router = useRouter();

  return (
    <nav className="ac-bottomnav" aria-label="Primary">
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            type="button"
            className={`ac-nav-item ${isActive ? "ac-nav-item-active" : ""}`}
            onClick={() => router.push(it.path)}
            aria-label={it.label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
