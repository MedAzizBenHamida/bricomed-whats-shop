import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const orderItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  unit_price: z.number(),
  quantity: z.number().int().positive(),
});

const orderPayloadSchema = z.object({
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  customer_address: z.string().nullable().optional(),
  governorate: z.string().min(1),
  notes: z.string().nullable().optional(),
  total: z.number().nonnegative(),
  items: z.array(orderItemSchema),
});

export const createOrder = createServerFn({ method: "POST" })
  .validator(orderPayloadSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Insert order without manual ID — let Supabase/PostgreSQL generate the UUID.
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_address: data.customer_address ?? null,
        governorate: data.governorate,
        notes: data.notes ?? null,
        total: data.total,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "Erreur lors de la création de la commande");
    }

    // 2. Use the real Supabase-generated order.id for every order_item.
    const payload = data.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(payload);

    if (itemsError) {
      throw new Error(itemsError.message ?? "Erreur lors de l'enregistrement des articles");
    }

    return { orderId: order.id };
  });
