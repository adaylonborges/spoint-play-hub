import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { normalizeRedirectPath } from "@/lib/authRedirect";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!loading && !user) {
      const redirect = normalizeRedirectPath(`${loc.pathname}${loc.searchStr}`, "/");
      nav({ to: "/login", search: { redirect } as never });
    }
  }, [loading, user, nav, loc.pathname, loc.searchStr]);
  return { user, loading };
}
