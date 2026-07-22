
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  short_description text,
  price numeric(10,3) NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  images text[] NOT NULL DEFAULT '{}',
  features text[] NOT NULL DEFAULT '{}',
  in_stock boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read products" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed categories
INSERT INTO public.categories (slug, name, icon, display_order) VALUES
  ('outillage', 'Outillage', 'Wrench', 1),
  ('electricite', 'Électricité', 'Zap', 2),
  ('plomberie', 'Plomberie', 'Droplet', 3),
  ('peinture', 'Peinture', 'Paintbrush', 4),
  ('jardinage', 'Jardinage', 'Sprout', 5),
  ('quincaillerie-generale', 'Quincaillerie générale', 'Package', 6),
  ('visserie', 'Visserie', 'Cog', 7),
  ('serrurerie', 'Serrurerie', 'Lock', 8);

-- Seed some products
WITH c AS (SELECT id, slug FROM public.categories)
INSERT INTO public.products (slug, name, description, short_description, price, category_id, images, features, featured) VALUES
  ('marteau-charpentier', 'Marteau de charpentier 500g', 'Marteau robuste avec manche ergonomique en fibre de verre, idéal pour les travaux de charpente et de bricolage quotidien.', 'Manche fibre de verre, tête acier forgé', 25.000, (SELECT id FROM c WHERE slug='outillage'), ARRAY['https://images.unsplash.com/photo-1586864387789-628af9feed72?w=800'], ARRAY['Poids: 500g', 'Manche ergonomique', 'Tête en acier forgé'], true),
  ('tournevis-set-6', 'Set de 6 tournevis multi-usage', 'Ensemble complet de tournevis plats et cruciformes avec manche antidérapant.', 'Plats + cruciformes, manche antidérapant', 18.500, (SELECT id FROM c WHERE slug='outillage'), ARRAY['https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800'], ARRAY['6 pièces', 'Acier chrome-vanadium', 'Manche caoutchouc'], true),
  ('cle-anglaise-250', 'Clé anglaise 250mm', 'Clé à molette professionnelle, mâchoire large pour usage intensif.', 'Mâchoire 30mm, longueur 250mm', 32.000, (SELECT id FROM c WHERE slug='outillage'), ARRAY['https://images.unsplash.com/photo-1581147036324-c1c9b76e05f4?w=800'], ARRAY['Longueur 250mm', 'Ouverture max 30mm', 'Acier trempé'], false),
  ('cable-electrique-25', 'Câble électrique 2.5mm² (100m)', 'Câble électrique souple pour installations domestiques, conforme aux normes.', 'Rouleau de 100m, section 2.5mm²', 85.000, (SELECT id FROM c WHERE slug='electricite'), ARRAY['https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=800'], ARRAY['Section 2.5mm²', 'Longueur 100m', 'Norme NF C 32-201'], true),
  ('interrupteur-simple', 'Interrupteur simple blanc', 'Interrupteur va-et-vient, design moderne et pose facile.', 'Va-et-vient, 10A', 6.500, (SELECT id FROM c WHERE slug='electricite'), ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'], ARRAY['10A / 250V', 'Va-et-vient', 'Plaque blanche'], false),
  ('robinet-mitigeur', 'Mitigeur lavabo chromé', 'Robinet mitigeur monocommande, chromé brillant, économie d''eau intégrée.', 'Chromé, cartouche céramique', 68.000, (SELECT id FROM c WHERE slug='plomberie'), ARRAY['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800'], ARRAY['Cartouche céramique 35mm', 'Aérateur anticalcaire', 'Garantie 5 ans'], true),
  ('tuyau-pvc-32', 'Tuyau PVC évacuation Ø32mm (2m)', 'Tuyau d''évacuation en PVC rigide, résistant aux eaux usées.', 'Diamètre 32mm, longueur 2m', 12.000, (SELECT id FROM c WHERE slug='plomberie'), ARRAY['https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800'], ARRAY['Ø32mm', 'Longueur 2m', 'Norme NF'], false),
  ('peinture-blanche-10l', 'Peinture murale blanche mate 10L', 'Peinture acrylique lessivable pour murs et plafonds intérieurs.', 'Acrylique mate, 10L, ~100m²', 95.000, (SELECT id FROM c WHERE slug='peinture'), ARRAY['https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800'], ARRAY['10 litres', 'Rendement ~100m²', 'Séchage 2h'], true),
  ('rouleau-peinture', 'Rouleau peinture 180mm + manche', 'Kit rouleau anti-goutte avec manche télescopique.', 'Poils 12mm, manche télescopique', 14.000, (SELECT id FROM c WHERE slug='peinture'), ARRAY['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800'], ARRAY['Largeur 180mm', 'Poils 12mm', 'Manche 60cm extensible'], false),
  ('secateur-pro', 'Sécateur professionnel', 'Sécateur à lames franches en acier, poignée ergonomique.', 'Lame acier, poignée souple', 28.000, (SELECT id FROM c WHERE slug='jardinage'), ARRAY['https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800'], ARRAY['Coupe Ø25mm', 'Lame acier trempé', 'Verrou de sécurité'], false),
  ('tuyau-arrosage-25', 'Tuyau d''arrosage 25m', 'Tuyau anti-torsion avec raccords rapides inclus.', '25m, anti-torsion, raccords inclus', 45.000, (SELECT id FROM c WHERE slug='jardinage'), ARRAY['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800'], ARRAY['25 mètres', '3 couches', 'Raccords laiton'], true),
  ('boite-vis-500', 'Assortiment 500 vis bois', 'Coffret de 500 vis à bois têtes fraisées, tailles variées.', '500 pièces, tailles assorties', 22.000, (SELECT id FROM c WHERE slug='visserie'), ARRAY['https://images.unsplash.com/photo-1609205807107-e8ec2120f9de?w=800'], ARRAY['500 pièces', 'Acier zingué', 'Tailles 3x16 à 5x50'], false),
  ('chevilles-molly-50', 'Chevilles Molly M6 (x50)', 'Chevilles métalliques pour plaques de plâtre, boîte de 50.', 'M6, plaques de plâtre', 15.500, (SELECT id FROM c WHERE slug='visserie'), ARRAY['https://images.unsplash.com/photo-1581147036324-c1c9b76e05f4?w=800'], ARRAY['50 pièces', 'M6', 'Charge max 25kg'], false),
  ('serrure-3-points', 'Serrure de sûreté 3 points', 'Serrure haute sécurité 3 points, cylindre européen.', 'Cylindre européen, 3 clés', 145.000, (SELECT id FROM c WHERE slug='serrurerie'), ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'], ARRAY['3 points', 'Cylindre 30x30mm', '3 clés fournies'], true),
  ('cadenas-inox-50', 'Cadenas inox 50mm', 'Cadenas anti-corrosion en acier inoxydable, anse trempée.', 'Anse 50mm inox, 2 clés', 24.000, (SELECT id FROM c WHERE slug='serrurerie'), ARRAY['https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800'], ARRAY['Anse 50mm', 'Inox 304', '2 clés'], false),
  ('escabeau-4-marches', 'Escabeau alu 4 marches', 'Escabeau léger en aluminium, plateforme antidérapante.', 'Aluminium, 4 marches, 1.2m', 78.000, (SELECT id FROM c WHERE slug='quincaillerie-generale'), ARRAY['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800'], ARRAY['4 marches', 'Hauteur 1.2m', 'Charge max 150kg'], false);
