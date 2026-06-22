"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface TGUser {
  name: string;
  email: string;
  picture: string;
  loggedInAt: number;
}

interface AuthState {
  user: TGUser | null;
  authChecked: boolean;
  login: (user: TGUser) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  authChecked: false,
  login: () => {},
  logout: async () => {},
  refresh: async () => {},
});

// Auto-login user (bypass Google OAuth — not required for transfers)
const AUTO_USER: TGUser = {
  name: "Team Generation User",
  email: "user@gmail.com",
  picture: "",
  loggedInAt: 0,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TGUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json();
      if (data?.user) {
        setUser(data.user);
      } else {
        // Auto-login bypass — create session automatically
        try {
          await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(AUTO_USER),
          });
        } catch {}
        setUser(AUTO_USER);
      }
    } catch {
      setUser(AUTO_USER);
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = (u: TGUser) => {
    setUser(u);
    setAuthChecked(true);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    // Re-login immediately (bypass)
    setUser(AUTO_USER);
  };

  return (
    <AuthContext.Provider value={{ user, authChecked, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
