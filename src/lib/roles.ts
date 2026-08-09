import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "user";
export type AdminStatus = "pending" | "active" | "disabled";

export type CurrentAdmin = {
  userId: string;
  email: string;
  username: string;
  role: AppRole;
  status: AdminStatus;
  isSuperAdmin: boolean;
  isAdmin: boolean;
};

export const currentAdminQuery = queryOptions({
  queryKey: ["current-admin"],
  queryFn: async (): Promise<CurrentAdmin | null> => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return null;

    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("profiles").select("username, status").eq("id", user.id).maybeSingle(),
    ]);

    const roleList = (roles ?? []).map((r) => r.role as AppRole);
    const role: AppRole = roleList.includes("super_admin")
      ? "super_admin"
      : roleList.includes("admin")
        ? "admin"
        : "user";
    const status = (profile?.status ?? "pending") as AdminStatus;
    const active = status === "active";

    return {
      userId: user.id,
      email: user.email ?? "",
      username: profile?.username ?? (user.email?.split("@")[0] ?? "admin"),
      role,
      status,
      isSuperAdmin: active && role === "super_admin",
      isAdmin: active && (role === "admin" || role === "super_admin"),
    };
  },
  staleTime: 0,
  refetchOnMount: "always" as const,
});

export const adminAccountsQuery = queryOptions({
  queryKey: ["admin-accounts"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_list_accounts");
    if (error) throw error;
    return data ?? [];
  },
});

export type AdminAccount = {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  status: AdminStatus;
  created_at: string;
  approved_at: string | null;
};

export type ShopSettings = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: { monfri: string; sat: string; sun: string };
};

export const settingsQuery = queryOptions({
  queryKey: ["app_settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("app_settings").select("key, value");
    if (error) throw error;
    const map: Record<string, Record<string, unknown>> = {};
    for (const row of data ?? []) map[row.key] = (row.value ?? {}) as Record<string, unknown>;
    return map;
  },
});
