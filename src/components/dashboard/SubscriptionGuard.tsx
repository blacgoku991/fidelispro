import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { business } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!business) return;
    const status = business.subscription_status;
    const path = window.location.pathname;
    const isBlocked = status === "inactive" || status === "canceled" || status === "past_due";
    // Allow access to abonnement page even for blocked users (to manage/reactivate)
    const isExempt = path.startsWith("/dashboard/checkout") || path.startsWith("/dashboard/abonnement");
    if (isBlocked && !isExempt) {
      navigate(`/dashboard/checkout?plan=${business.subscription_plan || "starter"}`, { replace: true });
    }
  }, [business, navigate]);

  return <>{children}</>;
}
