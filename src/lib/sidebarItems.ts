import {
  BarChart3, Users, Settings, Palette, Gift, Send,
  LayoutDashboard, Building2, Shield, Globe, Mail, CreditCard, Tag,
} from "lucide-react";

export const businessSidebarItems = [
  { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Clients", path: "/dashboard/clients" },
  { icon: Gift, label: "Récompenses", path: "/dashboard/rewards" },
  { icon: Send, label: "Campagnes", path: "/dashboard/campaigns" },
  { icon: Palette, label: "Personnalisation", path: "/dashboard/customize" },
  { icon: CreditCard, label: "Abonnement", path: "/dashboard/abonnement" },
  { icon: Settings, label: "Paramètres", path: "/dashboard/settings" },
];

export const adminSidebarItems = [
  { icon: LayoutDashboard, label: "Vue d'ensemble", path: "/admin" },
  { icon: Building2, label: "Entreprises", path: "/admin/businesses" },
  { icon: Users, label: "Utilisateurs", path: "/admin/users" },
  { icon: Globe, label: "Contenu du site", path: "/admin/landing" },
  { icon: Tag, label: "Plans & Tarifs", path: "/admin/plans" },
  { icon: Settings, label: "Configuration", path: "/admin/settings" },
  { icon: Mail, label: "Emails programmés", path: "/admin/digest" },
];
