import { ADMIN_PASSWORD } from "./helpers";
import { cookies } from "next/headers";

// ====== Admin authentication helper ======
// Used by all admin GET routes to prevent public data leakage.
// Supports two auth methods:
// 1. adminPassword in Authorization header (Bearer <password>)
// 2. adminPassword in query param ?adminPassword=xxx
// 3. admin_session cookie (set when admin logs in via dashboard)

interface AuthResult {
  ok: boolean;
  error?: string;
}

export async function requireAdmin(req: Request): Promise<AuthResult> {
  // Method 1: Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token === ADMIN_PASSWORD) {
      return { ok: true };
    }
  }

  // Method 2: Query param
  const url = new URL(req.url);
  const queryPass = url.searchParams.get("adminPassword");
  if (queryPass && queryPass === ADMIN_PASSWORD) {
    return { ok: true };
  }

  // Method 3: admin_session cookie
  const store = await cookies();
  const session = store.get("admin_session")?.value;
  if (session && session === ADMIN_PASSWORD) {
    return { ok: true };
  }

  return { ok: false, error: "Admin authentication required" };
}
