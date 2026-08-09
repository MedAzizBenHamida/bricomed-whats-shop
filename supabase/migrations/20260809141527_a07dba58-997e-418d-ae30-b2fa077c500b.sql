-- helpers
CREATE OR REPLACE FUNCTION public.is_active_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role IN ('admin','super_admin') AND p.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role = 'super_admin' AND p.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;

-- first account becomes active super admin, others stay pending with no role
CREATE OR REPLACE FUNCTION public.promote_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin','super_admin')) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
    INSERT INTO public.profiles (id, username, email, status, approved_at)
    VALUES (NEW.id, split_part(COALESCE(NEW.email,'admin'),'@',1), NEW.email, 'active', now())
    ON CONFLICT (id) DO UPDATE SET status='active', approved_at=now(), email=EXCLUDED.email;
  ELSE
    INSERT INTO public.profiles (id, username, email, status)
    VALUES (NEW.id, split_part(COALESCE(NEW.email,'user'),'@',1), NEW.email, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- profiles policies
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_active_admin(auth.uid()));
DROP POLICY IF EXISTS "Super admins manage profiles" ON public.profiles;
CREATE POLICY "Super admins manage profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- user_roles readable by super admins
DROP POLICY IF EXISTS "Super admins read roles" ON public.user_roles;
CREATE POLICY "Super admins read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- app_settings write for super admins
DROP POLICY IF EXISTS "Super admins write settings" ON public.app_settings;
CREATE POLICY "Super admins write settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- tighten existing policies to active admins
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.is_active_admin(auth.uid())) WITH CHECK (public.is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.is_active_admin(auth.uid())) WITH CHECK (public.is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read orders" ON public.orders;
CREATE POLICY "Admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.is_active_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_active_admin(auth.uid())) WITH CHECK (public.is_active_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read order items" ON public.order_items;
CREATE POLICY "Admins read order items" ON public.order_items FOR SELECT TO authenticated USING (public.is_active_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins modify order items" ON public.order_items;
CREATE POLICY "Admins modify order items" ON public.order_items FOR UPDATE TO authenticated
  USING (public.is_active_admin(auth.uid())) WITH CHECK (public.is_active_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete order items" ON public.order_items;
CREATE POLICY "Admins delete order items" ON public.order_items FOR DELETE TO authenticated USING (public.is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read stock movements" ON public.stock_movements;
CREATE POLICY "Admins read stock movements" ON public.stock_movements FOR SELECT TO authenticated USING (public.is_active_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins insert stock movements" ON public.stock_movements;
CREATE POLICY "Admins insert stock movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (public.is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read logs" ON public.activity_logs;
CREATE POLICY "Admins read logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_active_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins insert logs" ON public.activity_logs;
CREATE POLICY "Admins insert logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = admin_id AND public.is_active_admin(auth.uid()));

-- stock functions must accept both roles
CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _change integer, _reason text, _type text DEFAULT NULL::text, _comment text DEFAULT NULL::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _new_qty integer; _old_qty integer; _name text; _user text; _mtype public.stock_movement_type;
BEGIN
  IF NOT public.is_active_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  _user := public.current_admin_username();
  _mtype := COALESCE(NULLIF(_type,'')::public.stock_movement_type, CASE WHEN _change > 0 THEN 'entry' ELSE 'manual' END);

  SELECT stock_quantity, name INTO _old_qty, _name FROM public.products WHERE id = _product_id;

  PERFORM set_config('app.skip_stock_trigger','on',true);
  UPDATE public.products
     SET stock_quantity = GREATEST(0, stock_quantity + _change), updated_at = now(),
         last_modified_at = now(), last_modified_by = _user
   WHERE id = _product_id
  RETURNING stock_quantity INTO _new_qty;
  PERFORM set_config('app.skip_stock_trigger','off',true);

  INSERT INTO public.stock_movements(product_id, change, reason, created_by, movement_type, stock_before, stock_after, admin_username, comment)
  VALUES (_product_id, _new_qty - _old_qty, _reason, auth.uid(), _mtype, _old_qty, _new_qty, _user, _comment);

  INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, old_value, new_value)
  VALUES (auth.uid(), _user, CASE WHEN _change > 0 THEN 'Entrée de stock' ELSE 'Sortie de stock' END,
          'Stock', _name, _product_id, _old_qty::text || ' u.', _new_qty::text || ' u. (' || _reason || ')');
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _item RECORD; _current_status public.order_status; _customer text; _user text; _before int; _after int; _ref text;
BEGIN
  IF NOT public.is_active_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  _user := public.current_admin_username();
  _ref := 'Commande #' || upper(substr(_order_id::text, 1, 8));

  SELECT status, customer_name INTO _current_status, _customer FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF _current_status IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _current_status <> 'pending' THEN RAISE EXCEPTION 'order not pending'; END IF;

  FOR _item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = _order_id LOOP
    IF _item.product_id IS NOT NULL THEN
      SELECT stock_quantity INTO _before FROM public.products WHERE id = _item.product_id;
      PERFORM set_config('app.skip_stock_trigger','on',true);
      UPDATE public.products SET stock_quantity = GREATEST(0, stock_quantity - _item.quantity), updated_at = now()
       WHERE id = _item.product_id RETURNING stock_quantity INTO _after;
      PERFORM set_config('app.skip_stock_trigger','off',true);
      INSERT INTO public.stock_movements(product_id, change, reason, order_id, created_by, movement_type, stock_before, stock_after, admin_username, reference)
      VALUES (_item.product_id, _after - _before, 'Vente', _order_id, auth.uid(), 'sale', _before, _after, _user, _ref);
    END IF;
  END LOOP;

  UPDATE public.orders SET status = 'confirmed', confirmed_at = now(), updated_at = now() WHERE id = _order_id;

  INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, old_value, new_value)
  VALUES (auth.uid(), _user, 'Confirmation commande', 'Commande', _customer, _order_id, 'pending', 'confirmed');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _customer text; _old public.order_status;
BEGIN
  IF NOT public.is_active_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT customer_name, status INTO _customer, _old FROM public.orders WHERE id = _order_id;
  UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = _order_id AND status = 'pending';
  INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, old_value, new_value)
  VALUES (auth.uid(), public.current_admin_username(), 'Annulation commande', 'Commande', _customer, _order_id, _old::text, 'cancelled');
END;
$$;

-- admin management RPCs (super admin only)
CREATE OR REPLACE FUNCTION public.admin_list_accounts()
RETURNS TABLE (id uuid, username text, full_name text, email text, role public.app_role, status public.admin_status, created_at timestamptz, approved_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.full_name, p.email,
         COALESCE((SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.id ORDER BY ur.role LIMIT 1), 'user')::public.app_role,
         p.status, p.created_at, p.approved_at
  FROM public.profiles p
  WHERE public.is_super_admin(auth.uid())
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_status(_user_id uuid, _status public.admin_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text; _old public.admin_status;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'cannot change own status'; END IF;
  IF _status <> 'active' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
     AND (SELECT count(*) FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id WHERE ur.role='super_admin' AND p.status='active') <= 1
  THEN RAISE EXCEPTION 'last super admin'; END IF;

  SELECT username, status INTO _name, _old FROM public.profiles WHERE id = _user_id;
  UPDATE public.profiles SET status = _status, updated_at = now(),
         approved_at = CASE WHEN _status = 'active' THEN now() ELSE approved_at END,
         approved_by = CASE WHEN _status = 'active' THEN auth.uid() ELSE approved_by END
   WHERE id = _user_id;

  IF _status = 'active' AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin');
  END IF;

  INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, old_value, new_value)
  VALUES (auth.uid(), public.current_admin_username(), 'Changement de statut', 'Administrateur', _name, _user_id, _old::text, _status::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text; _old text;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'cannot change own role'; END IF;
  IF _role <> 'super_admin' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
     AND (SELECT count(*) FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id WHERE ur.role='super_admin' AND p.status='active') <= 1
  THEN RAISE EXCEPTION 'last super admin'; END IF;

  SELECT username INTO _name FROM public.profiles WHERE id = _user_id;
  SELECT string_agg(role::text, ',') INTO _old FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);

  INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, old_value, new_value)
  VALUES (auth.uid(), public.current_admin_username(), 'Changement de rôle', 'Administrateur', _name, _user_id, COALESCE(_old,'—'), _role::text);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_accounts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_status(uuid, public.admin_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_status(uuid, public.admin_status) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role) TO authenticated, service_role;