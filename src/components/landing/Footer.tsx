import { CreditCard } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function Footer() {
  const { data: settings } = useSiteSettings();

  const tagline = settings?.footer_tagline || "La fidélité digitale pour les commerces ambitieux.";
  const legalUrl = settings?.footer_legal_url || "/legal";
  const privacyUrl = settings?.footer_privacy_url || "/privacy";
  const contactUrl = settings?.footer_contact_url || "mailto:contact@fidelispro.com";
  const instagram = settings?.social_instagram || "";
  const linkedin = settings?.social_linkedin || "";

  return (
    <footer className="py-16 border-t border-border/50 bg-secondary/30">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">FidéliPro</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{tagline}</p>
            {/* Social links */}
            <div className="flex gap-3 mt-4">
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Instagram
                </a>
              )}
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">Liens utiles</h4>
            <ul className="space-y-2">
              <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Tarifs</a></li>
              <li><a href="#faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
              <li><a href={contactUrl} className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">Légal</h4>
            <ul className="space-y-2">
              <li><a href={legalUrl} className="text-sm text-muted-foreground hover:text-primary transition-colors">Mentions légales</a></li>
              <li><a href={privacyUrl} className="text-sm text-muted-foreground hover:text-primary transition-colors">Politique de confidentialité</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FidéliPro. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
