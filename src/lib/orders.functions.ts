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
    const { createClient } = await import("@supabase/supabase-js");
    type DatabaseTypes = typeof import("@/integrations/supabase/types");

    const url = process.env["SUPABASE_URL"];
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const key = serviceKey ?? publishableKey;

    if (!url || !key) {
      throw new Error("Configuration Supabase manquante côté serveur (SUPABASE_URL / clé).");
    }

    const client = createClient<DatabaseTypes["Database"]>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    // The id is generated server-side (valid UUID) so no SELECT-after-INSERT is
    // needed — anon RLS allows INSERT on orders but not SELECT.
    const orderId = crypto.randomUUID();

    const { error: orderError } = await client.from("orders").insert({
      id: orderId,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address ?? null,
      governorate: data.governorate,
      notes: data.notes ?? null,
      total: data.total,
    });

    if (orderError) {
      throw new Error(orderError.message ?? "Erreur lors de la création de la commande");
    }

    const payload = data.items.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await client.from("order_items").insert(payload);

    if (itemsError) {
      throw new Error(itemsError.message ?? "Erreur lors de l'enregistrement des articles");
    }

    return { orderId };
  });
