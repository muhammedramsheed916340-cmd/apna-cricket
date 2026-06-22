"use client";

import { useRouter } from "next/navigation";
import { Home, Clock, Search, User } from "lucide-react";

const ITEMS = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "mymatches", label: "My matches", icon: Clock, path: "/login" },
  { id: "research", label: "Research", icon: Search, path: "/login" },
  { id: "user", label: "User", icon: User, path: "/login" },
];

export function BottomNav({ active = "home" }: { active?: string }) {
  const router = useRouter();
  return (
    <div className="tg-footer">
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.id;
        return (
          <div
            key={it.id}
            className={`sport-icon ${isActive ? "sport-icon-active" : ""}`}
            onClick={() => router.push(it.path)}
            role="button"
            tabIndex={0}
          >
            <Icon size={20} />
            <span>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}
