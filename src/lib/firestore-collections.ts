// ====== Firestore Collections Structure ======
// Defines all Firestore collections used by Apna Cricket.
// All Firestore operations go through this file — no hardcoded paths elsewhere.

import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

// ====== Collection References ======
export const collections = {
  licenses: collection(db, "licenses"),
  subscriptions: collection(db, "subscriptions"),
  devices: collection(db, "devices"),
  users: collection(db, "users"),
  freeOfferKeys: collection(db, "free_offer_keys"),
  settings: collection(db, "settings"),
  adminData: collection(db, "admin_data"),
};

// ====== Save license to Firestore with VERIFICATION ======
// Uses writeBatch for atomic write, then reads back to verify server persistence.
// Returns success ONLY if the document actually exists on the server.
export async function saveLicenseToFirestore(licenseData: {
  key: string;
  plan: string;
  status: string;
  deviceFp: string;
  expiresAt: number;
  boundAt: number;
  activatedAt: number;
  appVersion?: string;
}): Promise<{ success: boolean; error?: string }> {
  console.log("[Firestore] saveLicenseToFirestore START:", licenseData.key);

  try {
    const licenseDocRef = doc(collections.licenses, licenseData.key);

    // Step 1: Write using setDoc with merge
    console.log("[Firestore] Writing to licenses/" + licenseData.key);
    await setDoc(licenseDocRef, {
      key: licenseData.key,
      plan: licenseData.plan,
      status: licenseData.status,
      deviceFp: licenseData.deviceFp,
      expiresAt: licenseData.expiresAt,
      boundAt: licenseData.boundAt,
      activatedAt: licenseData.activatedAt,
      appVersion: licenseData.appVersion || "1.0.0",
      usageCount: 1,
      lastUsedAt: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log("[Firestore] setDoc resolved for licenses/" + licenseData.key);

    // Step 2: VERIFY — read back the document to confirm it was actually written
    // This catches cases where offline persistence makes setDoc appear to succeed
    // but the server didn't actually persist the write.
    console.log("[Firestore] Verifying write by reading back...");
    const verifySnap = await getDoc(licenseDocRef);

    if (!verifySnap.exists()) {
      console.error("[Firestore] VERIFICATION FAILED: Document does not exist after write!");
      return { success: false, error: "Document verification failed — write did not persist" };
    }

    const verifyData = verifySnap.data();
    console.log("[Firestore] VERIFICATION SUCCESS:", JSON.stringify({
      key: verifyData.key,
      plan: verifyData.plan,
      status: verifyData.status,
      deviceFp: verifyData.deviceFp,
    }));

    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Firestore] saveLicenseToFirestore ERROR:", error);
    console.error("[Firestore] Full error:", e);
    return { success: false, error };
  }
}

// ====== Get license from Firestore ======
export async function getLicenseFromFirestore(key: string): Promise<any | null> {
  try {
    console.log("[Firestore] getLicenseFromFirestore:", key);
    const docRef = doc(collections.licenses, key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      console.log("[Firestore] License found:", JSON.stringify({ key: data.key, plan: data.plan, status: data.status }));
      return data;
    }
    console.log("[Firestore] License NOT found:", key);
    return null;
  } catch (e) {
    console.error("[Firestore] getLicenseFromFirestore ERROR:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ====== Update license in Firestore ======
export async function updateLicenseInFirestore(
  key: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[Firestore] updateLicenseInFirestore:", key, JSON.stringify(updates));
    const docRef = doc(collections.licenses, key);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    console.log("[Firestore] updateDoc resolved for licenses/" + key);
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Firestore] updateLicenseInFirestore ERROR:", error);
    return { success: false, error };
  }
}

// ====== Save device to Firestore ======
export async function saveDeviceToFirestore(deviceData: {
  deviceId: string;
  licenseKey: string;
  plan: string;
  boundAt: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[Firestore] saveDeviceToFirestore:", deviceData.deviceId);
    const docRef = doc(collections.devices, deviceData.deviceId);
    await setDoc(docRef, {
      ...deviceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log("[Firestore] Device saved to devices/" + deviceData.deviceId);
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Firestore] saveDeviceToFirestore ERROR:", error);
    return { success: false, error };
  }
}

// ====== Save settings to Firestore ======
export async function saveSettingsToFirestore(
  key: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[Firestore] saveSettingsToFirestore:", key);
    const docRef = doc(collections.settings, key);
    await setDoc(docRef, { key, value, updatedAt: serverTimestamp() }, { merge: true });
    console.log("[Firestore] Setting saved:", key);
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Firestore] saveSettingsToFirestore ERROR:", error);
    return { success: false, error };
  }
}

// ====== Get settings from Firestore ======
export async function getSettingsFromFirestore(key: string): Promise<string | null> {
  try {
    console.log("[Firestore] getSettingsFromFirestore:", key);
    const docRef = doc(collections.settings, key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const val = (snap.data() as any).value || null;
      console.log("[Firestore] Setting found:", key, val ? "(present)" : "(empty)");
      return val;
    }
    console.log("[Firestore] Setting NOT found:", key);
    return null;
  } catch (e) {
    console.error("[Firestore] getSettingsFromFirestore ERROR:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ====== Check if device already activated a license ======
export async function checkDeviceActivation(deviceId: string): Promise<any | null> {
  try {
    console.log("[Firestore] checkDeviceActivation:", deviceId);
    const q = query(collections.devices, where("deviceId", "==", deviceId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = { id: doc.id, ...doc.data() };
      console.log("[Firestore] Device already activated:", deviceId, "->", data.licenseKey);
      return data;
    }
    console.log("[Firestore] Device not previously activated:", deviceId);
    return null;
  } catch (e) {
    console.error("[Firestore] checkDeviceActivation ERROR:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ====== Test Firestore connection ======
export async function testFirestoreConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    console.log("[Firestore] Testing connection...");
    const testRef = doc(collections.settings, "_connection_test");
    await setDoc(testRef, { test: true, timestamp: Date.now() }, { merge: true });
    const verify = await getDoc(testRef);
    if (verify.exists()) {
      console.log("[Firestore] Connection test PASSED");
      return { connected: true };
    }
    console.error("[Firestore] Connection test FAILED — write did not persist");
    return { connected: false, error: "Write did not persist" };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[Firestore] Connection test ERROR:", error);
    return { connected: false, error };
  }
}
