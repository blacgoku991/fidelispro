import { CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  onLogout: () => void;
}

export function MobileHeader({ onLogout }: MobileHeaderProps) {
  return (
    <div className="lg:hidden flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-display font-bold">FidéliPro</span>
      </div>
      <Button variant="ghost" size="icon" onClick={onLogout}>
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
}
