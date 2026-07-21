"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface SubscriptionState {
  verified: boolean;
  plan: string | null;
  features: string[];
  loading: boolean;
  locked: boolean; // true = premium features locked
  verify: (key: string) => Promise<boolean>;
  hasFeature: (feature: string) => boolean;
  checkAndLock: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({
  verified: false,
  plan: null,
  features: [],
  loading: true,
  locked: false,
  verify: async () => false,
  hasFeature: () => false,
  checkAndLock: async () => {},
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

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [verified, setVerified] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ====== Server-side verification (authoritative) ======
  // Called on app start — never trusts localStorage alone
  const checkAndLock = async () => {
    try {
      const stored = localStorage.getItem("licenseKey");
      if (!stored) {
        setVerified(false);
        setPlan("free");
        setFeatures(["basic_teams", "limited_features"]);
        setLoading(false);
        return;
      }

      const deviceId = getDeviceId();
      const res = await fetch("/api/subscription/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: stored, deviceFp: deviceId }),
      });
      const data = await res.json();

      if (data.valid) {
        setVerified(true);
        setPlan(data.plan);
        setFeatures(data.features || []);
        localStorage.setItem("subscriptionVerified", "true");
      } else {
        // Server said invalid — lock premium features immediately
        setVerified(false);
        setPlan("free");
        setFeatures(["basic_teams", "limited_features"]);
        localStorage.removeItem("subscriptionVerified");
      }
    } catch {
      // Network error — keep existing state but don't unlock
      const locallyVerified = localStorage.getItem("subscriptionVerified") === "true";
      if (!locallyVerified) {
        setVerified(false);
        setPlan("free");
        setFeatures(["basic_teams", "limited_features"]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      checkAndLock();
    }
  }, [mounted]);

  const verify = async (key: string): Promise<boolean> => {
    const deviceId = getDeviceId();
    try {
      // Call subscription verify API (checks Neon + local store)
      const res = await fetch("/api/subscription/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, deviceFp: deviceId }),
      });
      const data = await res.json();

      if (data.valid) {
        // Verification succeeded — update client state
        setVerified(true);
        setPlan(data.plan);
        setFeatures(data.features || []);
        localStorage.setItem("subscriptionVerified", "true");
        localStorage.setItem("licenseKey", key.toUpperCase().trim());
        return true;
      }

      console.error("[Subscription] Verification failed:", data.message);
      return false;
    } catch {
      console.error("[Subscription] verify error");
      return false;
    }
  };

  const hasFeature = (feature: string): boolean => {
    return features.includes(feature);
  };

  const locked = !verified; // premium features locked if not verified

  // During SSR, don't lock (avoid hydration mismatch)
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <SubscriptionContext.Provider
      value={{ verified, plan, features, loading, locked, verify, hasFeature, checkAndLock }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
