import {
  BarChart3, Users, Settings, Palette, Gift, Send,
  LayoutDashboard, Building2, Shield,
} from "lucide-react";

export const businessSidebarItems = [
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Clients", path: "/dashboard/clients" },
  { icon: Gift, label: "Récompenses", path: "/dashboard/rewards" },
  { icon: Send, label: "Campagnes", path: "/dashboard/campaigns" },
  { icon: Palette, label: "Personnalisation", path: "/dashboard/customize" },
  { icon: Settings, label: "Paramètres", path: "/dashboard/settings" },
];

export const adminSidebarItems = [
  { icon: LayoutDashboard, label: "Vue d'ensemble", path: "/admin" },
  { icon: Building2, label: "Entreprises", path: "/admin/businesses" },
  { icon: Users, label: "Utilisateurs", path: "/admin/users" },
  { icon: Settings, label: "Configuration", path: "/admin/settings" },
];
