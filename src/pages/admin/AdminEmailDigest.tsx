import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Play, Loader2, CheckCircle, Users, QrCode, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const AdminEmailDigest = () => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [sendingAll, setSendingAll] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: bizData } = await supabase
      .from("businesses")
      .select("id, name, subscription_status, subscription_plan, created_at")
      .order("created_at", { ascending: false });
    setBusinesses(bizData || []);

    const { data: logData } = await supabase
      .from("digest_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(50);
    setLogs(logData || []);
  };

  const invokeDigest = async (merchantId: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/weekly-digest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify({ merchant_id: merchantId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur");
    return data.results?.[0] || data;
  };

  const handleSendDigest = async (bizId: string, bizName: string) => {
    setSending((prev) => ({ ...prev, [bizId]: true }));
    try {
      const result = await invokeDigest(bizId);
      setResults((prev) => ({ ...prev, [bizId]: result }));
      toast.success(`Digest envoyé pour ${bizName}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSending((prev) => ({ ...prev, [bizId]: false }));
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/weekly-digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(`Digest généré pour ${data.count} commerces`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSendingAll(false);
    }
  };

  const lastLogByMerchant: Record<string, any> = {};
  for (const log of logs) {
    if (!lastLogByMerchant[log.merchant_id]) {
      lastLogByMerchant[log.merchant_id] = log;
    }
  }

  return (
    <AdminLayout title="Emails programmés" subtitle="Digest hebdomadaire par commerce">
      <div className="space-y-5">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">{businesses.length} commerces</p>
              <p className="text-xs text-muted-foreground">{logs.length} digest envoyé{logs.length > 1 ? "s" : ""}</p>
            </div>
          </div>
          <Button
            onClick={handleSendAll}
            disabled={sendingAll}
            className="rounded-xl bg-gradient-primary text-primary-foreground gap-2"
          >
            {sendingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Envoyer à tous
          </Button>
        </div>

        {/* Businesses table */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commerce</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Dernier digest</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.map((biz) => {
                const lastLog = lastLogByMerchant[biz.id];
                const result = results[biz.id];
                return (
                  <TableRow key={biz.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{biz.name}</p>
                        <p className="text-xs text-muted-foreground">{biz.subscription_status}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{biz.subscription_plan || "starter"}</Badge>
                    </TableCell>
                    <TableCell>
                      {lastLog ? (
                        <div className="text-xs text-muted-foreground">
                          {new Date(lastLog.sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Jamais</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg gap-1.5 text-xs"
                        disabled={sending[biz.id]}
                        onClick={() => handleSendDigest(biz.id, biz.name)}
                      >
                        {sending[biz.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Envoyer digest test
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Results panel */}
        <AnimatePresence>
          {Object.keys(results).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Résultats du digest
              </h3>
              {Object.entries(results).map(([bizId, result]) => (
                <div key={bizId} className="p-4 rounded-2xl bg-card border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{result.merchant_name}</p>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                      {result.period}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-secondary/60 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <p className="text-lg font-display font-bold">{result.new_clients}</p>
                      <p className="text-[10px] text-muted-foreground">Nouveaux clients</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/60 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <QrCode className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <p className="text-lg font-display font-bold">{result.scans}</p>
                      <p className="text-[10px] text-muted-foreground">Scans</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/60 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <p className="text-lg font-display font-bold">{result.inactive_clients}</p>
                      <p className="text-[10px] text-muted-foreground">Clients inactifs</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/60 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <p className="text-sm font-display font-bold">{result.best_day || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Meilleur jour</p>
                    </div>
                  </div>
                  <details className="text-xs">
                    <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors">Voir JSON brut</summary>
                    <pre className="mt-2 p-3 rounded-xl bg-secondary text-[10px] overflow-x-auto text-muted-foreground leading-relaxed">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent logs */}
        {logs.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Historique récent ({logs.length})
            </h3>
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commerce</TableHead>
                    <TableHead>Envoyé le</TableHead>
                    <TableHead>Nouveaux</TableHead>
                    <TableHead>Scans</TableHead>
                    <TableHead>Inactifs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm font-medium">{log.data?.merchant_name || log.merchant_id}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-sm">{log.data?.new_clients ?? "—"}</TableCell>
                      <TableCell className="text-sm">{log.data?.scans ?? "—"}</TableCell>
                      <TableCell className="text-sm">{log.data?.inactive_clients ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEmailDigest;
