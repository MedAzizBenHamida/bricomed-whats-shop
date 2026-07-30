import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  short_description: string | null;
  price: number;
  category_id: string | null;
  images: string[];
  features: string[];
  in_stock: boolean;
  featured: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  last_modified_by?: string | null;
  last_modified_at?: string | null;
};


export type OrderStatus = "pending" | "confirmed" | "cancelled";

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
};

export type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  notes: string | null;
  status: OrderStatus;
  total: number;
  created_at: string;
  confirmed_at: string | null;
  order_items?: OrderItem[];
};

export type StockMovement = {
  id: string;
  product_id: string;
  change: number;
  reason: string;
  order_id: string | null;
  created_at: string;
};

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase.from("categories").select("*").order("display_order");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as Product[]).map((p) => ({ ...p, price: Number(p.price) }));
  },
});

export const productBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...(data as unknown as Product), price: Number((data as { price: number }).price) };
    },
  });

export const ordersQuery = queryOptions({
  queryKey: ["orders"],
  queryFn: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as Order[]).map((o) => ({
      ...o,
      total: Number(o.total),
      order_items: (o.order_items ?? []).map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
    }));
  },
});

export const stockMovementsQuery = queryOptions({
  queryKey: ["stock_movements"],
  queryFn: async (): Promise<StockMovement[]> => {
    const { data, error } = await supabase
      .from("stock_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as StockMovement[];
  },
});
