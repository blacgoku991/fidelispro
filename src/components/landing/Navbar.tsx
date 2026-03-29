import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold">FidéliPro</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Tarifs
          </a>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Se connecter
          </Link>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground rounded-lg hover:opacity-90">
            <Link to="/register">Commencer</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
