import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Gift, Trophy, MapPin, ArrowRight, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const VitrinePage = () => {
  const { slug } = useParams();
  const [business, setBusiness] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const joinUrl = business ? `${window.location.origin}/b/${business.id}` : "";

  // Dynamic OG meta tags for social sharing
  useEffect(() => {
    if (!business) return;
    const title = `${business.name} — Programme de fidélité`;
    const description = business.description
      ? `${business.description} Rejoignez le programme de fidélité de ${business.name}.`
      : `Rejoignez le programme de fidélité de ${business.name} et cumulez des points à chaque visite.`;
    const image = business.logo_url || `${window.location.origin}/icon-512.png`;
    const url = window.location.href;

    document.title = title;

    const setMeta = (selector: string, attr: string, val: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        const [attrName, attrVal] = selector.replace("meta[", "").replace("]", "").split("=");
        (el as HTMLMetaElement).setAttribute(attrName, attrVal.replace(/"/g, ""));
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };

    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]', "content", image);
    setMeta('meta[name="description"]', "content", description);

    return () => {
      document.title = "FidéliPro - Cartes de fidélité digitales pour commerçants";
    };
  }, [business]);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setLoading(true);

      // 1. Try fetching by slug (requires migration applied)
      let biz: any = null;
      const { data: bySlug, error: slugError } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!slugError && bySlug) {
        biz = bySlug;
      } else {
        // 2. Fallback: try fetching by business ID (UUID format)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(slug)) {
          const { data: byId } = await supabase
            .from("businesses")
            .select("*")
            .eq("id", slug)
            .maybeSingle();
          if (byId) biz = byId;
        }
      }

      if (!biz) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setBusiness(biz);

      const { data: rw } = await supabase
        .from("rewards")
        .select("*")
        .eq("business_id", biz.id)
        .eq("is_active", true)
        .order("points_required", { ascending: true });

      setRewards(rw || []);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <Gift className="w-8 h-8 text-muted-foreground opacity-40" />
        </div>
        <h1 className="text-xl font-display font-bold mb-2">Commerce introuvable</h1>
        <p className="text-sm text-muted-foreground mb-6">Cette vitrine n'existe pas ou a été supprimée.</p>
        <Link to="/">
          <Button variant="outline" className="rounded-xl">Retour à l'accueil</Button>
        </Link>
      </div>
    );
  }

  const accentColor = business.accent_color || "#F59E0B";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div
        className="relative overflow-hidden py-16 px-4 text-center"
        style={{ background: `linear-gradient(135deg, ${accentColor}15 0%, transparent 60%)` }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `radial-gradient(circle at 50% 0%, ${accentColor} 0%, transparent 70%)` }}
        />

        <motion.div
          className="relative z-10 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-20 h-20 rounded-2xl object-cover mx-auto mb-5 shadow-lg border border-border/30"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg text-white text-2xl font-bold"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
            >
              {business.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}

          <Badge className="mb-3 text-xs font-semibold" style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}>
            <Sparkles className="w-3 h-3 mr-1" /> Programme de fidélité
          </Badge>

          <h1 className="text-3xl font-display font-extrabold mb-2">{business.name}</h1>

          {business.category && (
            <p className="text-sm text-muted-foreground mb-3">{business.category}</p>
          )}

          {business.description && (
            <p className="text-base text-muted-foreground leading-relaxed mb-4 max-w-md mx-auto">
              {business.description}
            </p>
          )}

          {(business.address || business.phone) && (
            <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground mb-6">
              {business.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {business.address.split(",")[0]}
                </span>
              )}
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/b/${business.id}`}>
              <Button
                size="lg"
                className="rounded-2xl gap-2 font-semibold shadow-lg px-8"
                style={{ backgroundColor: accentColor, color: "#fff" }}
              >
                Rejoindre le programme <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl gap-2"
              onClick={() => setShowQr((v) => !v)}
            >
              {showQr ? "Masquer le QR" : "Afficher le QR code"}
            </Button>
          </div>

          {/* QR Code */}
          {showQr && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 inline-block p-4 bg-white rounded-2xl shadow-xl border border-border/20"
            >
              <QRCodeSVG value={joinUrl} size={180} fgColor="#1a1a1a" level="H" />
              <p className="text-xs text-center text-gray-500 mt-2 font-medium">Scanner pour rejoindre</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Rewards */}
      {rewards.length > 0 && (
        <div className="max-w-lg mx-auto px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
                <Trophy className="w-4 h-4" style={{ color: accentColor }} />
              </div>
              <h2 className="font-display font-bold text-lg">Récompenses disponibles</h2>
            </div>

            <div className="space-y-3">
              {rewards.map((reward, i) => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.07 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)` }}
                  >
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm">{reward.title}</p>
                    {reward.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{reward.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0" style={{ color: accentColor }}>
                    <Star className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold">{reward.points_required}</span>
                    <span className="text-xs text-muted-foreground font-normal">pts</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="max-w-lg mx-auto px-4 pb-12 text-center">
        <div className="p-6 rounded-2xl border border-border/50 bg-card">
          <p className="text-sm font-medium mb-1">Prêt à commencer ?</p>
          <p className="text-xs text-muted-foreground mb-4">Rejoignez le programme de fidélité et cumulez des points à chaque visite.</p>
          <Link to={`/b/${business.id}`}>
            <Button
              className="rounded-xl gap-2 font-semibold w-full"
              style={{ backgroundColor: accentColor, color: "#fff" }}
            >
              S'inscrire gratuitement <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VitrinePage;
