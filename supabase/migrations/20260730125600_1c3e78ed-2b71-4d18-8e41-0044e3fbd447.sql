-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ACTIVITY LOGS
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  admin_username text NOT NULL DEFAULT 'système',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_name text,
  entity_id uuid,
  old_value text,
  new_value text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_logs_created_at_idx ON public.activity_logs (created_at DESC);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins insert logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = admin_id AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- PRODUCTS: last modification trace
ALTER TABLE public.products
  ADD COLUMN last_modified_by text,
  ADD COLUMN last_modified_at timestamptz;

-- helper to resolve current admin username
CREATE OR REPLACE FUNCTION public.current_admin_username()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT username FROM public.profiles WHERE id = auth.uid()), 'admin');
$$;
GRANT EXECUTE ON FUNCTION public.current_admin_username() TO authenticated, service_role;

-- log from SQL business functions
CREATE OR REPLACE FUNCTION public.confirm_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _item RECORD;
  _current_status public.order_status;
  _customer text;
  _user text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  _user := public.current_admin_username();

  SELECT status, customer_name INTO _current_status, _customer FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF _current_status IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _current_status <> 'pending' THEN RAISE EXCEPTION 'order not pending'; END IF;

  FOR _item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = _order_id LOOP
    IF _item.product_id IS NOT NULL THEN
      UPDATE public.products
         SET stock_quantity = GREATEST(0, stock_quantity - _item.quantity), updated_at = now()
       WHERE id = _item.product_id;
      INSERT INTO public.stock_movements(product_id, change, reason, order_id, created_by)
      VALUES (_item.product_id, -_item.quantity, 'Commande confirmée', _order_id, auth.uid());
    END IF;
  END LOOP;

  UPDATE public.orders SET status = 'confirmed', confirmed_at = now(), updated_at = now() WHERE id = _order_id;

  INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, old_value, new_value)
  VALUES (auth.uid(), _user, 'Confirmation commande', 'Commande', _customer, _order_id, 'pending', 'confirmed');
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _customer text;
  _old public.order_status;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT customer_name, status INTO _customer, _old FROM public.orders WHERE id = _order_id;
  UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = _order_id AND status = 'pending';
  INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, old_value, new_value)
  VALUES (auth.uid(), public.current_admin_username(), 'Annulation commande', 'Commande', _customer, _order_id, _old::text, 'cancelled');
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _change integer, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _new_qty integer;
  _old_qty integer;
  _name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT stock_quantity, name INTO _old_qty, _name FROM public.products WHERE id = _product_id;

  UPDATE public.products
     SET stock_quantity = GREATEST(0, stock_quantity + _change),
         updated_at = now(),
         last_modified_at = now(),
         last_modified_by = public.current_admin_username()
   WHERE id = _product_id
  RETURNING stock_quantity INTO _new_qty;

  INSERT INTO public.stock_movements(product_id, change, reason, created_by)
  VALUES (_product_id, _change, _reason, auth.uid());

  INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, old_value, new_value)
  VALUES (auth.uid(), public.current_admin_username(),
          CASE WHEN _change > 0 THEN 'Entrée de stock' ELSE 'Sortie de stock' END,
          'Stock', _name, _product_id, _old_qty::text || ' u.', _new_qty::text || ' u. (' || _reason || ')');
END;
$function$;