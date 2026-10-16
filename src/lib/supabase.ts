import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { createSecureSessionStorage } from "./secureSessionStorage";
import type { Database } from "../types/database";
import { apiFetch } from "./apiFetch";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const serverSafeStorage = Platform.OS !== "web" ? createSecureSessionStorage({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
}, AsyncStorage, Crypto.randomUUID) : typeof window === "undefined"
  ? { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined }
  : AsyncStorage;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: apiFetch },
  auth: {
    storage: serverSafeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

export async function requireRecoveryVerifier() {
  const key = `sb-${new URL(supabaseUrl!).hostname.split(".")[0]}-auth-token-code-verifier`;
  const raw = await serverSafeStorage.getItem(key);
  let verifier: unknown;
  try { verifier = raw ? JSON.parse(raw) : null; } catch { verifier = null; }
  if (typeof verifier !== "string" || !verifier.endsWith("/recovery")) throw new Error("กรุณาขอลิงก์กู้รหัสผ่านใหม่บนเครื่องนี้");
}

// Validate an inactive account's refresh token without replacing the active
// account unless refresh succeeds. This client never persists its session.
export function createAccountSwitchClient() {
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    global: { fetch: apiFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
