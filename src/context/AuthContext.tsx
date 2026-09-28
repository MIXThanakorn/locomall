/* eslint-disable react-hooks/set-state-in-effect */
import { Session } from "@supabase/supabase-js";
import * as Location from "expo-location";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { disableCurrentPushDevice } from "../lib/pushNotifications";

export type DeviceLocation = { latitude: number; longitude: number };
type AuthState = {
  session: Session | null;
  loading: boolean;
  hasLocation: boolean | null;
  isAdmin: boolean | null;
  deviceLocation: DeviceLocation | null;
  deviceLocationReady: boolean;
  refreshLocation: () => Promise<void>;
  refreshDeviceLocation: () => Promise<void>;
  signOut: () => Promise<void>;
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [deviceLocationReady, setDeviceLocationReady] = useState(false);
  const locationRequestId = useRef(0);

  const refreshLocation = async () => {
    if (!session?.user.id) return setHasLocation(null);
    const { data } = await supabase.from("user_locations").select("user_id").eq("user_id", session.user.id).maybeSingle();
    setHasLocation(Boolean(data));
  };

  const refreshAdminRole = async () => {
    if (!session?.user.id) return setIsAdmin(null);
    const { data } = await supabase.from("platform_roles").select("role").eq("user_id", session.user.id).maybeSingle();
    setIsAdmin(data?.role === "platform_admin");
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
    // Prevent a shared device from receiving the previous account's private updates.
    try { await disableCurrentPushDevice(); } catch { /* Sign-out must still continue offline. */ }
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    setSession(null);
    setHasLocation(null);
    setIsAdmin(null);
    setDeviceLocation(null);
    locationRequestId.current += 1;
    setDeviceLocationReady(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { void refreshLocation(); }, [session?.user.id]);
  useEffect(() => { void refreshAdminRole(); }, [session?.user.id]);
  useEffect(() => {
    if (!hasLocation || isAdmin) return;
    void refreshDeviceLocation();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshDeviceLocation();
    });
    return () => subscription.remove();
  }, [hasLocation, isAdmin, refreshDeviceLocation]);

  const value = useMemo(() => ({ session, loading, hasLocation, isAdmin, deviceLocation, deviceLocationReady, refreshLocation, refreshDeviceLocation, signOut }), [session, loading, hasLocation, isAdmin, deviceLocation, deviceLocationReady, refreshDeviceLocation, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
