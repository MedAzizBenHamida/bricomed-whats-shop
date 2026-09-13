# Déployer sur Vercel

## 1. Pousser le code sur GitHub
Le projet est déjà synchronisé avec GitHub depuis Lovable.

## 2. Créer le projet sur Vercel
1. https://vercel.com → **Add New → Project** → importer le dépôt GitHub.
2. Framework Preset : **Other**
3. Build Command : `npm run build`
4. Output Directory : laisser vide (Nitro génère `.vercel/output` automatiquement)
5. Install Command : `npm install`

## 3. Variables d'environnement (Settings → Environment Variables)
À définir pour **Production** ET **Preview** :

| Nom | Valeur |
| --- | --- |
| `VITE_SUPABASE_URL` | https://yjqrykhlrpdaiuebanof.supabase.co |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sb_publishable_8GBTQ_q9isVN0cNcdB9aQg_byIFfSaL |
| `VITE_SUPABASE_PROJECT_ID` | yjqrykhlrpdaiuebanof |
| `SUPABASE_URL` | https://yjqrykhlrpdaiuebanof.supabase.co |
| `SUPABASE_PUBLISHABLE_KEY` | sb_publishable_8GBTQ_q9isVN0cNcdB9aQg_byIFfSaL |

(La clé publishable est publique, pas de risque à la mettre ici.)

## 4. Déployer
Clique sur **Deploy**. Chaque `git push` redéclenche un déploiement.

## 5. Domaine privé
1. Achète le domaine (OVH, Namecheap, GoDaddy…).
2. Vercel → Project → **Settings → Domains → Add** → saisis ton domaine.
3. Ajoute chez ton registrar les enregistrements DNS indiqués par Vercel
   (en général `A @ 76.76.21.21` et `CNAME www → cname.vercel-dns.com`).
4. Attends la propagation DNS (quelques minutes à 24 h). Le HTTPS est automatique.

## Important
La base de données, l'authentification et les images restent hébergées sur le
backend existant. Les migrations de base de données continuent d'être gérées
depuis Lovable.
