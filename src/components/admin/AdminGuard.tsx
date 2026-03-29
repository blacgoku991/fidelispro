import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { loading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role !== "super_admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, role, navigate]);

  if (loading || role !== "super_admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
