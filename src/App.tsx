import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ClientsPage from "./pages/dashboard/ClientsPage";

import CustomizePage from "./pages/dashboard/CustomizePage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import RewardsPage from "./pages/dashboard/RewardsPage";
import CampaignsPage from "./pages/dashboard/CampaignsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBusinesses from "./pages/admin/AdminBusinesses";
import BusinessPublicPage from "./pages/public/BusinessPublicPage";
import CardViewPage from "./pages/public/CardViewPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/clients" element={<ClientsPage />} />
          <Route path="/dashboard/rewards" element={<RewardsPage />} />
          <Route path="/dashboard/scanner" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/campaigns" element={<CampaignsPage />} />
          <Route path="/dashboard/customize" element={<CustomizePage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
          {/* Redirects for removed pages */}
          <Route path="/dashboard/cards" element={<Navigate to="/dashboard/clients" replace />} />
          <Route path="/dashboard/qrcode" element={<Navigate to="/dashboard/customize" replace />} />
          <Route path="/dashboard/notifications" element={<Navigate to="/dashboard/campaigns" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/businesses" element={<AdminBusinesses />} />
          <Route path="/b/:businessId" element={<BusinessPublicPage />} />
          <Route path="/card/:cardCode" element={<CardViewPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
