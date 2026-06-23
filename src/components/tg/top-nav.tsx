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
    <nav className="tg-topnav">
      {SPORTS.map((s) => {
        const Icon = ICONS[s.id] || Cricket;
        return (
          <div
            key={s.id}
            className={`sport-icon ${active === s.id ? "sport-icon-active" : ""}`}
            onClick={() => onChange(s.id)}
            role="button"
            tabIndex={0}
          >
            <Icon size={20} />
            <span>{s.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
