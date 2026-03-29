import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Send, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface WalletDebugPanelProps {
  businessId: string;
}

export const WalletDebugPanel = ({ businessId }: WalletDebugPanelProps) => {
  const [stats, setStats] = useState({
    registrations: 0,
    uniqueDevices: 0,
    uniquePasses: 0,
    recentLogs: [] as any[],
  });
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [businessId]);

  const fetchStats = async () => {
    setLoading(true);
    const [regsRes, logsRes] = await Promise.all([
      supabase
        .from("wallet_registrations")
        .select("*")
        .eq("business_id", businessId),
      supabase
        .from("wallet_apns_logs")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const regs = regsRes.data || [];
    const uniqueDevices = new Set(regs.map((r) => r.device_library_id)).size;
    const uniquePasses = new Set(regs.map((r) => r.serial_number)).size;

    setStats({
      registrations: regs.length,
      uniqueDevices,
      uniquePasses,
      recentLogs: logsRes.data || [],
    });
    setLoading(false);
  };

  const sendTestPush = async () => {
    setSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/wallet-push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: businessId,
            change_message: "🧪 Test Wallet push",
            test_mode: false,
          }),
        }
      );
      const result = await res.json();

      if (result.success) {
        toast.success(
          `Push envoyé ! ${result.pushed} réussi(s), ${result.failed} échoué(s) sur ${result.unique_devices} appareil(s)`
        );
      } else {
        toast.error(result.error || "Échec de l'envoi");
      }
      fetchStats();
    } catch (err: any) {
      toast.error("Erreur: " + String(err));
    }
    setSending(false);
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">Apple Wallet Debug</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-muted/50 text-center">
          <p className="text-2xl font-display font-bold">{stats.registrations}</p>
          <p className="text-xs text-muted-foreground">Enregistrements</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50 text-center">
          <p className="text-2xl font-display font-bold">{stats.uniqueDevices}</p>
          <p className="text-xs text-muted-foreground">Appareils</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50 text-center">
          <p className="text-2xl font-display font-bold">{stats.uniquePasses}</p>
          <p className="text-xs text-muted-foreground">Passes actifs</p>
        </div>
      </div>

      {/* Test button */}
      <Button
        onClick={sendTestPush}
        disabled={sending || stats.registrations === 0}
        className="w-full bg-gradient-primary text-primary-foreground rounded-xl gap-2"
      >
        <Send className="w-4 h-4" />
        {sending ? "Envoi en cours..." : "Envoyer un test Wallet push"}
      </Button>
      {stats.registrations === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Aucun appareil enregistré. Installez d'abord une carte dans Apple Wallet.
        </p>
      )}

      {/* Recent APNs logs */}
      {stats.recentLogs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Derniers logs APNs
          </p>
          {stats.recentLogs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-2">
                {log.status === "sent" ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                )}
                <span className="font-mono truncate max-w-[120px]">
                  {log.push_token?.slice(0, 12)}...
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={log.status === "sent" ? "default" : "destructive"}
                  className="text-[10px] px-1.5"
                >
                  {log.status}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(log.created_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
