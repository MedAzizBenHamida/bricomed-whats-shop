import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery, productsQuery, ordersQuery } from "@/lib/queries";
import { formatPrice } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, Tags, ShoppingCart, Clock, CheckCircle2, DollarSign,
  CalendarDays, TrendingUp, AlertTriangle, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, LineChart, Line,
} from "recharts";

const COLORS = ["#F57C00", "#212121", "#FB923C", "#FDBA74", "#FED7AA", "#78716C", "#A8A29E", "#D6D3D1"];

export function StatsDashboard() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: orders = [] } = useQuery(ordersQuery);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pending = orders.filter((o) => o.status === "pending");
    const confirmed = orders.filter((o) => o.status === "confirmed");
    const revenue = confirmed.reduce((s, o) => s + Number(o.total), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueMonth = confirmed
      .filter((o) => new Date(o.confirmed_at ?? o.created_at) >= monthStart)
      .reduce((s, o) => s + Number(o.total), 0);

    // Product sales aggregation from confirmed orders only
    const soldByProduct = new Map<string, { name: string; qty: number; revenue: number; category_id: string | null }>();
    confirmed.forEach((o) => {
      (o.order_items ?? []).forEach((it) => {
        const key = it.product_id ?? it.product_name;
        const prod = products.find((p) => p.id === it.product_id);
        const cur = soldByProduct.get(key) ?? { name: it.product_name, qty: 0, revenue: 0, category_id: prod?.category_id ?? null };
        cur.qty += it.quantity;
        cur.revenue += it.quantity * Number(it.unit_price);
        soldByProduct.set(key, cur);
      });
    });
    const sales = Array.from(soldByProduct.values());
    const bestSellers = [...sales].sort((a, b) => b.qty - a.qty).slice(0, 5);
    const worstSellers = [...products]
      .map((p) => ({ name: p.name, qty: sales.find((s) => s.name === p.name)?.qty ?? 0 }))
      .sort((a, b) => a.qty - b.qty)
      .slice(0, 5);

    const salesByCategory = categories.map((c) => ({
      name: c.name,
      qty: sales.filter((s) => s.category_id === c.id).reduce((a, b) => a + b.qty, 0),
      revenue: sales.filter((s) => s.category_id === c.id).reduce((a, b) => a + b.revenue, 0),
    })).sort((a, b) => b.qty - a.qty);

    const outOfStock = products.filter((p) => (p.stock_quantity ?? 0) <= 0);
    const lowStock = products.filter(
      (p) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5),
    );

    // Sales evolution last 30 days
    const days: { name: string; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const label = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      const total = confirmed
        .filter((o) => {
          const od = new Date(o.confirmed_at ?? o.created_at);
          return od.toDateString() === d.toDateString();
        })
        .reduce((s, o) => s + Number(o.total), 0);
      days.push({ name: label, total });
    }

    const recent = [...orders].slice(0, 8);

    return {
      totalOrders, pending: pending.length, confirmed: confirmed.length,
      revenue, revenueMonth, bestSellers, worstSellers, salesByCategory,
      outOfStock, lowStock, days, recent,
    };
  }, [products, categories, orders]);

  const kpis = [
    { label: "Produits", value: products.length, icon: Package, tone: "bg-primary/10 text-primary" },
    { label: "Catégories", value: categories.length, icon: Tags, tone: "bg-blue-500/10 text-blue-600" },
    { label: "Commandes", value: stats.totalOrders, icon: ShoppingCart, tone: "bg-secondary text-foreground" },
    { label: "En attente", value: stats.pending, icon: Clock, tone: "bg-amber-500/10 text-amber-600" },
    { label: "Confirmées", value: stats.confirmed, icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-600" },
    { label: "CA total", value: formatPrice(stats.revenue), icon: DollarSign, tone: "bg-primary/10 text-primary" },
    { label: "CA du mois", value: formatPrice(stats.revenueMonth), icon: CalendarDays, tone: "bg-primary/10 text-primary" },
    { label: "Stock faible", value: stats.lowStock.length, icon: AlertTriangle, tone: "bg-amber-500/10 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${k.tone}`}>
                <k.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{k.label}</p>
                <p className="truncate font-display text-lg font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(stats.outOfStock.length > 0 || stats.lowStock.length > 0 || stats.pending > 0) && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Points d'attention
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {stats.pending > 0 && <Badge variant="secondary">{stats.pending} commande(s) à confirmer</Badge>}
            {stats.outOfStock.length > 0 && <Badge variant="destructive">{stats.outOfStock.length} en rupture</Badge>}
            {stats.lowStock.length > 0 && <Badge variant="secondary">{stats.lowStock.length} stock faible</Badge>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution des ventes (30 derniers jours)</CardTitle>
            <CardDescription>CA des commandes confirmées par jour</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.days} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={10} interval={4} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Line type="monotone" dataKey="total" stroke="#F57C00" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventes par catégorie</CardTitle>
            <CardDescription>Répartition des unités vendues</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.salesByCategory.filter((c) => c.qty > 0)}
                  dataKey="qty"
                  nameKey="name"
                  outerRadius={90}
                  label={(e: { name: string }) => e.name}
                  fontSize={10}
                >
                  {stats.salesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top produits vendus</CardTitle>
            <CardDescription>Meilleures ventes (unités)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.bestSellers} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" angle={-20} textAnchor="end" fontSize={10} interval={0} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="qty" fill="#F57C00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" /> Rupture & stock faible
            </CardTitle>
            <CardDescription>À réapprovisionner en priorité</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="p-3">Produit</th><th className="p-3">Stock</th><th className="p-3">Seuil</th></tr>
                </thead>
                <tbody>
                  {[...stats.outOfStock, ...stats.lowStock].slice(0, 15).map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className={`p-3 font-semibold ${p.stock_quantity === 0 ? "text-destructive" : "text-amber-600"}`}>
                        {p.stock_quantity}
                      </td>
                      <td className="p-3 text-muted-foreground">{p.low_stock_threshold}</td>
                    </tr>
                  ))}
                  {stats.outOfStock.length === 0 && stats.lowStock.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Aucune alerte 🎉</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Produits les moins vendus
            </CardTitle>
            <CardDescription>Peut-être à mettre en avant ou déstocker</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Produit</th><th className="p-3">Unités vendues</th></tr>
              </thead>
              <tbody>
                {stats.worstSellers.map((s) => (
                  <tr key={s.name} className="border-t">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3">{s.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dernières commandes</CardTitle>
            <CardDescription>Aperçu rapide de l'activité</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Client</th><th className="p-3">Total</th><th className="p-3">Statut</th></tr>
              </thead>
              <tbody>
                {stats.recent.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-3 font-medium">{o.customer_name}</td>
                    <td className="p-3">{formatPrice(Number(o.total))}</td>
                    <td className="p-3">
                      <Badge variant={o.status === "confirmed" ? "default" : o.status === "pending" ? "secondary" : "outline"}>
                        {o.status === "pending" ? "En attente" : o.status === "confirmed" ? "Confirmée" : "Annulée"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {stats.recent.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Aucune commande</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
