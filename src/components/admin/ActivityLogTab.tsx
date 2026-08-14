import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { activityLogsQuery, type ActivityLog } from "@/lib/activity-log";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileSpreadsheet, ScrollText, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

const ALL = "__all__";

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function details(l: ActivityLog) {
  if (l.old_value && l.new_value) return `${l.old_value} → ${l.new_value}`;
  return l.new_value ?? l.old_value ?? "—";
}

export function ActivityLogTab() {
  const { t } = useTranslation(["admin", "common"]);
  const { data: logs = [], isLoading, refetch } = useQuery(activityLogsQuery);
  const actionLabel = (a: string) => t(`admin:logs.actionLabels.${a}`, { defaultValue: a });
  const [search, setSearch] = useState("");
  const [admin, setAdmin] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const admins = useMemo(() => [...new Set(logs.map((l) => l.admin_username))].sort(), [logs]);
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (admin !== ALL && l.admin_username !== admin) return false;
      if (action !== ALL && l.action !== action) return false;
      const d = new Date(l.created_at);
      if (from && d < new Date(`${from}T00:00:00`)) return false;
      if (to && d > new Date(`${to}T23:59:59`)) return false;
      if (!q) return true;
      return [l.admin_username, l.action, l.entity_type, l.entity_name, l.old_value, l.new_value, l.ip_address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [logs, search, admin, action, from, to]);

  const rows = () =>
    filtered.map((l) => [
      fmt(l.created_at),
      l.admin_username,
      l.action,
      `${l.entity_type}${l.entity_name ? ` — ${l.entity_name}` : ""}`,
      details(l),
      l.ip_address ?? "—",
    ]);

  const exportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(t("admin:logs.pdf.title"), 14, 14);
    doc.setFontSize(9);
    doc.text(t("admin:logs.pdf.exportDate", { date: new Date().toLocaleString(), count: filtered.length }), 14, 20);
    autoTable(doc, {
      head: [[t("admin:logs.table.date"), t("admin:logs.table.admin"), t("admin:logs.table.action"), t("admin:logs.table.element"), t("admin:logs.table.details"), t("admin:logs.table.ip")]],
      body: rows(),
      startY: 25,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [245, 124, 0] },
    });
    doc.save(`journal-activite-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportExcel = async () => {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Journal");
    worksheet.addRow([
      t("admin:logs.table.date"),
      t("admin:logs.table.admin"),
      t("admin:logs.table.action"),
      t("admin:logs.table.element"),
      t("admin:logs.table.details"),
      t("admin:logs.table.ip"),
    ]);
    rows().forEach((row) => worksheet.addRow(row));
    worksheet.columns = [{ width: 18 }, { width: 16 }, { width: 26 }, { width: 32 }, { width: 48 }, { width: 16 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-activite-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setSearch("");
    setAdmin(ALL);
    setAction(ALL);
    setFrom("");
    setTo("");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-primary" /> {t("admin:logs.title")}
          </CardTitle>
          <CardDescription>
            {t("admin:logs.description", { count: filtered.length })}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-4 w-4" /> {t("admin:logs.refresh")}
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={!filtered.length}>
            <FileDown className="h-4 w-4" /> {t("admin:logs.exportPdf")}
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!filtered.length}>
            <FileSpreadsheet className="h-4 w-4" /> {t("admin:logs.exportExcel")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label className="text-xs">{t("admin:logs.search")}</Label>
            <Input placeholder={t("admin:logs.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{t("admin:logs.admin")}</Label>
            <Select value={admin} onValueChange={setAdmin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("admin:logs.allAdmins")}</SelectItem>
                {admins.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t("admin:logs.actionType")}</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("admin:logs.allActions")}</SelectItem>
                {actions.map((a) => <SelectItem key={a} value={a}>{actionLabel(a)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t("admin:logs.from")}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t("admin:logs.to")}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>{t("admin:logs.resetFilters")}</Button>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">{t("admin:logs.table.date")}</th>
                <th className="p-3">{t("admin:logs.table.admin")}</th>
                <th className="p-3">{t("admin:logs.table.action")}</th>
                <th className="p-3">{t("admin:logs.table.element")}</th>
                <th className="p-3">{t("admin:logs.table.details")}</th>
                <th className="p-3">{t("admin:logs.table.ip")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t align-top">
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{fmt(l.created_at)}</td>
                  <td className="p-3 font-medium">{l.admin_username}</td>
                  <td className="p-3"><Badge variant="secondary">{actionLabel(l.action)}</Badge></td>
                  <td className="p-3">
                    <span className="text-muted-foreground">{l.entity_type}</span>
                    {l.entity_name && <div className="font-medium">{l.entity_name}</div>}
                  </td>
                  <td className="p-3">{details(l)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{l.ip_address ?? "—"}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    {isLoading ? t("admin:loading") : t("admin:logs.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
