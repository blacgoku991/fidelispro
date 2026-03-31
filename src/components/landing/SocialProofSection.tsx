import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const avatarGradients = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-indigo-500 to-blue-600",
];

function getInitials(name: string) {
  return (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function SocialProofSection() {
  const { data: settings } = useSiteSettings();
  const { data: testimonials } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const title = settings?.social_proof_title || "Ils fidélisent avec FidéliPro";

  if (!testimonials?.length) return null;

  return (
    <section className="py-24 bg-background overflow-hidden" id="testimonials">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-wide uppercase mb-5">
            Témoignages
          </span>
          <h2 className="text-3xl lg:text-5xl font-display font-extrabold text-balance">{title}</h2>
          {/* Stars row */}
          <div className="flex items-center justify-center gap-1 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
            ))}
            <span className="ml-2 text-sm font-semibold text-muted-foreground">4.9 / 5 — {testimonials.length} avis</span>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t: any, i: number) => (
            <motion.div
              key={t.id}
              className="group relative p-7 rounded-2xl bg-card border border-border/50 hover:border-amber-500/20 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 flex flex-col overflow-hidden"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
            >
              {/* Large decorative quote */}
              <span className="absolute top-4 right-5 text-5xl font-serif text-primary/6 group-hover:text-primary/10 transition-colors leading-none select-none">"</span>

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star
                    key={si}
                    className={`w-4 h-4 ${si < (t.rating || 5) ? "text-amber-400 fill-amber-400" : "text-border"}`}
                  />
                ))}
              </div>

              {/* Quote text */}
              <p className="text-foreground/85 leading-relaxed flex-1 font-medium text-sm italic">
                «&nbsp;{t.quote}&nbsp;»
              </p>

              {/* Author */}
              <div className="mt-6 pt-5 border-t border-border/40 flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md`}>
                  {getInitials(t.business_name)}
                </div>
                <div>
                  <p className="font-display font-bold text-sm leading-tight">{t.business_name}</p>
                  {t.category && <p className="text-xs text-muted-foreground mt-0.5">{t.category}</p>}
                </div>
              </div>

              {/* Amber accent bottom bar on hover */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
