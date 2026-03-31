# FidéliPro — CLAUDE.md

> SaaS de fidélité digitale pour commerçants français. Cartes Apple Wallet / Google Wallet, notifications push, ciblage marketing, géofencing.

---

## Stack technique

- **Frontend** : React 18 + TypeScript + Vite
- **UI** : Tailwind CSS + shadcn/ui + Framer Motion
- **Backend** : Supabase (auth, DB PostgreSQL, Edge Functions)
- **Paiement** : Stripe (abonnements récurrents)
- **Fonts** : Space Grotesk (`font-display`) + Inter (body)
- **Router** : React Router v6
- **State/Data** : React Query (`useAuth`, `useBusiness`, hooks custom)
- **QR Code** : `qrcode.react` (QRCodeSVG)
- **Geocoding** : Nominatim OpenStreetMap API

---

## Architecture des dossiers

```
src/
├── pages/
│   ├── Index.tsx              — Landing page (sections composants)
│   ├── Login.tsx              — Connexion email + Google OAuth
│   ├── Register.tsx           — Inscription 2 étapes : plan → compte
│   ├── Onboarding.tsx         — Post-OAuth : collecte infos commerce
│   ├── Dashboard.tsx          — Vue principale dashboard
│   └── dashboard/
│       ├── ClientsPage.tsx    — Liste clients, filtres, fiche détail
│       ├── CampaignsPage.tsx  — Campagnes push + ciblage avancé
│       ├── RewardsPage.tsx    — Gestion récompenses
│       ├── CustomizePage.tsx  — Personnalisation carte (aperçu live)
│       ├── ScannerPage.tsx    — QR scanner mobile
│       ├── CheckoutPage.tsx   — Paiement Stripe
│       └── SettingsPage.tsx   — Compte, géofencing, automatisations, abonnement
├── components/
│   ├── LoyaltyCard.tsx        — Composant carte unifié (Apple Wallet style)
│   ├── landing/               — Sections landing page
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── SocialProofSection.tsx
│   │   ├── PricingSection.tsx
│   │   ├── FaqSection.tsx
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── dashboard/
│       ├── DashboardLayout.tsx
│       ├── GeofenceMap.tsx
│       └── StatsCard.tsx
├── hooks/
│   ├── useAuth.ts             — user + business courant
│   ├── useBusiness.ts
│   └── useSiteSettings.ts     — Contenu editable landing (Supabase)
├── lib/
│   └── stripePlans.ts         — Config plans Stripe (IDs + prix)
└── integrations/supabase/
    └── client.ts              — Client Supabase initialisé
```

---

## Routes (App.tsx)

