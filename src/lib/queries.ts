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
};

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");
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
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...(data as unknown as Product), price: Number((data as { price: number }).price) };
    },
  });
