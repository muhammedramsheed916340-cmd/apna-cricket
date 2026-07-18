"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface LicenseState {
  verified: boolean;
  licenseKey: string | null;
  plan: string | null;
  loading: boolean;
  verify: (key: string) => Promise<{ success: boolean; message: string }>;
  checkExisting: () => Promise<void>;
}

const LicenseContext = createContext<LicenseState>({
  verified: false,
  licenseKey: null,
  plan: null,
  loading: true,
  verify: async () => ({ success: false, message: "" }),
  checkExisting: async () => {},
});

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("deviceId", id);
  }
  return id;
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [verified, setVerified] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkExisting = async () => {
    try {
      const stored = localStorage.getItem("licenseKey");
      const locallyVerified = localStorage.getItem("licenseVerified") === "true";

      if (!stored) { setLoading(false); return; }

      // If already verified locally, KEEP verified — NEVER auto-logout on reload
      if (locallyVerified) {
        setVerified(true);
        setLicenseKey(stored);
        setLoading(false);

        // Background server check (non-blocking, won't logout on failure)
        const deviceId = getDeviceId();
        fetch("/api/license/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: stored, deviceFp: deviceId }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.status === "success") {
              setPlan(data.plan);
            } else {
              const msg = (data.message || "").toLowerCase();
              const isHardFail = msg.includes("invalid") || msg.includes("expired") || msg.includes("suspended");
              if (isHardFail) {
                localStorage.removeItem("licenseVerified");
                setVerified(false);
              }
            }
          })
          .catch(() => {});
        return;
      }

      // First-time verify (not yet verified locally)
      const deviceId = getDeviceId();
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: stored, deviceFp: deviceId }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setVerified(true);
        setLicenseKey(stored);
        setPlan(data.plan);
        localStorage.setItem("licenseVerified", "true");
      } else {
        setVerified(false);
      }
    } catch {
      if (localStorage.getItem("licenseVerified") === "true") {
        setVerified(true);
        setLicenseKey(localStorage.getItem("licenseKey"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    checkExisting();
  }, []);

  const verify = async (key: string): Promise<{ success: boolean; message: string }> => {
    const deviceId = getDeviceId();
    try {
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, deviceFp: deviceId }),
      });
      const data = await res.json();
      if (data.status === "success") {
        localStorage.setItem("licenseVerified", "true");
        localStorage.setItem("licenseKey", key.toUpperCase().trim());
        setVerified(true);
        setLicenseKey(key.toUpperCase().trim());
        setPlan(data.plan);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || "❌ Invalid RMSMT License Key" };
    } catch {
      return { success: false, message: "Network error. Try again." };
    }
  };

  // During SSR, render children directly (no loading state, no gate)
  // License check only runs on client after mount
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LicenseContext.Provider value={{ verified, licenseKey, plan, loading, verify, checkExisting }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  return useContext(LicenseContext);
}
