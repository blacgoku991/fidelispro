import { businessTemplates, type BusinessTemplate } from "@/lib/businessTemplates";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface TemplatePickerProps {
  currentTemplate: string;
  onSelect: (template: BusinessTemplate) => void;
}

export function TemplatePicker({ currentTemplate, onSelect }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {businessTemplates.map((t, i) => {
        const isActive = currentTemplate === t.id;
        return (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(t)}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
              isActive
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/30 hover:bg-card"
            }`}
          >
            {isActive && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            <span className="text-2xl">{t.emoji}</span>
            <p className="font-semibold text-sm mt-2">{t.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
          </motion.button>
        );
      })}
    </div>
  );
}
