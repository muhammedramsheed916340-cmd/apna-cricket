import { getAllSettings } from "@/lib/license-store";

export const MASTER_ADMIN_PASSWORD = "8950888988";

export async function verifyAdminPassword(supplied?: string): Promise<boolean> {
  if (!supplied) return false;
  const settings = getAllSettings();
  const expected = settings["admin_password"] || MASTER_ADMIN_PASSWORD;
  return supplied === expected;
}
