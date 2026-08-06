import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productsQuery, stockMovementsQuery, type Product, type StockMovementType } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { MOVEMENT_TYPES, MovementsTable } from "./MovementsTable";

export function StockTab() {
  const { t } = useTranslation(["admin", "common"]);
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: movements = [] } = useQuery(stockMovementsQuery);
  const [search, setSearch] = useState("");
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [types, setTypes] = useState<Record<string, StockMovementType>>({});

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const adjust = async (p: Product, change: number) => {
    if (!change) return;
    const _type: StockMovementType = types[p.id] ?? (change > 0 ? "entry" : "manual");
    const _reason = (reason[p.id] || "").trim() || t(`admin:movements.types.${_type}`);
    const { error } = await supabase.rpc("adjust_stock", {
      _product_id: p.id,
      _change: change,
      _reason,
      _type,
      _comment: null,
    });
    if (error) return toast.error(error.message);
    toast.success(t("admin:stock.toasts.updated", { sign: change > 0 ? "+" : "", change }));
    setAmounts((s) => ({ ...s, [p.id]: 0 }));
    setReason((s) => ({ ...s, [p.id]: "" }));
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["stock_movements"] });
    qc.invalidateQueries({ queryKey: ["activity_logs"] });

  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> {t("admin:stock.management.title")}
          </CardTitle>
          <CardDescription>{t("admin:stock.management.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder={t("admin:stock.management.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">{t("admin:stock.table.product")}</th>
                  <th className="p-3">{t("admin:stock.table.stock")}</th>
                  <th className="p-3">{t("admin:stock.table.threshold")}</th>
                  <th className="p-3">{t("admin:stock.table.adjustment")}</th>
                  <th className="p-3">{t("admin:stock.table.reason")}</th>
                  <th className="p-3 text-right">{t("admin:stock.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const qty = amounts[p.id] ?? 0;
                  const isOut = p.stock_quantity <= 0;
                  const isLow = !isOut && p.stock_quantity <= p.low_stock_threshold;
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3">
                        <span className={`font-bold ${isOut ? "text-destructive" : isLow ? "text-amber-600" : "text-foreground"}`}>
                          {p.stock_quantity}
                        </span>
                        {isOut && <Badge variant="destructive" className="ms-2">{t("admin:stock.badge.outOfStock")}</Badge>}
                        {isLow && <Badge variant="secondary" className="ms-2">{t("admin:stock.badge.low")}</Badge>}
                      </td>
                      <td className="p-3 text-muted-foreground">{p.low_stock_threshold}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          className="h-8 w-24"
                          value={qty}
                          onChange={(e) => setAmounts((s) => ({ ...s, [p.id]: Number(e.target.value) }))}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          className="h-8 w-40"
                          placeholder={t("admin:stock.reasonPlaceholder")}
                          value={reason[p.id] ?? ""}
                          onChange={(e) => setReason((s) => ({ ...s, [p.id]: e.target.value }))}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => adjust(p, Math.abs(qty))}>
                          <Plus className="h-4 w-4" /> {t("admin:stock.add")}
                        </Button>
                        <Button size="sm" variant="ghost" className="ms-1" onClick={() => adjust(p, -Math.abs(qty))}>
                          <Minus className="h-4 w-4" /> {t("admin:stock.remove")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> {t("admin:stock.history.title")}
          </CardTitle>
          <CardDescription>{t("admin:stock.history.description")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">{t("admin:stock.history.date")}</th>
                  <th className="p-3">{t("admin:stock.history.product")}</th>
                  <th className="p-3">{t("admin:stock.history.variation")}</th>
                  <th className="p-3">{t("admin:stock.history.reason")}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const p = productMap.get(m.product_id);
                  return (
                    <tr key={m.id} className="border-t">
                      <td className="p-3 text-muted-foreground">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="p-3 font-medium">{p?.name ?? "—"}</td>
                      <td className={`p-3 font-bold ${m.change >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {m.change > 0 ? "+" : ""}{m.change}
                      </td>
                      <td className="p-3">{m.reason}</td>
                    </tr>
                  );
                })}
                {movements.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{t("admin:stock.history.empty")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
