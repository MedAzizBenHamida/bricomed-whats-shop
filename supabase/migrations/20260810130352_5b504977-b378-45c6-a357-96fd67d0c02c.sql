CREATE OR REPLACE FUNCTION public.promote_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _username text;
BEGIN
  _username := split_part(COALESCE(NEW.email,'user'),'@',1);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin','super_admin')) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
    INSERT INTO public.profiles (id, username, email, status, approved_at)
    VALUES (NEW.id, _username, NEW.email, 'active', now())
    ON CONFLICT (id) DO UPDATE SET status='active', approved_at=now(), email=EXCLUDED.email;

    INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, new_value)
    VALUES (NEW.id, _username, 'Création d''un compte administrateur', 'Administrateur', _username, NEW.id, 'super_admin — actif');
  ELSE
    INSERT INTO public.profiles (id, username, email, status)
    VALUES (NEW.id, _username, NEW.email, 'pending')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, new_value)
    VALUES (NEW.id, _username, 'Création d''un compte administrateur', 'Administrateur', _username, NEW.id, 'En attente d''approbation');
  END IF;
  RETURN NEW;
END;
$function$;