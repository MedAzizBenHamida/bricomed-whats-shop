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

const ALL = "__all__";

function fmt(d: string) {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function details(l: ActivityLog) {
  if (l.old_value && l.new_value) return `${l.old_value} → ${l.new_value}`;
  return l.new_value ?? l.old_value ?? "—";
}

export function ActivityLogTab() {
  const { data: logs = [], isLoading, refetch } = useQuery(activityLogsQuery);
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
    doc.text("BricoMed — Journal d'activité", 14, 14);
    doc.setFontSize(9);
    doc.text(`Export du ${new Date().toLocaleString("fr-FR")} — ${filtered.length} entrée(s)`, 14, 20);
    autoTable(doc, {
      head: [["Date", "Admin", "Action", "Élément", "Détails", "IP"]],
      body: rows(),
      startY: 25,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [245, 124, 0] },
    });
    doc.save(`journal-activite-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([["Date", "Admin", "Action", "Élément", "Détails", "IP"], ...rows()]);
    ws["!cols"] = [{ wch: 18 }, { wch: 16 }, { wch: 26 }, { wch: 32 }, { wch: 48 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journal");
    XLSX.writeFile(wb, `journal-activite-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
            <ScrollText className="h-4 w-4 text-primary" /> Journal d'activité
          </CardTitle>
          <CardDescription>
            Historique en lecture seule des actions administrateur — {filtered.length} entrée(s)
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-4 w-4" /> Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={!filtered.length}>
            <FileDown className="h-4 w-4" /> Exporter en PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!filtered.length}>
            <FileSpreadsheet className="h-4 w-4" /> Exporter en Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label className="text-xs">Recherche</Label>
            <Input placeholder="Produit, action, admin…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Administrateur</Label>
            <Select value={admin} onValueChange={setAdmin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {admins.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Type d'action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Du</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Au</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>Réinitialiser les filtres</Button>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Admin</th>
                <th className="p-3">Action</th>
                <th className="p-3">Élément</th>
                <th className="p-3">Détails</th>
                <th className="p-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t align-top">
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{fmt(l.created_at)}</td>
                  <td className="p-3 font-medium">{l.admin_username}</td>
                  <td className="p-3"><Badge variant="secondary">{l.action}</Badge></td>
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
                    {isLoading ? "Chargement…" : "Aucune entrée."}
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
