import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, QrCode, UserPlus, Send, X } from "lucide-react";
import { Link } from "react-router-dom";

interface FloatingActionButtonProps {
  onAddClient?: () => void;
}

export function FloatingActionButton({ onAddClient }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      icon: QrCode,
      label: "Scanner",
      color: "bg-violet-600 hover:bg-violet-700",
      onClick: () => { setOpen(false); },
      as: "link" as const,
      to: "/dashboard",
    },
    {
      icon: UserPlus,
      label: "Ajouter un client",
      color: "bg-emerald-600 hover:bg-emerald-700",
      onClick: () => { setOpen(false); onAddClient?.(); },
      as: "button" as const,
    },
    {
      icon: Send,
      label: "Envoyer campagne",
      color: "bg-blue-600 hover:bg-blue-700",
      onClick: () => { setOpen(false); },
      as: "link" as const,
      to: "/dashboard/campaigns",
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            {actions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 16, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.8 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                className="flex items-center gap-3"
              >
                <span className="bg-foreground text-background text-xs font-semibold px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap">
                  {action.label}
                </span>
                {action.as === "link" ? (
                  <Link
                    to={action.to!}
                    className={`w-11 h-11 rounded-full ${action.color} text-white flex items-center justify-center shadow-lg transition-colors`}
                    onClick={action.onClick}
                  >
                    <action.icon className="w-5 h-5" />
                  </Link>
                ) : (
                  <button
                    className={`w-11 h-11 rounded-full ${action.color} text-white flex items-center justify-center shadow-lg transition-colors`}
                    onClick={action.onClick}
                  >
                    <action.icon className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-xl shadow-violet-500/40 hover:shadow-violet-500/60 transition-shadow"
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}
