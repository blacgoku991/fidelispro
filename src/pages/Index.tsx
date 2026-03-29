import { useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (!isStandalone) return;

    const lastCardPath = localStorage.getItem("customer_last_card_path");

    const cookieCardCode = document.cookie
      .split("; ")
      .find((row) => row.startsWith("customer_last_card_code="))
      ?.split("=")[1];

    const cookieCardPath = cookieCardCode ? `/card/${decodeURIComponent(cookieCardCode)}` : null;
    const targetPath = lastCardPath || cookieCardPath;

    if (targetPath && targetPath.startsWith("/card/")) {
      window.location.replace(targetPath);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </div>
  );
};

export default Index;
