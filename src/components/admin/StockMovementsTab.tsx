import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productsQuery, stockMovementsQuery, type StockMovementType } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileSpreadsheet, ArrowLeftRight, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MOVEMENT_TYPES, MovementsTable, fmtDate } from "./MovementsTable";

const ALL = "__all__";

export function StockMovementsTab() {
  const { t } = useTranslation(["admin", "common"]);
  const { data: movements = [] } = useQuery(stockMovementsQuery);
  const { data: products = [] } = useQuery(productsQuery);

  const [search, setSearch] = useState("");
  const [type, setType] = useState(ALL);
  const [admin, setAdmin] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const productName = (id: string) => productMap.get(id) ?? "—";
  const admins = useMemo(
    () => [...new Set(movements.map((m) => m.admin_username).filter(Boolean) as string[])].sort(),
    [movements],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter((m) => {
      if (type !== ALL && m.movement_type !== type) return false;
      if (admin !== ALL && m.admin_username !== admin) return false;
      const d = new Date(m.created_at);
      if (from && d < new Date(`${from}T00:00:00`)) return false;
      if (to && d > new Date(`${to}T23:59:59`)) return false;
      if (!q) return true;
      return [productName(m.product_id), m.reason, m.reference, m.comment]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [movements, search, type, admin, from, to, productMap]);

  const head = [
    t("admin:movements.table.date"),
    t("admin:movements.table.product"),
    t("admin:movements.table.movement"),
    t("admin:movements.table.before"),
    t("admin:movements.table.after"),
    t("admin:movements.table.type"),
    t("admin:movements.table.reference"),
    t("admin:movements.table.admin"),
  ];

  const rows = () =>
    filtered.map((m) => [
      fmtDate(m.created_at),
      productName(m.product_id),
      `${m.change > 0 ? "+" : ""}${m.change}`,
      String(m.stock_before ?? "—"),
      String(m.stock_after ?? "—"),
      `${t(`admin:movements.types.${m.movement_type}`)} — ${m.reason}`,
      m.reference ?? m.comment ?? "—",
      m.admin_username ?? "—",
    ]);

  const exportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(t("admin:movements.pdf.title"), 14, 14);
    doc.setFontSize(9);
    doc.text(t("admin:movements.pdf.exportDate", { date: new Date().toLocaleString(), count: filtered.length }), 14, 20);
    autoTable(doc, {
      head: [head],
      body: rows(),
      startY: 25,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [245, 124, 0] },
    });
    doc.save(`mouvements-stock-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportExcel = async () => {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mouvements");
    worksheet.addRow(head);
    rows().forEach((row) => worksheet.addRow(row));
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mouvements-stock-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setSearch("");
    setType(ALL);
    setAdmin(ALL);
    setFrom("");
    setTo("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" /> {t("admin:movements.title")}
            </CardTitle>
            <CardDescription>{t("admin:movements.description")}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={!filtered.length}>
              <FileDown className="h-4 w-4" /> {t("admin:movements.exportPdf")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={!filtered.length}>
              <FileSpreadsheet className="h-4 w-4" /> {t("admin:movements.exportExcel")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Label className="text-xs">{t("admin:movements.searchPlaceholder")}</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin:movements.searchPlaceholder")} />
          </div>
          <div>
            <Label className="text-xs">{t("admin:movements.filters.type")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("admin:movements.filters.all")}</SelectItem>
                {MOVEMENT_TYPES.map((ty: StockMovementType) => (
                  <SelectItem key={ty} value={ty}>{t(`admin:movements.types.${ty}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t("admin:movements.filters.admin")}</Label>
            <Select value={admin} onValueChange={setAdmin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("admin:movements.filters.all")}</SelectItem>
                {admins.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t("admin:movements.filters.from")}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t("admin:movements.filters.to")}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t("admin:movements.count", { count: filtered.length })}</span>
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-4 w-4" /> {t("admin:movements.filters.reset")}</Button>
        </div>
        <MovementsTable movements={filtered} productName={productName} emptyLabel={t("admin:movements.empty")} />
      </CardContent>
    </Card>
  );
}
