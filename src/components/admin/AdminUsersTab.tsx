import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminAccountsQuery, type AdminAccount, type AdminStatus, type AppRole } from "@/lib/roles";
import { deleteAdminAccount } from "@/lib/admin-users.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { BellRing, Check, Crown, Power, Trash2, X } from "lucide-react";

const statusStyles: Record<AdminStatus, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  active: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  disabled: "bg-red-100 text-red-800 hover:bg-red-100",
};

export function AdminUsersTab({ currentUserId }: { currentUserId: string }) {
  const { t } = useTranslation(["admin", "common"]);
  const qc = useQueryClient();
  const { data: accounts = [], isLoading } = useQuery(adminAccountsQuery);
  const [busy, setBusy] = useState<string | null>(null);

  const list = accounts as unknown as AdminAccount[];
  const pending = list.filter((a) => a.status === "pending");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-accounts"] });
    qc.invalidateQueries({ queryKey: ["activity_logs"] });
  };

  const setStatus = async (a: AdminAccount, status: AdminStatus) => {
    setBusy(a.id);
    const { error } = await supabase.rpc("admin_set_status", { _user_id: a.id, _status: status });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(t("admin:users.toasts.statusUpdated"));
    refresh();
  };

  const setRole = async (a: AdminAccount, role: AppRole) => {
    setBusy(a.id);
    const { error } = await supabase.rpc("admin_set_role", { _user_id: a.id, _role: role });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(t("admin:users.toasts.roleUpdated"));
    refresh();
  };

  const remove = async (a: AdminAccount) => {
    setBusy(a.id);
    try {
      await deleteAdminAccount({ data: { userId: a.id } });
      toast.success(t("admin:users.toasts.deleted"));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <BellRing className="h-5 w-5 text-amber-600" />
            <div>
              <CardTitle className="text-base">{t("admin:users.pendingTitle")}</CardTitle>
              <CardDescription>{t("admin:users.pendingText", { count: pending.length })}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="p-3">{t("admin:users.table.username")}</th>
              <th className="p-3">{t("admin:users.table.fullName")}</th>
              <th className="p-3">{t("admin:users.table.email")}</th>
              <th className="p-3">{t("admin:users.table.role")}</th>
              <th className="p-3">{t("admin:users.table.status")}</th>
              <th className="p-3">{t("admin:users.table.createdAt")}</th>
              <th className="p-3 text-end">{t("admin:users.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">{t("admin:loading")}</td></tr>
            )}
            {!isLoading && list.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">{t("admin:users.empty")}</td></tr>
            )}
            {list.map((a) => {
              const self = a.id === currentUserId;
              const isSuper = a.role === "super_admin";
              return (
                <tr key={a.id} className="border-t align-middle">
                  <td className="p-3 font-medium">
                    {a.username}
                    {self && <span className="ms-2 text-xs text-muted-foreground">({t("admin:users.you")})</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">{a.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{a.email || "—"}</td>
                  <td className="p-3">
                    {self || isSuper ? (
                      <Badge variant={isSuper ? "default" : "secondary"} className="gap-1">
                        {isSuper && <Crown className="h-3 w-3" />}
                        {t(`admin:users.roles.${a.role}`)}
                      </Badge>
                    ) : (
                      <Select value={a.role} onValueChange={(v) => setRole(a, v as AppRole)} disabled={busy === a.id}>
                        <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">{t("admin:users.roles.super_admin")}</SelectItem>
                          <SelectItem value="admin">{t("admin:users.roles.admin")}</SelectItem>
                          <SelectItem value="user">{t("admin:users.roles.user")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge className={statusStyles[a.status]}>{t(`admin:users.statuses.${a.status}`)}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString(undefined, { dateStyle: "short" })}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {!self && a.status === "pending" && (
                        <>
                          <Button size="sm" disabled={busy === a.id} onClick={() => setStatus(a, "active")}>
                            <Check className="h-4 w-4" /> {t("admin:users.actions.approve")}
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => setStatus(a, "disabled")}>
                            <X className="h-4 w-4" /> {t("admin:users.actions.reject")}
                          </Button>
                        </>
                      )}
                      {!self && a.status === "active" && (
                        <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => setStatus(a, "disabled")}>
                          <Power className="h-4 w-4" /> {t("admin:users.actions.disable")}
                        </Button>
                      )}
                      {!self && a.status === "disabled" && (
                        <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => setStatus(a, "active")}>
                          <Power className="h-4 w-4" /> {t("admin:users.actions.enable")}
                        </Button>
                      )}
                      {!self && !isSuper && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" disabled={busy === a.id}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("admin:users.deleteDialog.title")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("admin:users.deleteDialog.description", { name: a.username })}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(a)}>{t("common:actions.delete")}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
