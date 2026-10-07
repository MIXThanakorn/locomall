import type { Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type SavedAccount = { id: string; email: string };

const INDEX_KEY = "locomall.savedAccounts.v1";
const TOKEN_KEY_PREFIX = "locomall.savedAccount.";
const MAX_SAVED_ACCOUNTS = 5;
let pendingWrite: Promise<unknown> = Promise.resolve();

function supported() {
  // Never put inactive refresh tokens in browser localStorage.
  return Platform.OS === "android" || Platform.OS === "ios";
}

function tokenKey(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("invalid account id");
  return `${TOKEN_KEY_PREFIX}${id}`;
}

function queueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = pendingWrite.then(operation, operation);
  pendingWrite = next.catch(() => undefined);
  return next;
}

async function readIndex(): Promise<SavedAccount[]> {
  if (!supported()) return [];
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedAccount =>
      !!item && typeof item === "object" &&
      typeof item.id === "string" && /^[a-f0-9-]{36}$/i.test(item.id) &&
      typeof item.email === "string",
    ).slice(0, MAX_SAVED_ACCOUNTS);
  } catch {
    return [];
  }
}

export async function listSavedAccounts(): Promise<SavedAccount[]> {
  await pendingWrite;
  return readIndex();
}

export async function rememberAccount(session: Session): Promise<void> {
  if (!supported() || !session.refresh_token) return;
  await queueWrite(async () => {
    const id = session.user.id;
    const email = session.user.email ?? "บัญชีไม่มีอีเมล";
    const key = tokenKey(id);
    // Store only the small refresh token, not the full (potentially >2 KB) session.
    await SecureStore.setItemAsync(key, session.refresh_token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    const previous = await readIndex();
    const updated = [{ id, email }, ...previous.filter((account) => account.id !== id)];
    const removed = updated.slice(MAX_SAVED_ACCOUNTS);
    await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(updated.slice(0, MAX_SAVED_ACCOUNTS)), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    for (const account of removed) await SecureStore.deleteItemAsync(tokenKey(account.id));
  });
}

export async function savedRefreshToken(id: string): Promise<string | null> {
  if (!supported()) return null;
  await pendingWrite;
  return SecureStore.getItemAsync(tokenKey(id));
}

export async function forgetAccount(id: string): Promise<void> {
  if (!supported()) return;
  await queueWrite(async () => {
    const updated = (await readIndex()).filter((account) => account.id !== id);
    await SecureStore.deleteItemAsync(tokenKey(id));
    await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(updated), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  });
}
