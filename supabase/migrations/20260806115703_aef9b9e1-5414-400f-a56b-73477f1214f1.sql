
DO $$ BEGIN
  CREATE TYPE public.stock_movement_type AS ENUM ('entry','sale','manual','inventory','return');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS movement_type public.stock_movement_type NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS stock_before integer,
  ADD COLUMN IF NOT EXISTS stock_after integer,
  ADD COLUMN IF NOT EXISTS admin_username text,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS comment text;

UPDATE public.stock_movements SET movement_type = CASE WHEN change > 0 THEN 'entry'::public.stock_movement_type WHEN order_id IS NOT NULL THEN 'sale'::public.stock_movement_type ELSE 'manual'::public.stock_movement_type END
WHERE movement_type = 'manual';

-- read-only history: admins can read + insert only
DROP POLICY IF EXISTS "Admins manage stock movements" ON public.stock_movements;
CREATE POLICY "Admins read stock movements" ON public.stock_movements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins insert stock movements" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

-- adjust_stock with type + comment
CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _change integer, _reason text, _type text DEFAULT NULL, _comment text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _new_qty integer; _old_qty integer; _name text; _user text; _mtype public.stock_movement_type;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
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
$function$;

-- set absolute quantity (inventory / manual correction)
CREATE OR REPLACE FUNCTION public.set_stock_quantity(_product_id uuid, _new_quantity integer, _reason text, _type text DEFAULT 'inventory', _comment text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _old_qty integer;
BEGIN
  SELECT stock_quantity INTO _old_qty FROM public.products WHERE id = _product_id;
  PERFORM public.adjust_stock(_product_id, GREATEST(0,_new_quantity) - _old_qty, _reason, _type, _comment);
END;
$function$;

-- confirm_order records sale movements with before/after and reference
CREATE OR REPLACE FUNCTION public.confirm_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _item RECORD; _current_status public.order_status; _customer text; _user text; _before int; _after int; _ref text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
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
$function$;

-- catch direct stock edits (product form)
CREATE OR REPLACE FUNCTION public.log_product_stock_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _user text;
BEGIN
  IF current_setting('app.skip_stock_trigger', true) = 'on' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity THEN
    _user := public.current_admin_username();
    INSERT INTO public.stock_movements(product_id, change, reason, created_by, movement_type, stock_before, stock_after, admin_username, comment)
    VALUES (NEW.id, NEW.stock_quantity - OLD.stock_quantity, 'Modification manuelle', auth.uid(), 'manual', OLD.stock_quantity, NEW.stock_quantity, _user, 'Modifié depuis la fiche produit');
  ELSIF TG_OP = 'INSERT' AND NEW.stock_quantity > 0 THEN
    _user := public.current_admin_username();
    INSERT INTO public.stock_movements(product_id, change, reason, created_by, movement_type, stock_before, stock_after, admin_username, comment)
    VALUES (NEW.id, NEW.stock_quantity, 'Stock initial', auth.uid(), 'entry', 0, NEW.stock_quantity, _user, 'Création du produit');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_log_product_stock_change ON public.products;
CREATE TRIGGER trg_log_product_stock_change AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_product_stock_change();

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id, created_at DESC);