| Path | Composant | Accès |
|---|---|---|
| `/` | Index (landing) | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/onboarding` | Onboarding | Post-OAuth |
| `/dashboard` | Dashboard | Auth |
| `/dashboard/clients` | ClientsPage | Auth |
| `/dashboard/campaigns` | CampaignsPage | Auth |
| `/dashboard/rewards` | RewardsPage | Auth |
| `/dashboard/customize` | CustomizePage | Auth |
| `/dashboard/scanner` | ScannerPage | Auth |
| `/dashboard/checkout` | CheckoutPage | Auth |
| `/dashboard/settings` | SettingsPage | Auth |
| `/admin` | AdminLayout | super_admin |

---

## Flux d'inscription (sans essai gratuit)

1. `/register` → Step 1 : sélection plan (Starter/Pro/Enterprise)
2. `/register` → Step 2 : Google OAuth **ou** email+password
3. OAuth redirige vers `/onboarding?plan={plan}`
4. `/onboarding` : formulaire obligatoire (nom commerce, catégorie, adresse, téléphone) → crée `businesses` row
5. Redirige vers `/dashboard/checkout?plan={plan}` → paiement Stripe immédiat

---

## Plans Stripe (`src/lib/stripePlans.ts`)

| Plan | Prix | Price ID |
|---|---|---|
| starter | 29€/mois | `price_1TGQcwFQlLT8Im0J1OI53niu` |
| pro | 79€/mois | `price_1TGQdDFQlLT8Im0J7YQ9OWuG` |
| enterprise | 199€/mois | `price_1TGQdVFQlLT8Im0JMB3Y4hmT` |

---

## Composant LoyaltyCard (`src/components/LoyaltyCard.tsx`)

Style Apple Wallet. Props principales :

```typescript
interface LoyaltyCardProps {
  businessName: string;
  customerName: string;
  points: number;
  maxPoints: number;
  level: "bronze" | "silver" | "gold";
  cardId: string;
  logoUrl?: string;
  accentColor?: string;       // couleur principale
  secondaryColor?: string;    // dégradé secondaire
  rewardDescription?: string;
  rewardsEarned?: number;
  promoText?: string;         // badge offre du jour (Zap icon)
  showQr?: boolean;
  showPoints?: boolean;
  showCustomerName?: boolean;
  showExpiration?: boolean;
  showRewardsPreview?: boolean;
  cardStyle?: "classic" | "luxury" | "coffee" | "barber" | "restaurant" | "neon";
  cardBgType?: "gradient" | "solid" | "image";
  cardBgImageUrl?: string;
}
```

Éléments visuels : texture diagonale Apple Wallet, QR blanc, grand nom client (text-2xl), barre de progression animée, badge niveau.

---

## Automatisations (SettingsPage)

Colonnes ajoutées dans `businesses` (migration `20260331200000_automation_settings.sql`) :

| Colonne | Type | Défaut |
|---|---|---|
| `birthday_notif_enabled` | boolean | false |
| `birthday_notif_message` | text | "Joyeux anniversaire ! Un cadeau vous attend 🎂" |
| `welcome_push_enabled` | boolean | true |
| `welcome_push_message` | text | "Bienvenue ! Votre carte de fidélité est prête 🎉" |
| `vip_auto_enabled` | boolean | false |
| `vip_auto_threshold` | integer | 50 |

---

## Géofencing (SettingsPage)

Colonnes dans `businesses` :
- `geofence_enabled`, `geofence_radius` (50–2000m), `geofence_message` (80 chars max)
- `latitude`, `longitude`, `address`
- `geofence_time_start`, `geofence_time_end`
- `geofence_satellite_points` (JSONB, multi-adresses)

Geocoding : Nominatim OSM (debounce 400ms, countrycodes=fr).
Push Apple Wallet : Edge Function `wallet-push` via APNs.

---

## Campagnes — Ciblage avancé (CampaignsPage)

Segments prédéfinis : `all`, `active` (7j), `inactive` (30j+), `vip` (gold), `close_to_reward` (≤2pts), `nearby`.

Filtres avancés :
```typescript
interface AdvancedFilter {
  level: "all" | "bronze" | "silver" | "gold";
  inactiveDays: number;   // 0 = tous
  minPoints: number;
  maxPoints: number;
  city: string;
}
```

Compteur live calculé côté client (`computeAdvancedCount`) sur cache `allCustomers` — pas d'appel DB supplémentaire.

---

## Contenu landing editable

Table Supabase `site_settings` (clé/valeur). Hook `useSiteSettings()`. Colonnes utilisées dans HeroSection :
`hero_headline`, `hero_headline_gradient`, `hero_subtitle`, `hero_cta_primary`, `hero_cta_secondary`, `hero_badge`, `hero_stat_1/2/3`.

---

## Conventions de code

- Toujours `"fr-FR"` pour les dates et libellés
- `toast.success/error` via `sonner` pour tous les feedbacks
- `(business as any).column` pour les colonnes ajoutées par migrations (pas encore dans les types Supabase générés)
- Pas d'essai gratuit — `subscription_status: "inactive"` à la création
- Rôle `super_admin` dans table `user_roles` → redirect `/admin` au login
- Animations : `framer-motion` pour les transitions, `animate-in slide-in-from-top-2` Tailwind pour les sections conditionnelles

---

## Commandes utiles

```bash
npm run dev       # dev server
npm run build     # build prod (doit passer sans erreur)
```

Build attendu : `✓ 3047 modules — ~9s`, chunk warning >500KB pre-existant (normal).
