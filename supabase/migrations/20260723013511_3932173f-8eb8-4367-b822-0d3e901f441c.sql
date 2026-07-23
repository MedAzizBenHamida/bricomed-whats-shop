
-- Enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- Extend products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

-- Sync in_stock with stock_quantity
CREATE OR REPLACE FUNCTION public.sync_product_in_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.in_stock := NEW.stock_quantity > 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_in_stock ON public.products;
CREATE TRIGGER trg_sync_product_in_stock
BEFORE INSERT OR UPDATE OF stock_quantity ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_in_stock();

-- Backfill existing rows: put reasonable stock if in_stock true
UPDATE public.products SET stock_quantity = 20 WHERE in_stock = true AND stock_quantity = 0;

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  notes text,
  status public.order_status NOT NULL DEFAULT 'pending',
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read orders" ON public.orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT INSERT ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create order items" ON public.order_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins modify order items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins delete order items" ON public.order_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Stock movements
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change integer NOT NULL,
  reason text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage stock movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- updated_at trigger for orders
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Adjust stock RPC (admin only via RLS-bypassing security definer, checks role)
CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _change integer, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_qty integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.products
     SET stock_quantity = GREATEST(0, stock_quantity + _change),
         updated_at = now()
   WHERE id = _product_id
  RETURNING stock_quantity INTO _new_qty;

  INSERT INTO public.stock_movements(product_id, change, reason, created_by)
  VALUES (_product_id, _change, _reason, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, integer, text) TO authenticated;

-- Confirm order: decrement stock and record movements
CREATE OR REPLACE FUNCTION public.confirm_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item RECORD;
  _current_status public.order_status;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT status INTO _current_status FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF _current_status IS NULL THEN
    RAISE EXCEPTION 'order not found';
  END IF;
  IF _current_status <> 'pending' THEN
    RAISE EXCEPTION 'order not pending';
  END IF;

  FOR _item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = _order_id LOOP
    IF _item.product_id IS NOT NULL THEN
      UPDATE public.products
         SET stock_quantity = GREATEST(0, stock_quantity - _item.quantity),
             updated_at = now()
       WHERE id = _item.product_id;

      INSERT INTO public.stock_movements(product_id, change, reason, order_id, created_by)
      VALUES (_item.product_id, -_item.quantity, 'Commande confirmée', _order_id, auth.uid());
    END IF;
  END LOOP;

  UPDATE public.orders
     SET status = 'confirmed', confirmed_at = now(), updated_at = now()
   WHERE id = _order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = _order_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated;
