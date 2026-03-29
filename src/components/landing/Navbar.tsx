import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreditCard, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
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

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] max-w-xs p-6 safe-area-top">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-display font-bold">FidéliPro</span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-2">
                <a
                  href="#pricing"
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Tarifs
                </a>
                <Button asChild variant="outline" className="w-full justify-center rounded-xl h-11">
                  <Link to="/login">Se connecter</Link>
                </Button>
                <Button asChild className="w-full justify-center bg-gradient-primary text-primary-foreground rounded-xl h-11">
                  <Link to="/register">Commencer</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

