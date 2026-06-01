import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth für Auth — deduped.
 * onAuthStateChange feuert beim Mount mit INITIAL_SESSION,
 * getSession() würde danach erneut feuern. Wir vergleichen anhand der
 * access_token, damit downstream-Effekte (queries, realtime channels)
 * nicht doppelt initialisieren.
 */
export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const apply = (s: Session | null) => {
      const tok = s?.access_token ?? null;
      if (tokenRef.current === tok && !loading) return; // dedupe
      tokenRef.current = tok;
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
    supabase.auth.getSession().then(({ data: { session } }) => apply(session));

    return () => { mounted = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return { session, user, loading, signOut };
};
