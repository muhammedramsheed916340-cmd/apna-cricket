"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Home, User, Mail, LogOut, Settings, Bell, HelpCircle } from "lucide-react";
import { SideNav } from "@/components/tg/side-nav";
import { BottomNav } from "@/components/tg/bottom-nav";
import { useAuth } from "@/components/tg/auth-provider";

export default function ProfilePage() {
  const router = useRouter();
  const { user, authChecked, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Auto-login bypass: always authenticated. No login redirect.
  }, [authChecked, user, router]);

  const handleLogout = async () => {
    // Auto-login bypass: logout re-creates the session immediately.
    await logout();
    router.push("/");
  };

  if (!authChecked) {
    return (
      <div className="tg-app">
        <div style={{ padding: 40, textAlign: "center", color: "#6c757d" }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = (user.name || user.email || "U").charAt(0).toUpperCase();

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

      <main style={{ padding: "16px 12px 24px" }}>
        {/* Profile header */}
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: 18,
            marginBottom: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: user.picture ? "transparent" : "#563d7c",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              margin: "0 auto 10px",
              overflow: "hidden",
            }}
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#212529" }}>
            {user.name}
          </div>
          <div style={{ fontSize: 12, color: "#6c757d", marginTop: 2 }}>
            {user.email}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div
            style={{
              flex: 1,
              background: "#fff",
              borderRadius: 8,
              padding: 12,
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#563d7c" }}>0</div>
            <div style={{ fontSize: 10, color: "#6c757d" }}>Teams Generated</div>
          </div>
          <div
            style={{
              flex: 1,
              background: "#fff",
              borderRadius: 8,
              padding: 12,
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#28a745" }}>0</div>
            <div style={{ fontSize: 10, color: "#6c757d" }}>Saved Matches</div>
          </div>
        </div>

        {/* Menu items */}
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          {[
            { icon: Settings, label: "Settings", color: "#563d7c" },
            { icon: Bell, label: "Notifications", color: "#ffc107" },
            { icon: HelpCircle, label: "Help & Support", color: "#17a2b8" },
            { icon: Mail, label: "Contact Us", color: "#28a745", path: "/contactus" },
          ].map((item, i, arr) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => item.path && router.push(item.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  width: "100%",
                  background: "none",
                  border: "none",
                  borderBottom:
                    i < arr.length - 1 ? "1px solid #f0f0f0" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon size={18} color={item.color} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#212529" }}>
                  {item.label}
                </span>
                <span style={{ color: "#ccc", fontSize: 16 }}>›</span>
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "12px",
            border: "1px solid #dc3545",
            background: "#fff",
            color: "#dc3545",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <LogOut size={16} /> Logout
        </button>

        <div className="tg-credits" style={{ marginTop: 18 }}>
          <div>
            Developed By{" "}
            <a
              href="https://www.youtube.com/c/Believer01"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <span className="bel">Believer01</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff0000" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>
          <div style={{ color: "#6c757d", marginTop: 2 }}>
            Refer your friends for benefits
          </div>
        </div>
      </main>

      <BottomNav active="user" />
    </div>
  );
}
