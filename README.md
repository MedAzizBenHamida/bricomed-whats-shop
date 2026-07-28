# BricoMed — Quincaillerie (React + TanStack Start + Supabase)

Site vitrine de quincaillerie avec catalogue, panier local, commande via WhatsApp
et espace d'administration (produits, catégories, stock, commandes, statistiques).

Le projet est **100 % autonome** : il s'exécute dans VS Code avec Node.js et un
projet Supabase, sans dépendance à l'environnement Lovable.

## Stack

- React 19 + TypeScript
- TanStack Start (SSR) + TanStack Router (routage par fichiers) + TanStack Query
- Vite 8, Tailwind CSS v4, shadcn/ui (Radix), lucide-react, recharts, sonner
- Supabase (PostgreSQL, Auth, RLS)

## Structure

```
src/
  routes/                 pages (routage par fichiers TanStack Router)
    __root.tsx            layout global (header, footer, providers)
    index.tsx             accueil
    catalogue.tsx         catalogue (recherche, filtres, tri)
    produit.$slug.tsx     détail produit
    a-propos.tsx contact.tsx auth.tsx admin.tsx
  components/
    site/                 Header, Footer, ProductCard, CartSheet
    admin/                StatsDashboard, OrdersTab, StockTab
    ui/                   composants shadcn/ui
  lib/                    cart-context, queries (TanStack Query), constants, utils
  integrations/supabase/  client navigateur, client serveur, middleware auth, types
  styles.css              design system Tailwind v4 (tokens de couleur, polices)
supabase/
  migrations/             schéma SQL complet : tables, RLS, policies, fonctions, seed
  config.toml
```

## 1. Installation

Prérequis : Node.js 20+ et npm.

```sh
npm install
```

## 2. Configuration de Supabase

1. Créez un projet sur https://supabase.com.
2. Copiez `.env.example` en `.env` et renseignez l'URL du projet, la clé
   publishable (anon) et, si besoin, la clé `service_role` (secrète).
3. Appliquez le schéma. Avec la CLI Supabase :

```sh
npm i -g supabase
supabase login
supabase link --project-ref <votre-project-ref>
supabase db push
```

Sans la CLI : ouvrez le SQL Editor du dashboard Supabase et exécutez, **dans
l'ordre chronologique des noms de fichiers**, chaque script de
`supabase/migrations/`.

Ces migrations créent :

- `categories`, `products` (avec `stock_quantity`, `low_stock_threshold`, `in_stock`)
- `orders`, `order_items`, `stock_movements`
- `user_roles` + enum `app_role` (rôles séparés de la table utilisateurs)
- les politiques RLS et les `GRANT` associés
- les fonctions `has_role`, `confirm_order`, `cancel_order`, `adjust_stock`,
  `sync_product_in_stock`, `promote_first_admin`
- les catégories de démonstration

4. Auth : dans Authentication → Providers, activez Email. Ajoutez
   `http://localhost:5173` dans les URLs de redirection autorisées.
5. Premier administrateur : inscrivez-vous sur `/auth`, puis exécutez en SQL

```sql
insert into public.user_roles (user_id, role)
values ('<uuid-de-votre-utilisateur>', 'admin');
```

6. (Optionnel) Régénérer les types TypeScript :

```sh
supabase gen types typescript --project-id <project-ref> > src/integrations/supabase/types.ts
```

## 3. Lancer en développement

```sh
npm run dev
```

L'application démarre sur http://localhost:5173 (ou le port affiché).

## 4. Build de production

```sh
npm run build
npm run preview
```

La sortie se trouve dans `.output/` (build Nitro). Elle est déployable sur
Cloudflare Workers/Pages, Vercel, Netlify ou un serveur Node. Pensez à définir
les mêmes variables d'environnement sur la plateforme de déploiement.

Autres scripts : `npm run lint`, `npm run format`, `npm run build:dev`.

## Notes

- **WhatsApp** : le lien est construit dans `src/lib/constants.ts` (`waLink`) au
  format `https://wa.me/<numero>?text=<message encodé>` et ouvert via
  `window.open(url, "_blank")`. WhatsApp refuse d'être chargé dans une iframe
  (`frame-ancestors`), donc le bouton doit être testé dans un onglet réel — en
  local et en production, cela fonctionne normalement.
- `src/lib/lovable-error-reporting.ts` et `src/lib/error-capture.ts` ne font rien
  hors de l'éditeur ; vous pouvez les supprimer et retirer leurs appels dans
  `src/routes/__root.tsx` et `src/server.ts` si vous le souhaitez.
- `@lovable.dev/vite-tanstack-config` (dans `vite.config.ts`) est un simple
  paquet npm public qui regroupe les plugins Vite standards (TanStack Start,
  React, Tailwind, tsconfig-paths, Nitro). Il s'installe et fonctionne comme
  n'importe quelle dépendance. Pour l'enlever complètement, remplacez
  `vite.config.ts` par une configuration Vite classique déclarant ces plugins.
- `.env` ne doit jamais être commité ; seul `.env.example` l'est.
