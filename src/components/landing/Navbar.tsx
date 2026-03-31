import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreditCard, Menu, Zap } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Témoignages", href: "#testimonials" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/40 safe-area-top">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-sm">
            <CreditCard className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold tracking-tight">FidéliPro</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground rounded-lg">
            <Link to="/login">Se connecter</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground rounded-lg hover:opacity-90 shadow-sm gap-1.5 font-semibold">
            <Link to="/register">
              <Zap className="w-3.5 h-3.5" />
              S'inscrire
            </Link>
          </Button>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl border-border/60">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] max-w-xs p-6 safe-area-top">
              <SheetHeader className="mb-8">
                <SheetTitle className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-display font-bold">FidéliPro</span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-4 space-y-2">
                  <Button asChild variant="outline" className="w-full justify-center rounded-xl h-11">
                    <Link to="/login">Se connecter</Link>
                  </Button>
                  <Button asChild className="w-full justify-center bg-gradient-primary text-primary-foreground rounded-xl h-11 gap-1.5 font-semibold">
                    <Link to="/register">
                      <Zap className="w-4 h-4" />
                      S'inscrire
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
