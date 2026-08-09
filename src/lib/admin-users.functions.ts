import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Deletes an administrator account. Super administrators only. */
export const deleteAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId || typeof input.userId !== "string") throw new Error("userId requis");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.userId === userId) throw new Error("Vous ne pouvez pas supprimer votre propre compte.");

    const { data: isSuper, error: roleError } = await supabase.rpc("is_super_admin", { _user_id: userId });
    if (roleError) throw roleError;
    if (!isSuper) throw new Error("Accès refusé");

    const { data: targetRoles } = await supabase.from("user_roles").select("role").eq("user_id", data.userId);
    if ((targetRoles ?? []).some((r) => r.role === "super_admin")) {
      throw new Error("Impossible de supprimer un super administrateur.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    return { ok: true };
  });
