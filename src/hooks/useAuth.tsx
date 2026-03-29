import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  business: any;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    let active = true;

    const bootSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error || !data.session) {
        setUser(null);
        setRole(null);
        setBusiness(null);
        setLoading(false);
        return;
      }

      setUser(data.session.user);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (!session) {
        setUser(null);
        setRole(null);
        setBusiness(null);
        setLoading(false);
        return;
      }

      setUser(session.user);
    });

    bootSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadUserContext = async () => {
      if (!user) return;

      const [rolesRes, bizRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1),
        supabase.from("businesses").select("*").eq("owner_id", user.id).maybeSingle(),
      ]);

      if (!active) return;

      setRole(rolesRes.data?.[0]?.role ?? null);
      setBusiness(bizRes.data ?? null);
      setLoading(false);
    };

    loadUserContext();

    return () => {
      active = false;
    };
  }, [user]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, business, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(redirectTo = "/login") {
  const context = useContext(AuthContext);

  // If used outside AuthProvider (e.g., login page), fall back to standalone behavior
  if (!context) {
    return useAuthStandalone(redirectTo);
  }

  const navigate = useNavigate();

  // Redirect to login if not loading and no user
  useEffect(() => {
    if (!context.loading && !context.user && redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [context.loading, context.user, redirectTo, navigate]);

  return context;
}

// Standalone version for pages outside AuthProvider (login, register, etc.)
function useAuthStandalone(redirectTo = "/login") {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    let active = true;

    const bootSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error || !data.session) {
        setUser(null);
        setRole(null);
        setBusiness(null);
        setLoading(false);
        if (redirectTo) navigate(redirectTo, { replace: true });
        return;
      }

      setUser(data.session.user);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (!session) {
        setUser(null);
        setRole(null);
        setBusiness(null);
        setLoading(false);
        if (redirectTo) navigate(redirectTo, { replace: true });
        return;
      }

      setUser(session.user);
    });

    bootSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate, redirectTo]);

  useEffect(() => {
    let active = true;

    const loadUserContext = async () => {
      if (!user) return;

      setLoading(true);

      const [rolesRes, bizRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1),
        supabase.from("businesses").select("*").eq("owner_id", user.id).maybeSingle(),
      ]);

      if (!active) return;

      setRole(rolesRes.data?.[0]?.role ?? null);
      setBusiness(bizRes.data ?? null);
      setLoading(false);
    };

    loadUserContext();

    return () => {
      active = false;
    };
  }, [user]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return { user, loading, role, business, logout };
}
