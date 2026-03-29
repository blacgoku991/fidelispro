import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone, Send, CheckCircle, XCircle, RefreshCw,
  Plus, Megaphone, Zap, Clock, BellRing,
} from "lucide-react";
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
    lastRegistration: null as string | null,
    lastFetch: null as string | null,
    lastPush: null as string | null,
    recentLogs: [] as any[],
  });
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [businessId]);

  const fetchStats = async () => {
    setLoading(true);
    const [regsRes, logsRes, cardsRes] = await Promise.all([
      supabase
        .from("wallet_registrations")
        .select("*")
        .eq("business_id", businessId),
      supabase
        .from("wallet_apns_logs")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("customer_cards")
        .select("wallet_installed_at, wallet_last_fetched_at")
        .eq("business_id", businessId)
        .not("wallet_installed_at", "is", null)
        .order("wallet_last_fetched_at", { ascending: false })
        .limit(1),
    ]);

    const regs = regsRes.data || [];
    const logs = logsRes.data || [];
    const uniqueDevices = new Set(regs.map((r) => r.device_library_id)).size;
    const uniquePasses = new Set(regs.map((r) => r.serial_number)).size;
    const lastReg = regs.length > 0
      ? regs.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at
      : null;
    const lastPush = logs.length > 0 ? logs[0].created_at : null;
    const lastFetch = cardsRes.data?.[0]?.wallet_last_fetched_at || null;

    setStats({
      registrations: regs.length,
      uniqueDevices,
      uniquePasses,
      lastRegistration: lastReg,
      lastFetch,
      lastPush,
      recentLogs: logs,
    });
    setLoading(false);
  };

  const callWalletPush = async (actionType: string, message: string) => {
    setActiveAction(actionType);
    setLastResult(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/wallet-push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: businessId,
            action_type: actionType,
            change_message: message,
            test_mode: false,
          }),
        }
      );
      const result = await res.json();
      setLastResult(result);

      if (result.success) {
        if (actionType === "send_test_notification" && result.test_notification_log) {
          const t = result.test_notification_log;
          toast.success(`✅ Test notif: DB ${t.db_update_status}, APNs ${t.apns_http_status}, token …${t.device_token_last8}`);
        } else {
          toast.success(
            `✅ ${actionType}: ${result.pushed} push réussi(s), ${result.failed} échoué(s) sur ${result.unique_devices} appareil(s)`
          );
        }
      } else {
        toast.error(result.error || "Échec de l'envoi");
      }
      fetchStats();
    } catch (err: any) {
      toast.error("Erreur: " + String(err));
    }
    setActiveAction(null);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const noDevices = stats.registrations === 0;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-lg">Apple Wallet Debug</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Main stats */}
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

      {/* Timestamps */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <div>
            <p className="font-medium">Dernière inscription</p>
            <p>{formatTime(stats.lastRegistration)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <div>
            <p className="font-medium">Dernier fetch</p>
            <p>{formatTime(stats.lastFetch)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <div>
            <p className="font-medium">Dernier push</p>
            <p>{formatTime(stats.lastPush)}</p>
          </div>
        </div>
      </div>

      {/* Test buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => callWalletPush("send_test_notification", "🎁 1 offre ajoutée aujourd'hui")}
          disabled={!!activeAction || noDevices}
          variant="outline"
          className="rounded-xl gap-2 text-xs h-10"
        >
          <BellRing className="w-3.5 h-3.5" />
          {activeAction === "send_test_notification" ? "Envoi..." : "Send test notification"}
        </Button>
        <Button
          onClick={() => callWalletPush("test", "🧪 Test Wallet push")}
          disabled={!!activeAction || noDevices}
          variant="outline"
          className="rounded-xl gap-2 text-xs h-10"
        >
          <Send className="w-3.5 h-3.5" />
          {activeAction === "test" ? "Envoi..." : "Test push basique"}
        </Button>
        <Button
          onClick={() => callWalletPush("points_increment", "☕ +1 point ajouté !")}
          disabled={!!activeAction || noDevices}
          variant="outline"
          className="rounded-xl gap-2 text-xs h-10"
        >
          <Plus className="w-3.5 h-3.5" />
          {activeAction === "points_increment" ? "Envoi..." : "+1 Point (test)"}
        </Button>
        <Button
          onClick={() => callWalletPush("campaign", "🔥 -20% aujourd'hui seulement !")}
          disabled={!!activeAction || noDevices}
          variant="outline"
          className="rounded-xl gap-2 text-xs h-10"
        >
          <Megaphone className="w-3.5 h-3.5" />
          {activeAction === "campaign" ? "Envoi..." : "Test campagne"}
        </Button>
        <Button
          onClick={() => callWalletPush("full_test", "🎁 Test complet Wallet")}
          disabled={!!activeAction || noDevices}
          className="rounded-xl gap-2 text-xs h-10 bg-gradient-primary text-primary-foreground"
        >
          <Zap className="w-3.5 h-3.5" />
          {activeAction === "full_test" ? "Envoi..." : "Test flux complet"}
        </Button>
      </div>

      {noDevices && (
        <p className="text-xs text-muted-foreground text-center">
          Aucun appareil enregistré. Installez d'abord une carte dans Apple Wallet.
        </p>
      )}

      {/* Last result details */}
      {lastResult && (
        <div className="rounded-xl bg-muted/30 p-3 space-y-1 text-xs">
          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">
            Dernier résultat
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-muted-foreground">Action</span>
            <span className="font-mono">{lastResult.action_type}</span>
            <span className="text-muted-foreground">Push réussis</span>
            <span className="font-mono text-primary">{lastResult.pushed}</span>
            <span className="text-muted-foreground">Push échoués</span>
            <span className="font-mono text-destructive">{lastResult.failed}</span>
            <span className="text-muted-foreground">Appareils uniques</span>
            <span className="font-mono">{lastResult.unique_devices}</span>
            <span className="text-muted-foreground">Passes uniques</span>
            <span className="font-mono">{lastResult.unique_passes}</span>
          </div>
          {lastResult.test_notification_log && (
            <div className="mt-2 p-2 rounded bg-muted/40 space-y-1">
              <p className="font-medium">Test notification log</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="text-muted-foreground">DB update</span>
                <span className="font-mono">{lastResult.test_notification_log.db_update_status}</span>
                <span className="text-muted-foreground">APNs HTTP</span>
                <span className="font-mono">{lastResult.test_notification_log.apns_http_status ?? "—"}</span>
                <span className="text-muted-foreground">Token (last 8)</span>
                <span className="font-mono">{lastResult.test_notification_log.device_token_last8 ?? "—"}</span>
                <span className="text-muted-foreground">Timestamp</span>
                <span className="font-mono">{new Date(lastResult.test_notification_log.timestamp).toLocaleString("fr-FR")}</span>
              </div>
            </div>
          )}
          {lastResult.card_updates?.map((cu: any, i: number) => (
            <div key={i} className="mt-1 p-2 rounded bg-muted/40">
              <p className="font-mono truncate">{cu.serial_number?.slice(0, 8)}...</p>
              <p className="text-muted-foreground">{cu.message}</p>
              <Badge variant={cu.updated ? "default" : "destructive"} className="text-[10px] mt-1">
                {cu.updated ? "✅ card updated" : `❌ ${cu.error}`}
              </Badge>
            </div>
          ))}
        </div>
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
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
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
