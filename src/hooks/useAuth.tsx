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

      // Subscription gate: redirect unpaid users to checkout
      const biz = bizRes.data;
      const path = window.location.pathname;
      if (
        biz &&
        biz.subscription_status === "inactive" &&
        path.startsWith("/dashboard") &&
        !path.startsWith("/dashboard/checkout")
      ) {
        navigate(`/dashboard/checkout?plan=${biz.subscription_plan || "starter"}`, { replace: true });
      }
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
  const navigate = useNavigate();

  useEffect(() => {
    if (context && !context.loading && !context.user && redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [context?.loading, context?.user, redirectTo, navigate]);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
