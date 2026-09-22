/* eslint-disable react-hooks/set-state-in-effect */
import { Session } from "@supabase/supabase-js";
import * as Location from "expo-location";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";

export type DeviceLocation = { latitude: number; longitude: number };
type AuthState = {
  session: Session | null;
  loading: boolean;
  hasLocation: boolean | null;
  deviceLocation: DeviceLocation | null;
  deviceLocationReady: boolean;
  refreshLocation: () => Promise<void>;
  refreshDeviceLocation: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [deviceLocationReady, setDeviceLocationReady] = useState(false);

  const refreshLocation = async () => {
    if (!session?.user.id) return setHasLocation(null);
    const { data } = await supabase.from("user_locations").select("user_id").eq("user_id", session.user.id).maybeSingle();
    setHasLocation(Boolean(data));
  };

  const refreshDeviceLocation = useCallback(async () => {
    setDeviceLocationReady(false);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status === "undetermined") permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setDeviceLocation(null);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeviceLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      setDeviceLocation(null);
    } finally {
      setDeviceLocationReady(true);
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    setSession(null);
    setHasLocation(null);
    setDeviceLocation(null);
    setDeviceLocationReady(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { void refreshLocation(); }, [session?.user.id]);
  useEffect(() => {
    if (!hasLocation) return;
    void refreshDeviceLocation();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshDeviceLocation();
    });
    return () => subscription.remove();
  }, [hasLocation, refreshDeviceLocation]);

  const value = useMemo(() => ({ session, loading, hasLocation, deviceLocation, deviceLocationReady, refreshLocation, refreshDeviceLocation, signOut }), [session, loading, hasLocation, deviceLocation, deviceLocationReady, refreshDeviceLocation, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
