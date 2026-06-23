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

  const checkExisting = async () => {
    try {
      const stored = localStorage.getItem("licenseKey");
      if (!stored) { setLoading(false); return; }

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
        localStorage.removeItem("licenseVerified");
        setVerified(false);
      }
    } catch {
      // Offline — check local only
      if (localStorage.getItem("licenseVerified") === "true") {
        setVerified(true);
        setLicenseKey(localStorage.getItem("licenseKey"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  return (
    <LicenseContext.Provider value={{ verified, licenseKey, plan, loading, verify, checkExisting }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  return useContext(LicenseContext);
}
