import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { formatPrice } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, Boxes, Star, AlertTriangle, CheckCircle2, DollarSign,
  TrendingUp, Tags, Layers,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";

const COLORS = ["#F57C00", "#212121", "#FB923C", "#FDBA74", "#FED7AA", "#78716C", "#A8A29E", "#D6D3D1"];

export function StatsDashboard() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);

  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.in_stock).length;
    const outStock = total - inStock;
    const featured = products.filter((p) => p.featured).length;
    const totalValue = products.reduce((s, p) => s + Number(p.price), 0);
    const avgPrice = total ? totalValue / total : 0;
    const maxPrice = total ? Math.max(...products.map((p) => Number(p.price))) : 0;
    const minPrice = total ? Math.min(...products.map((p) => Number(p.price))) : 0;
    const noCategory = products.filter((p) => !p.category_id).length;
    const noImage = products.filter((p) => !p.images || p.images.length === 0).length;

    const perCategory = categories
      .map((c) => {
        const items = products.filter((p) => p.category_id === c.id);
        return {
          name: c.name,
          total: items.length,
          value: items.reduce((s, p) => s + Number(p.price), 0),
          inStock: items.filter((p) => p.in_stock).length,
        };
      })
      .sort((a, b) => b.total - a.total);

    const priceBuckets = [
      { name: "0-50 DT", min: 0, max: 50 },
      { name: "50-100 DT", min: 50, max: 100 },
      { name: "100-250 DT", min: 100, max: 250 },
      { name: "250-500 DT", min: 250, max: 500 },
      { name: "500+ DT", min: 500, max: Infinity },
    ].map((b) => ({
      name: b.name,
      count: products.filter((p) => Number(p.price) >= b.min && Number(p.price) < b.max).length,
    }));

    const topExpensive = [...products]
      .sort((a, b) => Number(b.price) - Number(a.price))
      .slice(0, 5);

    const stockPie = [
      { name: "En stock", value: inStock },
      { name: "Rupture", value: outStock },
    ];

    return {
      total, inStock, outStock, featured, totalValue, avgPrice, maxPrice, minPrice,
      noCategory, noImage, perCategory, priceBuckets, topExpensive, stockPie,
    };
  }, [products, categories]);

  const kpis = [
    { label: "Produits", value: stats.total, icon: Package, tone: "bg-primary/10 text-primary" },
    { label: "En stock", value: stats.inStock, icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-600" },
    { label: "Rupture", value: stats.outStock, icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
    { label: "En vedette", value: stats.featured, icon: Star, tone: "bg-amber-500/10 text-amber-600" },
    { label: "Catégories", value: categories.length, icon: Tags, tone: "bg-blue-500/10 text-blue-600" },
    { label: "Valeur catalogue", value: formatPrice(stats.totalValue), icon: DollarSign, tone: "bg-primary/10 text-primary" },
    { label: "Prix moyen", value: formatPrice(stats.avgPrice), icon: TrendingUp, tone: "bg-secondary text-foreground" },
    { label: "Prix max", value: formatPrice(stats.maxPrice), icon: Layers, tone: "bg-secondary text-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI grid */}
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

      {/* Alerts */}
      {(stats.outStock > 0 || stats.noCategory > 0 || stats.noImage > 0) && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Points d'attention
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {stats.outStock > 0 && <Badge variant="secondary">{stats.outStock} produit(s) en rupture</Badge>}
            {stats.noCategory > 0 && <Badge variant="secondary">{stats.noCategory} sans catégorie</Badge>}
            {stats.noImage > 0 && <Badge variant="secondary">{stats.noImage} sans image</Badge>}
            {stats.featured === 0 && <Badge variant="secondary">Aucun produit en vedette</Badge>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Products per category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produits par catégorie</CardTitle>
            <CardDescription>Répartition du catalogue</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.perCategory} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" angle={-25} textAnchor="end" fontSize={11} interval={0} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="total" fill="#F57C00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disponibilité du stock</CardTitle>
            <CardDescription>En stock vs rupture</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.stockPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Price distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribution des prix</CardTitle>
            <CardDescription>Nombre de produits par tranche</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.priceBuckets} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="#212121" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Value per category (pie) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valeur par catégorie</CardTitle>
            <CardDescription>Somme des prix catalogue</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.perCategory.filter((c) => c.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={(e: { name: string }) => e.name}
                  fontSize={10}
                >
                  {stats.perCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatPrice(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top expensive */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 5 produits les plus chers</CardTitle>
          <CardDescription>Aide au positionnement premium</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Produit</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3">Prix</th>
                <th className="p-3">Stock</th>
              </tr>
            </thead>
            <tbody>
              {stats.topExpensive.map((p) => {
                const c = categories.find((c) => c.id === p.category_id);
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-muted-foreground">{c?.name ?? "—"}</td>
                    <td className="p-3">{formatPrice(Number(p.price))}</td>
                    <td className="p-3">
                      <span className={p.in_stock ? "text-emerald-600" : "text-destructive"}>
                        {p.in_stock ? "Oui" : "Non"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Category performance table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes className="h-4 w-4" /> Performance par catégorie
          </CardTitle>
          <CardDescription>Détails pour piloter l'assortiment</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Produits</th>
                  <th className="p-3">En stock</th>
                  <th className="p-3">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {stats.perCategory.map((c) => (
                  <tr key={c.name} className="border-t">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3">{c.total}</td>
                    <td className="p-3">
                      {c.total === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span>
                          {c.inStock}/{c.total}
                          {c.inStock < c.total && (
                            <Badge variant="secondary" className="ml-2">à réapprovisionner</Badge>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-3">{formatPrice(c.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
