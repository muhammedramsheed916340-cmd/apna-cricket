import { cookies } from "next/headers";

export interface TGUser {
  name: string;
  email: string;
  picture: string;
  loggedInAt: number;
}

const SESSION_COOKIE = "tg_session";
const ONE_WEEK = 60 * 60 * 24 * 7;

export async function getSession(): Promise<TGUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as TGUser;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSession(user: TGUser): Promise<void> {
  const store = await cookies();
  const payload = Buffer.from(JSON.stringify(user), "utf-8").toString("base64");
  store.set(SESSION_COOKIE, payload, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function parseBearer(token: string): TGUser | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as TGUser;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}
