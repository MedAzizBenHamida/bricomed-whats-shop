import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActivityLog = {
  id: string;
  admin_id: string | null;
  admin_username: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  entity_id: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
};

export const activityLogsQuery = queryOptions({
  queryKey: ["activity_logs"],
  queryFn: async (): Promise<ActivityLog[]> => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as unknown as ActivityLog[];
  },
});

let cachedIp: string | null | undefined;
async function getIp(): Promise<string | null> {
  if (cachedIp !== undefined) return cachedIp;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const json = (await res.json()) as { ip?: string };
    cachedIp = json.ip ?? null;
  } catch {
    cachedIp = null;
  }
  return cachedIp;
}

let cachedUsername: string | null = null;

/** Ensures a profile row exists for the current user and returns its username. */
export async function ensureProfile(userId: string, email: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("username, full_name").eq("id", userId).maybeSingle();
  if (data?.username) {
    cachedUsername = data.username;
    return data.username;
  }
  const username = (email.split("@")[0] || "admin").trim();
  await supabase.from("profiles").insert({ id: userId, username });
  cachedUsername = username;
  return username;
}

export function setCachedUsername(username: string) {
  cachedUsername = username;
}

export type LogInput = {
  action: string;
  entityType: string;
  entityName?: string | null;
  entityId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
};

/** Best-effort append-only activity log entry. Never throws. */
export async function logActivity(input: LogInput) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;
    const username = cachedUsername ?? (await ensureProfile(user.id, user.email ?? ""));
    await supabase.from("activity_logs").insert({
      admin_id: user.id,
      admin_username: username,
      action: input.action,
      entity_type: input.entityType,
      entity_name: input.entityName ?? null,
      entity_id: input.entityId ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      ip_address: await getIp(),
    });
  } catch {
    /* logging must never break the action */
  }
}

/** Builds diff log entries between two versions of a product. */
export function diffProduct(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>,
): { field: string; label: string; old: string; new: string }[] {
  const out: { field: string; label: string; old: string; new: string }[] = [];
  for (const [field, label] of Object.entries(labels)) {
    const a = before[field];
    const b = after[field];
    const sa = Array.isArray(a) ? a.join(", ") : String(a ?? "");
    const sb = Array.isArray(b) ? b.join(", ") : String(b ?? "");
    if (sa !== sb) out.push({ field, label, old: sa, new: sb });
  }
  return out;
}
