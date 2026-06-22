"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Home, Search, Video, FileText, TrendingUp } from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";
import { useAuth } from "@/components/tg/auth-provider";

const RESEARCH_ITEMS = [
  {
    id: "expert-prediction",
    title: "Expert Prediction",
    desc: "Get expert analysis and predictions for upcoming matches",
    icon: TrendingUp,
    color: "#563d7c",
  },
  {
    id: "expert-teams",
    title: "Expert Teams",
    desc: "Pre-built expert teams for Grand League and Small League",
    icon: FileText,
    color: "#28a745",
  },
  {
    id: "expert-video",
    title: "Expert Video",
    desc: "Watch expert video analysis and team breakdowns",
    icon: Video,
    color: "#dc3545",
  },
];

export default function ResearchPage() {
  const router = useRouter();
  const { user, authChecked } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (authChecked && !user) {
      router.replace("/login?redirect=/research");
    }
  }, [authChecked, user, router]);

  if (authChecked && !user) {
    return (
      <div className="tg-app">
        <div style={{ padding: 40, textAlign: "center", color: "#6c757d" }}>
          Redirecting to login…
        </div>
      </div>
    );
  }

  return (
    <div className="tg-app">
      <SideNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <nav className="tg-header" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Menu
          size={32}
          className="text-white"
          style={{ marginLeft: 5, cursor: "pointer" }}
          onClick={() => setMenuOpen(true)}
        />
        <span className="navbar-brand mb-0 text-center">
          <img className="tg-logo" alt="tg logo" src="/tg_dark_logo.png" />
        </span>
        <Home
          size={28}
          className="text-white"
          style={{ marginRight: 8, cursor: "pointer" }}
          onClick={() => router.push("/")}
        />
      </nav>

      <main style={{ padding: "12px 10px 24px" }}>
        <h4
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#212529",
            margin: "8px 0 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Search size={18} /> Research
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {RESEARCH_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: 14,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: item.color + "20",
                    color: item.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#212529" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#6c757d", marginTop: 2 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Quick Tips
          </div>
          <ul
            style={{
              fontSize: 12,
              color: "#6c757d",
              paddingLeft: 18,
              lineHeight: 1.7,
            }}
          >
            <li>Check player form and recent performances</li>
            <li>Monitor pitch reports and toss results</li>
            <li>Track playing11 announcements before deadline</li>
            <li>Use Advanced Generation for best Grand League teams</li>
            <li>Select differential captains for higher rank potential</li>
          </ul>
        </div>
      </main>

      <BottomNav active="research" />
    </div>
  );
}
