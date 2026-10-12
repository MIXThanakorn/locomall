import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { catalogPreferenceKey, parseSameAreaPreference } from "../lib/catalogPreferences";
import { useAuth } from "./AuthContext";

type Preference = { userId?: string; sameArea: boolean; error: boolean };
type CatalogPreferences = { sameArea: boolean; ready: boolean; saving: boolean; error: boolean; setSameArea: (value: boolean) => Promise<boolean> };
const Context = createContext<CatalogPreferences | null>(null);

export function CatalogPreferencesProvider({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const userId = session?.user.id;
  const [result, setResult] = useState<Preference | null>(null);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const pending = useRef(new Set<string>());
  useEffect(() => {
    let active = true;
    if (!userId) {
      return () => { active = false; };
    }
    AsyncStorage.getItem(catalogPreferenceKey(userId)).then((value) => {
      if (active) setResult({ userId, sameArea: parseSameAreaPreference(value), error: false });
    }).catch(() => {
      if (active) setResult({ userId, sameArea: false, error: true });
    });
    return () => { active = false; };
  }, [userId]);
  const ready = !loading && (!userId || result?.userId === userId);
  const sameArea = ready && userId && result?.userId === userId ? result.sameArea : false;
  const setSameArea = useCallback(async (value: boolean) => {
    if (!userId || !ready || pending.current.has(userId)) return false;
    pending.current.add(userId);
    setSavingFor(userId);
    try {
      await AsyncStorage.setItem(catalogPreferenceKey(userId), String(value));
      setResult((current) => current?.userId === userId ? { userId, sameArea: value, error: false } : current);
      return true;
    } catch {
      setResult((current) => current?.userId === userId ? { ...current, error: true } : current);
      return false;
    } finally {
      pending.current.delete(userId);
      setSavingFor((current) => current === userId ? null : current);
    }
  }, [userId, ready]);
  return <Context.Provider value={{ sameArea, ready, saving: Boolean(userId && savingFor === userId), error: Boolean(ready && userId && result?.error), setSameArea }}>{children}</Context.Provider>;
}

export function useCatalogPreferences() {
  const context = useContext(Context);
  if (!context) throw new Error("CatalogPreferencesProvider is required");
  return context;
}
