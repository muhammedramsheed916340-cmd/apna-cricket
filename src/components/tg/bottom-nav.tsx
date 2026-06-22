"use client";

import { useRouter } from "next/navigation";
import { Home, Clock, Search, User } from "lucide-react";
import { useAuth } from "./auth-provider";

const ITEMS = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "mymatches", label: "My matches", icon: Clock, path: "/mymatches" },
  { id: "research", label: "Research", icon: Search, path: "/research" },
  { id: "user", label: "User", icon: User, path: "/profile" },
];

export function BottomNav({ active = "home" }: { active?: string }) {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="tg-footer">
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.id;
        const target = !user && it.id !== "home" ? `/login?redirect=${it.path}` : it.path;
        return (
          <div
            key={it.id}
            className={`sport-icon ${isActive ? "sport-icon-active" : ""}`}
            onClick={() => router.push(target)}
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
