// 
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ClientsPage from "./pages/dashboard/ClientsPage";

import CustomizePage from "./pages/dashboard/CustomizePage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import CheckoutPage from "./pages/dashboard/CheckoutPage";
import RewardsPage from "./pages/dashboard/RewardsPage";
import CampaignsPage from "./pages/dashboard/CampaignsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBusinesses from "./pages/admin/AdminBusinesses";
import AdminBusinessDetail from "./pages/admin/AdminBusinessDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLandingContent from "./pages/admin/AdminLandingContent";
import AdminEmailDigest from "./pages/admin/AdminEmailDigest";
import Onboarding from "./pages/Onboarding";
import BusinessPublicPage from "./pages/public/BusinessPublicPage";
import CardViewPage from "./pages/public/CardViewPage";
import VitrinePage from "./pages/public/VitrinePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/clients" element={<ClientsPage />} />
            <Route path="/dashboard/rewards" element={<RewardsPage />} />
            <Route path="/dashboard/scanner" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard/campaigns" element={<CampaignsPage />} />
            <Route path="/dashboard/customize" element={<CustomizePage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/dashboard/checkout" element={<CheckoutPage />} />
            {/* Redirects for removed pages */}
            <Route path="/dashboard/cards" element={<Navigate to="/dashboard/clients" replace />} />
            <Route path="/dashboard/qrcode" element={<Navigate to="/dashboard/customize" replace />} />
            <Route path="/dashboard/notifications" element={<Navigate to="/dashboard/campaigns" replace />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/businesses" element={<AdminBusinesses />} />
            <Route path="/admin/businesses/:businessId" element={<AdminBusinessDetail />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/landing" element={<AdminLandingContent />} />
            <Route path="/admin/digest" element={<AdminEmailDigest />} />
            <Route path="/b/:businessId" element={<BusinessPublicPage />} />
            <Route path="/vitrine/:slug" element={<VitrinePage />} />
            <Route path="/card/:cardCode" element={<CardViewPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
