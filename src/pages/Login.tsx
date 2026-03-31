import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Eye, EyeOff, Loader2, Star, TrendingUp, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const benefits = [
  { icon: Star, text: "Cartes Apple & Google Wallet en quelques clics" },
  { icon: TrendingUp, text: "Suivez vos clients et leur fidélité en temps réel" },
  { icon: Shield, text: "Données sécurisées, conformité RGPD garantie" },
  { icon: Users, text: "+247 commerçants français font confiance à FidéliPro" },
];

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error("Email ou mot de passe incorrect");
    } else {
      toast.success("Connexion réussie !");
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (roles?.some((r) => r.role === "super_admin")) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — gradient illustration */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-card items-center justify-center p-14 relative overflow-hidden">
        {/* Orb decorations */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-60 h-60 rounded-full bg-purple-300/10 blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-40 h-40 rounded-full bg-amber-400/10 blur-2xl" />

        <div className="max-w-md relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-extrabold text-primary-foreground">FidéliPro</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-display font-extrabold text-primary-foreground leading-tight">
              Fidélisez vos clients comme jamais auparavant.
            </h2>
            <p className="mt-5 text-primary-foreground/60 leading-relaxed text-lg">
              Rejoignez des centaines de commerçants qui boostent leur chiffre d'affaires avec FidéliPro.
            </p>
          </motion.div>

          <div className="mt-10 space-y-5">
            {benefits.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-amber-300" />
                </div>
                <span className="text-sm text-primary-foreground/80 leading-snug">{text}</span>
              </motion.div>
            ))}
          </div>

          {/* Stat badge */}
          <motion.div
            className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-primary-foreground/70 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.span
              className="w-2 h-2 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            50 000+ cartes de fidélité générées
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-extrabold">FidéliPro</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-extrabold tracking-tight">Connexion</h1>
            <p className="text-muted-foreground mt-2">
              Accédez à votre tableau de bord
            </p>
          </div>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-xl font-semibold border-border/60 hover:bg-secondary/60 hover:border-primary/20 flex items-center gap-3 text-sm transition-all"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-background px-3">ou par email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl text-sm"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl pr-10 text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 font-bold text-base shadow-glow"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Se connecter"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Pas encore de compte ?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Créer un compte gratuitement
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
