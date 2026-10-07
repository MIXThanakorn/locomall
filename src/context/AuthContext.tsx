/* eslint-disable react-hooks/set-state-in-effect */
import { Session } from "@supabase/supabase-js";
import * as Location from "expo-location";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { forgetAccount, listSavedAccounts, rememberAccount, savedRefreshToken, type SavedAccount } from "../lib/accountVault";
import { createAccountSwitchClient, supabase } from "../lib/supabase";
import { disableCurrentPushDevice } from "../lib/pushNotifications";
import { mobilePhoneError } from "../lib/fieldValidation";

export type DeviceLocation = { latitude: number; longitude: number };
type AuthState = {
  session: Session | null;
  loading: boolean;
  hasLocation: boolean | null;
  hasPhone: boolean | null;
  isAdmin: boolean | null;
  deviceLocation: DeviceLocation | null;
  deviceLocationReady: boolean;
  refreshLocation: () => Promise<void>;
  refreshPhone: () => Promise<boolean>;
  refreshDeviceLocation: () => Promise<void>;
  signOut: () => Promise<void>;
  savedAccounts: SavedAccount[];
  refreshSavedAccounts: () => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
const LOCATION_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("location timeout")), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timeout); resolve(value); },
      (error) => { clearTimeout(timeout); reject(error); },
    );
  });
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [deviceLocationReady, setDeviceLocationReady] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const locationRequestId = useRef(0);
  const switchingAccount = useRef(false);
  const activeUserId = useRef<string | null>(null);

  const refreshSavedAccounts = useCallback(async () => {
    setSavedAccounts(await listSavedAccounts());
  }, []);

  const refreshLocation = async () => {
    const userId = session?.user.id;
    if (!userId) return setHasLocation(null);
    const { data } = await supabase.from("user_locations").select("user_id").eq("user_id", userId).maybeSingle();
    if (activeUserId.current === userId) setHasLocation(Boolean(data));
  };

  const refreshPhone = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) { setHasPhone(null); return false; }
    const { data, error } = await supabase.from("profiles").select("phone_num").eq("user_id", userId).maybeSingle();
    const valid = !error && mobilePhoneError(data?.phone_num ?? "") === null;
    if (activeUserId.current === userId) setHasPhone(valid);
    return valid;
  }, [session?.user.id]);

  const refreshAdminRole = async () => {
    const userId = session?.user.id;
    if (!userId) return setIsAdmin(null);
    const { data } = await supabase.from("platform_roles").select("role").eq("user_id", userId).maybeSingle();
    if (activeUserId.current === userId) setIsAdmin(data?.role === "platform_admin");
  };

  const refreshDeviceLocation = useCallback(async () => {
    const requestId = ++locationRequestId.current;
    setDeviceLocationReady(false);
    try {
      let permission = await withTimeout(Location.getForegroundPermissionsAsync(), LOCATION_TIMEOUT_MS);
      if (permission.status === "undetermined") {
        permission = await withTimeout(Location.requestForegroundPermissionsAsync(), LOCATION_TIMEOUT_MS);
      }
      if (permission.status !== "granted") {
        if (locationRequestId.current === requestId) setDeviceLocation(null);
        return;
      }
      const position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        LOCATION_TIMEOUT_MS,
      );
      if (locationRequestId.current === requestId) {
        setDeviceLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      }
    } catch {
      if (locationRequestId.current === requestId) setDeviceLocation(null);
    } finally {
      if (locationRequestId.current === requestId) setDeviceLocationReady(true);
    }
  }, []);

  const signOut = useCallback(async () => {
    const userId = session?.user.id;
    // Prevent a shared device from receiving the previous account's private updates.
    try { await disableCurrentPushDevice(); } catch { /* Sign-out must still continue offline. */ }
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    if (userId) {
      await forgetAccount(userId);
      await refreshSavedAccounts();
    }
    setSession(null);
    activeUserId.current = null;
    setHasLocation(null);
    setHasPhone(null);
    setIsAdmin(null);
    setDeviceLocation(null);
    locationRequestId.current += 1;
    setDeviceLocationReady(false);
  }, [session?.user.id, refreshSavedAccounts]);

  const switchAccount = useCallback(async (id: string) => {
    if (switchingAccount.current) return;
    switchingAccount.current = true;
    try {
      const { data: active } = await supabase.auth.getSession();
      const previous = active.session;
      if (previous?.user.id === id) return;
      if (previous) await rememberAccount(previous);
      const refreshToken = await savedRefreshToken(id);
      if (!refreshToken) throw new Error("ไม่พบเซสชันของบัญชีนี้ กรุณาเข้าสู่ระบบอีกครั้ง");

      // Refresh through an isolated client first; a failed saved login must not
      // clear the current account from the app.
      const candidate = await createAccountSwitchClient().auth.refreshSession({ refresh_token: refreshToken });
      if (candidate.error || !candidate.data.session) {
        throw new Error("เซสชันบัญชีนี้ใช้ไม่ได้แล้ว กรุณาเข้าสู่ระบบอีกครั้ง");
      }
      const next = candidate.data.session;
      if (next.user.id !== id) throw new Error("ข้อมูลบัญชีไม่ตรงกัน กรุณาเข้าสู่ระบบอีกครั้ง");
      // A refresh token can be used only once. Save the rotated one before
      // changing the active client so a failed handoff does not lose it.
      await rememberAccount(next);
      if (previous) {
        try { await disableCurrentPushDevice(); } catch { /* The new account will reclaim this device token. */ }
      }
      const result = await supabase.auth.setSession({
        access_token: next.access_token,
        refresh_token: next.refresh_token,
      });
      if (result.error || result.data.session?.user.id !== id) {
        if (previous) {
          await supabase.auth.setSession({ access_token: previous.access_token, refresh_token: previous.refresh_token });
        }
        throw new Error("สลับบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
      setSession(result.data.session);
      activeUserId.current = id;
      setHasLocation(null);
      setHasPhone(null);
      setIsAdmin(null);
      setDeviceLocation(null);
      locationRequestId.current += 1;
      setDeviceLocationReady(false);
      await refreshSavedAccounts();
    } finally {
      switchingAccount.current = false;
    }
  }, [refreshSavedAccounts]);

  useEffect(() => {
    void refreshSavedAccounts().catch(() => undefined);
    let receivedAuthEvent = false;
    supabase.auth.getSession().then(({ data }) => {
      if (receivedAuthEvent) return;
      activeUserId.current = data.session?.user.id ?? null;
      setSession(data.session); setLoading(false);
    }).catch(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      receivedAuthEvent = true;
      if (activeUserId.current !== (next?.user.id ?? null)) {
        setHasLocation(null);
        setHasPhone(null);
        setIsAdmin(null);
        setDeviceLocation(null);
        locationRequestId.current += 1;
        setDeviceLocationReady(false);
      }
      activeUserId.current = next?.user.id ?? null;
      setSession(next);
      setLoading(false);
      if (next) {
        // Do not await SecureStore work inside Supabase's auth callback.
        void rememberAccount(next).then(refreshSavedAccounts).catch(() => undefined);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refreshSavedAccounts]);
  useEffect(() => { void refreshLocation(); }, [session?.user.id]);
  useEffect(() => { void refreshPhone(); }, [refreshPhone]);
  useEffect(() => { void refreshAdminRole(); }, [session?.user.id]);
  useEffect(() => {
    if (!hasLocation || isAdmin) return;
    void refreshDeviceLocation();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshDeviceLocation();
    });
    return () => subscription.remove();
  }, [hasLocation, isAdmin, refreshDeviceLocation]);

  const value = useMemo(() => ({ session, loading, hasLocation, hasPhone, isAdmin, deviceLocation, deviceLocationReady, refreshLocation, refreshPhone, refreshDeviceLocation, signOut, savedAccounts, refreshSavedAccounts, switchAccount }), [session, loading, hasLocation, hasPhone, isAdmin, deviceLocation, deviceLocationReady, refreshPhone, refreshDeviceLocation, signOut, savedAccounts, refreshSavedAccounts, switchAccount]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
