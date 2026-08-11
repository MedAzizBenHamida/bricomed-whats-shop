DROP FUNCTION IF EXISTS public.adjust_stock(uuid, integer, text);

CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _change integer, _reason text, _type text DEFAULT NULL::text, _comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _new_qty integer; _old_qty integer; _name text; _user text; _mtype public.stock_movement_type;
BEGIN
  IF NOT public.is_active_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  _user := public.current_admin_username();

  _mtype := COALESCE(
    NULLIF(_type, '')::public.stock_movement_type,
    (CASE WHEN _change > 0 THEN 'entry' ELSE 'manual' END)::public.stock_movement_type
  );

  SELECT stock_quantity, name INTO _old_qty, _name FROM public.products WHERE id = _product_id;
  IF _old_qty IS NULL THEN RAISE EXCEPTION 'product not found'; END IF;

  PERFORM set_config('app.skip_stock_trigger','on',true);
  UPDATE public.products
     SET stock_quantity = GREATEST(0, stock_quantity + _change), updated_at = now(),
         last_modified_at = now(), last_modified_by = _user
   WHERE id = _product_id
  RETURNING stock_quantity INTO _new_qty;
  PERFORM set_config('app.skip_stock_trigger','off',true);

  IF _new_qty = _old_qty THEN RETURN; END IF;

  INSERT INTO public.stock_movements(product_id, change, reason, created_by, movement_type, stock_before, stock_after, admin_username, comment)
  VALUES (_product_id, _new_qty - _old_qty, _reason, auth.uid(), _mtype, _old_qty, _new_qty, _user, _comment);

  INSERT INTO public.activity_logs(admin_id, admin_username, action, entity_type, entity_name, entity_id, old_value, new_value)
  VALUES (auth.uid(), _user,
          CASE WHEN _new_qty > _old_qty THEN 'Entrée de stock' ELSE 'Sortie de stock' END,
          'Stock', _name, _product_id, _old_qty::text || ' u.',
          _new_qty::text || ' u. (' || _reason || ')');
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_stock_quantity(_product_id uuid, _new_quantity integer, _reason text, _type text DEFAULT 'inventory'::text, _comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _old_qty integer;
BEGIN
  SELECT stock_quantity INTO _old_qty FROM public.products WHERE id = _product_id;
  IF _old_qty IS NULL THEN RAISE EXCEPTION 'product not found'; END IF;
  PERFORM public.adjust_stock(_product_id, GREATEST(0,_new_quantity) - _old_qty, _reason, _type, _comment);
END;
$function$;