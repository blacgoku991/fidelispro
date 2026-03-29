import { CreditCard, LogOut, Menu } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface MobileHeaderProps {
  onLogout: () => void;
  items?: SidebarItem[];
}

export function MobileHeader({ onLogout, items = [] }: MobileHeaderProps) {
  return (
    <div className="lg:hidden flex items-center justify-between mb-6">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-display font-bold">FidéliPro</span>
      </Link>

      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[86vw] max-w-sm p-4">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-primary-foreground" />
                </div>
                FidéliPro
              </SheetTitle>
            </SheetHeader>

            <nav className="flex flex-col gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Button variant="ghost" size="icon" onClick={onLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

