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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!session) {
        navigate(redirectTo);
        return;
      }
      setUser(session.user);
      
      // Fetch role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      
      if (roles && roles.length > 0) {
        setRole(roles[0].role);
      }

      // Fetch business
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", session.user.id)
        .maybeSingle();
      
      if (biz) setBusiness(biz);
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate(redirectTo);
        return;
      }
      setUser(session.user);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      
      if (roles && roles.length > 0) {
        setRole(roles[0].role);
      }

      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", session.user.id)
        .maybeSingle();
      
      if (biz) setBusiness(biz);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return { user, loading, role, business, logout };
}
