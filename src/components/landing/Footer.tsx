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
    <footer className="border-t border-border/40 bg-secondary/20" id="contact">
      <div className="container py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-sm">
                <CreditCard className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">FidéliPro</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">{tagline}</p>

            {/* Social links */}
            <div className="flex gap-3 mt-5">
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}
              {linkedin && (
                <a
                  href={linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Produit */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-5 text-foreground">Produit</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Fonctionnalités</a></li>
              <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Tarifs</a></li>
              <li><a href="#testimonials" className="text-sm text-muted-foreground hover:text-primary transition-colors">Témoignages</a></li>
              <li><a href="#faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-5 text-foreground">Entreprise</h4>
            <ul className="space-y-3">
              <li><a href={contactUrl} className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
              <li><a href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">S'inscrire</a></li>
              <li><a href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">Se connecter</a></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-5 text-foreground">Légal</h4>
            <ul className="space-y-3">
              <li><a href={legalUrl} className="text-sm text-muted-foreground hover:text-primary transition-colors">Mentions légales</a></li>
              <li><a href={privacyUrl} className="text-sm text-muted-foreground hover:text-primary transition-colors">Confidentialité</a></li>
              <li><span className="text-xs text-muted-foreground/60">Conforme RGPD</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FidéliPro. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground">
            Fait avec ❤️ pour les commerçants français
          </p>
        </div>
      </div>
    </footer>
  );
}
