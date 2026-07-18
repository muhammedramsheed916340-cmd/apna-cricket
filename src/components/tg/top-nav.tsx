"use client";

import { SPORTS } from "@/lib/matches";
import { Cricket, Volleyball, Dribbble, Users } from "./sport-icons";

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  cricket: Cricket,
  football: Volleyball,
  basketball: Dribbble,
  kabaddi: Users,
};

export function TopNav({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav className="ac-sportnav">
      {SPORTS.map((s) => {
        const Icon = ICONS[s.id] || Cricket;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            className={`ac-sport-pill ${isActive ? "ac-sport-pill-active" : ""}`}
            onClick={() => onChange(s.id)}
          >
            <Icon size={14} />
            <span>{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
