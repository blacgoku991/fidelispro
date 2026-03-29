import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Bell, Wallet, BarChart3, Lock } from "lucide-react";

interface FeatureToggle {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  premium?: boolean;
}

const features: FeatureToggle[] = [
  {
    key: "feature_gamification",
    label: "Gamification",
    description: "Niveaux, badges, streaks et classements",
    icon: Gamepad2,
  },
  {
    key: "feature_notifications",
    label: "Notifications",
    description: "Alertes push et messages automatiques",
    icon: Bell,
  },
  {
    key: "feature_wallet",
    label: "Wallet",
    description: "Apple Wallet & Google Pay",
    icon: Wallet,
    premium: true,
  },
  {
    key: "feature_analytics",
    label: "Analytics avancés",
    description: "Graphiques, tendances et insights",
    icon: BarChart3,
  },
];

interface FeatureTogglesProps {
  config: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
  plan?: string;
}

export function FeatureToggles({ config, onChange, plan = "starter" }: FeatureTogglesProps) {
  const canToggle = (f: FeatureToggle) => {
    if (f.premium && plan === "starter") return false;
    return true;
  };

  return (
    <div className="space-y-3">
      {features.map((f) => {
        const Icon = f.icon;
        const enabled = config[f.key] ?? true;
        const locked = !canToggle(f);

        return (
          <div
            key={f.key}
            className={`p-4 rounded-2xl border border-border/50 flex items-center justify-between transition-colors ${
              locked ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{f.label}</p>
                  {f.premium && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Lock className="w-2.5 h-2.5" /> Pro
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => onChange(f.key, v)}
              disabled={locked}
            />
          </div>
        );
      })}
    </div>
  );
}
