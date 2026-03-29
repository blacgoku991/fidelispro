import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth(redirectTo = "/login") {
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
        navigate(redirectTo, { replace: true });
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
        navigate(redirectTo, { replace: true });
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

