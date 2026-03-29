import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanResultPopupProps {
  open: boolean;
  onClose: () => void;
  type: "success" | "reward" | "error";
  title: string;
  message: string;
  details?: string;
}

export function ScanResultPopup({ open, onClose, type, title, message, details }: ScanResultPopupProps) {
  const config = {
    success: {
      icon: CheckCircle,
      iconColor: "text-emerald-500",
      bgGlow: "from-emerald-500/20 to-emerald-500/5",
      borderColor: "border-emerald-200 dark:border-emerald-500/30",
    },
    reward: {
      icon: Trophy,
      iconColor: "text-amber-500",
      bgGlow: "from-amber-500/20 to-amber-500/5",
      borderColor: "border-amber-200 dark:border-amber-500/30",
    },
    error: {
      icon: XCircle,
      iconColor: "text-destructive",
      bgGlow: "from-destructive/20 to-destructive/5",
      borderColor: "border-destructive/30",
    },
  }[type];

  const Icon = config.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

          {/* Popup card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={`relative w-full max-w-sm rounded-3xl bg-card border ${config.borderColor} shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow background */}
            <div className={`absolute inset-0 bg-gradient-to-b ${config.bgGlow} pointer-events-none`} />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center px-8 py-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
              >
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${config.bgGlow} flex items-center justify-center mb-5`}>
                  <Icon className={`w-10 h-10 ${config.iconColor}`} />
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xl font-display font-bold tracking-tight"
              >
                {title}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-muted-foreground mt-2"
              >
                {message}
              </motion.p>

              {details && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-xs text-muted-foreground/70 mt-1"
                >
                  {details}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 w-full"
              >
                <Button
                  onClick={onClose}
                  className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold"
                >
                  OK
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
