ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

DO $$ BEGIN
  CREATE TYPE public.admin_status AS ENUM ('pending','active','disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.admin_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read settings" ON public.app_settings;
CREATE POLICY "Public read settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS app_settings_set_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_set_updated_at BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (key, value) VALUES
  ('shop', '{"name":"BricoMed","phone":"+21692841145","whatsapp":"+21692841145","email":"contact@quicaillerie.tn","address":"Quicaillerie, Route de Médenine, 8FXV+FPH, Médenine, Tunisie","hours":{"monfri":"08:00 – 18:00","sat":"08:00 – 13:00","sun":"Fermé"}}'::jsonb),
  ('stock', '{"low_stock_threshold":5}'::jsonb)
ON CONFLICT (key) DO NOTHING;

UPDATE public.profiles p SET status = 'active', approved_at = now()
WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin');