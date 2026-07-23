import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productsQuery, stockMovementsQuery, type Product } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function StockTab() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: movements = [] } = useQuery(stockMovementsQuery);
  const [search, setSearch] = useState("");
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<Record<string, string>>({});

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const adjust = async (p: Product, change: number) => {
    if (!change) return;
    const _reason = reason[p.id] || (change > 0 ? "Réapprovisionnement" : "Correction d'inventaire");
    const { error } = await supabase.rpc("adjust_stock", {
      _product_id: p.id,
      _change: change,
      _reason,
    });
    if (error) return toast.error(error.message);
    toast.success(`Stock mis à jour (${change > 0 ? "+" : ""}${change})`);
    setAmounts((s) => ({ ...s, [p.id]: 0 }));
    setReason((s) => ({ ...s, [p.id]: "" }));
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["stock_movements"] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Gestion du stock
          </CardTitle>
          <CardDescription>Ajuster rapidement les quantités disponibles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Rechercher un produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Produit</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Seuil</th>
                  <th className="p-3">Ajustement</th>
                  <th className="p-3">Motif</th>
                  <th className="p-3 text-right">Actions</th>
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
                        {isOut && <Badge variant="destructive" className="ml-2">Rupture</Badge>}
                        {isLow && <Badge variant="secondary" className="ml-2">Faible</Badge>}
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
                          placeholder="ex: réappro"
                          value={reason[p.id] ?? ""}
                          onChange={(e) => setReason((s) => ({ ...s, [p.id]: e.target.value }))}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => adjust(p, Math.abs(qty))}>
                          <Plus className="h-4 w-4" /> Ajouter
                        </Button>
                        <Button size="sm" variant="ghost" className="ml-1" onClick={() => adjust(p, -Math.abs(qty))}>
                          <Minus className="h-4 w-4" /> Retirer
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
            <History className="h-4 w-4" /> Historique des mouvements
          </CardTitle>
          <CardDescription>200 derniers mouvements</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Produit</th>
                  <th className="p-3">Variation</th>
                  <th className="p-3">Motif</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const p = productMap.get(m.product_id);
                  return (
                    <tr key={m.id} className="border-t">
                      <td className="p-3 text-muted-foreground">{new Date(m.created_at).toLocaleString("fr-FR")}</td>
                      <td className="p-3 font-medium">{p?.name ?? "—"}</td>
                      <td className={`p-3 font-bold ${m.change >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {m.change > 0 ? "+" : ""}{m.change}
                      </td>
                      <td className="p-3">{m.reason}</td>
                    </tr>
                  );
                })}
                {movements.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucun mouvement enregistré.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
