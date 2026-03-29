import { CreditCard } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border/50">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
            <CreditCard className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold">FidéliPro</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} FidéliPro. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
