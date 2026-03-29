import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { businessSidebarItems } from "@/lib/sidebarItems";
import { motion } from "framer-motion";

const CardsPage = () => {
  const { loading, business, logout } = useAuth();
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    if (!business) return;
    const fetchCards = async () => {
      const { data } = await supabase
        .from("customer_cards")
        .select("*, customers(full_name, email, level)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });
      if (data) setCards(data);
    };
    fetchCards();
  }, [business]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={businessSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} />

        <h1 className="text-2xl font-display font-bold mb-2">Cartes de fidélité</h1>
        <p className="text-muted-foreground text-sm mb-8">{cards.length} carte(s) active(s)</p>

        <div className="p-6 rounded-2xl bg-card border border-border/50 mb-8">
          <h2 className="font-display font-semibold mb-4">Aperçu de votre carte</h2>
          <div className="flex justify-center">
            <LoyaltyCard
              businessName={business?.name || "Mon Commerce"}
              customerName="Votre client"
              points={5}
              maxPoints={business?.max_points_per_card || 10}
              level="gold"
              cardId={`card-preview`}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Code carte</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Récompenses</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((card, i) => (
                <motion.tr
                  key={card.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell>
                    <p className="font-medium">{card.customers?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{card.customers?.email || ""}</p>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-secondary px-2 py-1 rounded">{card.card_code}</code>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{card.current_points}</span>
                    <span className="text-muted-foreground">/{card.max_points}</span>
                  </TableCell>
                  <TableCell>{card.rewards_earned}</TableCell>
                  <TableCell>
                    <Badge variant={card.is_active ? "default" : "secondary"}>
                      {card.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </motion.tr>
              ))}
              {cards.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Aucune carte créée. Ajoutez des clients pour générer des cartes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default CardsPage;
