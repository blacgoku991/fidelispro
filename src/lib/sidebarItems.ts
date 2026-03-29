import {
  BarChart3, CreditCard, Users, QrCode, Bell, Settings, Palette, Gift,
  LayoutDashboard, Building2,
} from "lucide-react";

export const businessSidebarItems = [
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
  { icon: CreditCard, label: "Cartes", path: "/dashboard/cards" },
  { icon: Users, label: "Clients", path: "/dashboard/clients" },
  { icon: Gift, label: "Récompenses", path: "/dashboard/rewards" },
  { icon: QrCode, label: "Scanner", path: "/dashboard/scanner" },
  { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
  { icon: Palette, label: "Personnalisation", path: "/dashboard/customize" },
  { icon: Settings, label: "Paramètres", path: "/dashboard/settings" },
];

export const adminSidebarItems = [
  { icon: LayoutDashboard, label: "Vue d'ensemble", path: "/admin" },
  { icon: Building2, label: "Entreprises", path: "/admin/businesses" },
  { icon: Users, label: "Utilisateurs", path: "/admin/users" },
  { icon: Settings, label: "Configuration", path: "/admin/settings" },
];
