"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  HelpCircle,
  Info,
  ChevronRight,
  Phone,
  Briefcase,
  Shield,
  X,
} from "lucide-react";

const MENU = [
  { label: "How to generate?", path: "/howtogenerate", icon: HelpCircle },
  { label: "Best tips", path: "/besttips", icon: Info },
  { label: "Fantasy Platforms", path: "/fantasy", icon: Shield },
  { label: "Privacy Policy", path: "/privacy-policy", icon: ChevronRight },
  { label: "Terms And Conditions", path: "/terms", icon: ChevronRight },
  { label: "Disclaimer", path: "/disclaimer", icon: ChevronRight },
  { label: "Contact us", path: "/contactus", icon: Phone },
  { label: "About us", path: "/aboutus", icon: Briefcase },
];

export function SideNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <>
      {open && <div className="ac-overlay" onClick={onClose} />}
      <aside
        className={`ac-sidenav ${open ? "open" : ""}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Menu"
      >
        <div className="ac-sidenav-head">
          <img
            className="ac-sidenav-logo"
            alt="Apna Cricket logo"
            src="/apna_cricket_logo.png"
          />
          <button
            type="button"
            className="ac-sidenav-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="ac-sidenav-list">
          {MENU.map((m) => {
            const Icon = m.icon;
            return (
              <li
                key={m.label}
                className="ac-sidenav-item"
                onClick={() => go(m.path!)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(m.path!);
                  }
                }}
              >
                <span className="ac-sidenav-icon">
                  <Icon size={16} />
                </span>
                <span>{m.label}</span>
              </li>
            );
          })}
        </ul>

        <div className="ac-sidenav-foot">
          <small>Powered by</small>
          <img alt="Apna Cricket logo" src="/apna_cricket_logo.png" />
          <small>© 2025 Apna Cricket · All Rights Reserved</small>
        </div>
      </aside>
    </>
  );
}
