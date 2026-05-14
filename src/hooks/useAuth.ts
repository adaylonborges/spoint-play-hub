import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, type User } from "firebase/auth";
import { normalizeRedirectPath } from "@/lib/authRedirect";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
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
