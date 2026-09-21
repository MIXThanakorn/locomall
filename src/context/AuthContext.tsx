/* eslint-disable react-hooks/set-state-in-effect */
import { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type AuthState = { session: Session | null; loading: boolean; hasLocation: boolean | null; refreshLocation: () => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);

  const refreshLocation = async () => {
    if (!session?.user.id) return setHasLocation(null);
    const { data } = await supabase.from("user_locations").select("user_id").eq("user_id", session.user.id).maybeSingle();
    setHasLocation(Boolean(data));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { void refreshLocation(); }, [session?.user.id]);

  const value = useMemo(() => ({ session, loading, hasLocation, refreshLocation }), [session, loading, hasLocation]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
