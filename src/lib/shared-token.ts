import { db } from "@/lib/db";

const SHARED_TOKEN_KEY = "shared_google_jwt";
const SHARED_TOKEN_EXPIRY_KEY = "shared_google_jwt_expiry";

/**
 * Get the shared Google JWT from the database.
 * This token is sent as `Authorization: Bearer <jwt>` to the tgsoftware-api.online
 * backend, which requires it for team transfer (add-team/edit-team) endpoints.
 */
export async function getSharedToken(): Promise<string | null> {
  try {
    const settings = await db.appSetting.findMany();
    const token = settings.find((s) => s.key === SHARED_TOKEN_KEY)?.value;
    if (!token || token.length < 20) return null;

    const expiryStr = settings.find((s) => s.key === SHARED_TOKEN_EXPIRY_KEY)?.value;
    if (expiryStr) {
      const expiry = new Date(expiryStr);
      if (new Date() > expiry) {
        console.log("[SharedToken] Shared token has expired");
        return null;
      }
    }
    return token;
  } catch (error) {
    console.error("[SharedToken] Failed to get shared token:", error);
    return null;
  }
}

export async function setSharedToken(token: string, expiryDays = 30): Promise<void> {
  const existing = await db.appSetting.findFirst({ where: { key: SHARED_TOKEN_KEY } });
  if (existing) {
    await db.appSetting.update({ where: { id: existing.id }, data: { value: token } });
  } else {
    await db.appSetting.create({ data: { key: SHARED_TOKEN_KEY, value: token } });
  }

  const expiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
  const existingExpiry = await db.appSetting.findFirst({ where: { key: SHARED_TOKEN_EXPIRY_KEY } });
  if (existingExpiry) {
    await db.appSetting.update({ where: { id: existingExpiry.id }, data: { value: expiry } });
  } else {
    await db.appSetting.create({ data: { key: SHARED_TOKEN_EXPIRY_KEY, value: expiry } });
  }
  console.log(`[SharedToken] Shared token set, expires in ${expiryDays} days`);
}

export async function clearSharedToken(): Promise<void> {
  const existing = await db.appSetting.findFirst({ where: { key: SHARED_TOKEN_KEY } });
  if (existing) await db.appSetting.update({ where: { id: existing.id }, data: { value: "" } });
  const existingExpiry = await db.appSetting.findFirst({ where: { key: SHARED_TOKEN_EXPIRY_KEY } });
  if (existingExpiry) await db.appSetting.update({ where: { id: existingExpiry.id }, data: { value: "" } });
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
