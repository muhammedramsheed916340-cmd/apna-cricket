"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  HelpCircle,
  Info,
  ChevronRight,
  Phone,
  Youtube,
  Briefcase,
  Shield,
} from "lucide-react";

const MENU = [
  { label: "How to generate?", path: "/howtogenerate", icon: HelpCircle },
  { label: "Best tips", path: "/besttips", icon: Info },
  { label: "Fantasy Platforms", path: "/fantasy", icon: Shield },
  { label: "Privacy Policy", path: "/privacy-policy", icon: ChevronRight },
  { label: "Terms And Conditions", path: "/terms", icon: ChevronRight },
  { label: "Disclaimer", path: "/disclaimer", icon: ChevronRight },
  { label: "contact us", path: "/contactus", icon: Phone },
  {
    label: "follow us on youtube",
    href: "https://www.youtube.com/c/believer01",
    icon: Youtube,
  },
  { label: "about us", path: "/aboutus", icon: Briefcase },
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
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = (path: string) => {
    onClose();
    router.push(path);
  };

  const openExternal = (href: string) => {
    onClose();
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {open && <div className="tg-overlay" onClick={onClose} />}
      <aside className={`tg-sidenav ${open ? "open" : ""}`} aria-hidden={!open}>
        <span className="tg-closebtn" onClick={onClose} role="button">
          &times;
        </span>
        <div className="text-center" style={{ marginBottom: 16, marginTop: 8 }}>
          <img
            className="tg-logo"
            alt="logo"
            src="/tg_dark_logo.png"
            style={{ width: 200 }}
          />
        </div>
        <ul
          className="list-group"
          style={{ listStyle: "none", padding: 0, margin: 8 }}
        >
          {MENU.map((m) => {
            const Icon = m.icon;
            const content = (
              <>
                <Icon size={16} style={{ verticalAlign: "middle" }} />
                <span style={{ marginLeft: 6 }}>{m.label}</span>
              </>
            );
            return m.href ? (
              <li
                key={m.label}
                className="list-group-item"
                style={{
                  padding: "12px 8px",
                  fontSize: 16,
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
                onClick={() => openExternal(m.href!)}
              >
                {content}
              </li>
            ) : (
              <li
                key={m.label}
                className="list-group-item"
                style={{
                  padding: "12px 8px",
                  fontSize: 16,
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
                onClick={() => go(m.path!)}
              >
                {content}
              </li>
            );
          })}
        </ul>
        <div
          className="text-center"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: 8,
            marginTop: 16,
          }}
        >
          <small style={{ color: "#6c757d" }}>developed by</small>
          <a
            href="https://www.youtube.com/c/Believer01"
            target="_blank"
            rel="noopener noreferrer"
            style={{ paddingLeft: 0, marginTop: 4 }}
          >
            <img alt="logo" src="/owner.jpg" style={{ width: 150 }} />
          </a>
          <span style={{ fontSize: 12, color: "#6c757d", marginTop: 4 }}>
            All Rights Reserved
          </span>
          <span style={{ fontSize: 12, color: "#6c757d" }}>
            ©2021 Believer01
          </span>
          <span style={{ fontSize: 12, color: "#6c757d" }}>CEO Bobby</span>
        </div>
      </aside>
    </>
  );
}
