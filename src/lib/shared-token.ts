import { getAllSettings, setSetting } from "@/lib/license-store";

const SHARED_TOKEN_KEY = "shared_google_jwt";
const SHARED_TOKEN_EXPIRY_KEY = "shared_google_jwt_expiry";

export async function getSharedToken(): Promise<string | null> {
  const token = getSetting(SHARED_TOKEN_KEY);
  if (!token || token.length < 20) return null;
  const expiryStr = getSetting(SHARED_TOKEN_EXPIRY_KEY);
  if (expiryStr) {
    const expiry = new Date(expiryStr);
    if (new Date() > expiry) return null;
  }
  return token;
}

export async function setSharedToken(token: string, expiryDays = 30): Promise<void> {
  setSetting(SHARED_TOKEN_KEY, token);
  const expiry = new Date(Date.now() + expiryDays * 86400000).toISOString();
  setSetting(SHARED_TOKEN_EXPIRY_KEY, expiry);
}

export async function clearSharedToken(): Promise<void> {
  setSetting(SHARED_TOKEN_KEY, "");
  setSetting(SHARED_TOKEN_EXPIRY_KEY, "");
}

export async function resolveBearerToken(userToken?: string | null): Promise<string> {
  if (userToken && userToken.length > 20) return userToken;
  const shared = await getSharedToken();
  if (shared) return shared;
  return userToken || "";
}

export async function hasSharedToken(): Promise<boolean> {
  const token = await getSharedToken();
  return !!token;
}

function getSetting(key: string): string | null {
  return getAllSettings()[key] || null;
}
