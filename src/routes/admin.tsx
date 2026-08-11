import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, LogOut, Star, ShieldAlert, LayoutDashboard, Package, ShoppingCart, Boxes, UserCog, ScrollText, ArrowLeftRight, Users, Settings, Hourglass, Crown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatsDashboard } from "@/components/admin/StatsDashboard";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { StockTab } from "@/components/admin/StockTab";
import { ProfileTab } from "@/components/admin/ProfileTab";
import { ActivityLogTab } from "@/components/admin/ActivityLogTab";
import { StockMovementsTab } from "@/components/admin/StockMovementsTab";
import { MovementsTable } from "@/components/admin/MovementsTable";
import { productMovementsQuery } from "@/lib/queries";
import { ensureProfile, logActivity, diffProduct } from "@/lib/activity-log";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesQuery, productsQuery, ordersQuery, type Product } from "@/lib/queries";
import { formatPrice } from "@/lib/constants";
import { useTranslation } from "react-i18next";
import { currentAdminQuery, adminAccountsQuery } from "@/lib/roles";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { ProductImagesInput, removeStorageImages } from "@/components/admin/ProductImagesInput";



export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — BricoMed" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useTranslation(["admin", "common"]);
  const nav = useNavigate();
  const meq = useQuery(currentAdminQuery);
  const me = meq.data;
  const isLoading = meq.isFetching && !me;

  useEffect(() => {
    if (!isLoading && me === null) nav({ to: "/auth" });
  }, [isLoading, me, nav]);

  if (isLoading || !me) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">{t("admin:loading")}</div>;
  }

  if (!me.isAdmin) {
    const key = me.status === "pending" ? "pending" : me.status === "disabled" ? "disabled" : "restricted";
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <span className={`mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl ${key === "pending" ? "bg-amber-100 text-amber-700" : "bg-destructive/10 text-destructive"}`}>
          {key === "pending" ? <Hourglass className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">{t(`admin:access.${key}Title`)}</h1>
        <p className="mt-2 text-muted-foreground">{t(`admin:access.${key}Text`, { email: me.email })}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          {t("admin:access.idToShare")} <code className="rounded bg-secondary px-2 py-1">{me.userId}</code>
        </p>
        <Button variant="outline" className="mt-6" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }}>
          <LogOut className="h-4 w-4" /> {t("common:actions.logout")}
        </Button>
      </div>
    );
  }

  return <AdminDashboard email={me.email} userId={me.userId} isSuperAdmin={me.isSuperAdmin} />;
}

function AdminDashboard({ email, userId, isSuperAdmin }: { email: string; userId: string; isSuperAdmin: boolean }) {
  const { t } = useTranslation(["admin", "common"]);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: orders = [] } = useQuery(ordersQuery);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(email.split("@")[0] ?? "admin");

  useEffect(() => {
    (async () => {
      const name = await ensureProfile(userId, email);
      setUsername(name);
    })();
  }, [userId, email]);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const { data: accounts = [] } = useQuery({ ...adminAccountsQuery, enabled: isSuperAdmin });
  const pendingAccounts = (accounts as { status: string }[]).filter((a) => a.status === "pending").length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["activity_logs"] });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };



  const toggleFeatured = async (p: Product) => {
    const { error } = await supabase
      .from("products")
      .update({ featured: !p.featured, last_modified_at: new Date().toISOString(), last_modified_by: username })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    await logActivity({
      action: p.featured ? "Désactivation vedette" : "Activation vedette",
      entityType: "Produit",
      entityName: p.name,
      entityId: p.id,
      oldValue: p.featured ? "En vedette" : "Standard",
      newValue: p.featured ? "Standard" : "En vedette",
    });
    toast.success(t("admin:products.toasts.featuredUpdated"));
    refresh();
  };

  const remove = async (p: Product) => {
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    await logActivity({
      action: "Suppression produit",
      entityType: "Produit",
      entityName: p.name,
      entityId: p.id,
      oldValue: `${formatPrice(p.price)} — ${p.stock_quantity} u.`,
    });
    toast.success(t("admin:products.toasts.deleted"));
    refresh();
  };


  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-3xl font-bold">
            {t("admin:header.title")}
            <Badge variant={isSuperAdmin ? "default" : "secondary"} className="gap-1 text-xs">
              {isSuperAdmin && <Crown className="h-3 w-3" />}
              {t(`admin:users.roles.${isSuperAdmin ? "super_admin" : "admin"}`)}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">{t("admin:header.connectedAs", { email })}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> {t("admin:header.newProduct")}</Button>
            </DialogTrigger>
            <ProductDialog
              key={editing?.id ?? "new"}
              product={editing}
              categories={categories}
              username={username}

              onDone={() => { setOpen(false); setEditing(null); refresh(); }}
            />
          </Dialog>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4" /> {t("common:actions.logout")}
          </Button>

        </div>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="stats" className="gap-2"><LayoutDashboard className="h-4 w-4" /> {t("admin:tabs.stats")}</TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" /> {t("admin:tabs.orders")}
            {pendingCount > 0 && <Badge variant="secondary" className="ms-1">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2"><Boxes className="h-4 w-4" /> {t("admin:tabs.stock")}</TabsTrigger>
          <TabsTrigger value="products" className="gap-2"><Package className="h-4 w-4" /> {t("admin:tabs.products")}</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="movements" className="gap-2"><ArrowLeftRight className="h-4 w-4" /> {t("admin:tabs.movements")}</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="logs" className="gap-2"><ScrollText className="h-4 w-4" /> {t("admin:tabs.logs")}</TabsTrigger>}
          {isSuperAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> {t("admin:tabs.users")}
              {pendingAccounts > 0 && <Badge variant="destructive" className="ms-1">{pendingAccounts}</Badge>}
            </TabsTrigger>
          )}
          {isSuperAdmin && <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> {t("admin:tabs.settings")}</TabsTrigger>}
          <TabsTrigger value="profile" className="gap-2"><UserCog className="h-4 w-4" /> {t("admin:tabs.profile")}</TabsTrigger>
        </TabsList>

        <TabsContent value="stats"><StatsDashboard showRevenue={isSuperAdmin} /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="stock"><StockTab /></TabsContent>
        {isSuperAdmin && <TabsContent value="movements"><StockMovementsTab /></TabsContent>}
        {isSuperAdmin && <TabsContent value="logs"><ActivityLogTab /></TabsContent>}
        {isSuperAdmin && <TabsContent value="users"><AdminUsersTab currentUserId={userId} /></TabsContent>}
        {isSuperAdmin && <TabsContent value="settings"><SettingsTab /></TabsContent>}
        <TabsContent value="profile"><ProfileTab email={email} userId={userId} /></TabsContent>



        <TabsContent value="products">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left">
                <tr>
                  <th className="p-3">{t("admin:products.table.product")}</th>
                  <th className="p-3">{t("admin:products.table.category")}</th>
                  <th className="p-3">{t("admin:products.table.price")}</th>
                  <th className="p-3">{t("admin:products.table.stock")}</th>
                  <th className="p-3">{t("admin:products.table.featured")}</th>
                  <th className="p-3">{t("admin:products.table.lastModified")}</th>
                  <th className="p-3 text-end">{t("admin:products.table.actions")}</th>

                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const cat = categories.find((c) => c.id === p.category_id);
                  const isOut = p.stock_quantity <= 0;
                  const isLow = !isOut && p.stock_quantity <= p.low_stock_threshold;
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {p.images[0] && <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover" />}
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{cat?.name ?? "—"}</td>
                      <td className="p-3">{formatPrice(p.price)}</td>
                      <td className="p-3">
                        <span className={`font-semibold ${isOut ? "text-destructive" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                          {p.stock_quantity}
                        </span>
                        {isOut && <Badge variant="destructive" className="ms-2">{t("admin:products.badge.outOfStock")}</Badge>}
                        {isLow && <Badge variant="secondary" className="ms-2">{t("admin:products.badge.low")}</Badge>}
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" onClick={() => toggleFeatured(p)}>
                          <Star className={`h-4 w-4 ${p.featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                        </Button>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {p.last_modified_at ? (
                          <>
                            <div>{new Date(p.last_modified_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</div>
                            <div className="font-medium text-foreground">{p.last_modified_by ?? "—"}</div>
                          </>
                        ) : "—"}
                      </td>

                      <td className="p-3 text-end">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("admin:products.deleteDialog.title")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("admin:products.deleteDialog.description")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(p)}>{t("common:actions.delete")}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Category = { id: string; name: string; slug: string };
function ProductDialog({ product, categories, username, onDone }: { product: Product | null; categories: Category[]; username: string; onDone: () => void }) {
  const { t } = useTranslation(["admin", "common"]);
  const [form, setForm] = useState(() => ({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    short_description: product?.short_description ?? "",
    price: product?.price ?? 0,
    category_id: product?.category_id ?? "",
    images: (product?.images ?? []).join("\n"),
    features: (product?.features ?? []).join("\n"),
    stock_quantity: product?.stock_quantity ?? 0,
    low_stock_threshold: product?.low_stock_threshold ?? 5,
    featured: product?.featured ?? false,
  }));
  const [saving, setSaving] = useState(false);

  const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description,
      short_description: form.short_description || null,
      price: Number(form.price),
      category_id: form.category_id || null,
      images: form.images.split("\n").map((s) => s.trim()).filter(Boolean),
      features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
      stock_quantity: Math.max(0, Number(form.stock_quantity)),
      low_stock_threshold: Math.max(0, Number(form.low_stock_threshold)),
      featured: form.featured,
      last_modified_by: username,
      last_modified_at: new Date().toISOString(),
    };
    const res = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);

    if (product) {
      const removed = (product.images ?? []).filter((u) => !payload.images.includes(u));
      if (removed.length) await removeStorageImages(removed);
    }


    const labels: Record<string, string> = {
      name: t("admin:products.fields.name"),
      price: t("admin:products.fields.price"),
      category_id: t("admin:products.fields.category"),
      stock_quantity: t("admin:products.fields.stock"),
      low_stock_threshold: t("admin:products.fields.lowStockThreshold"),
      short_description: t("admin:products.fields.shortDescription"),
      description: t("admin:products.fields.description"),
      images: t("admin:products.fields.images"),
      features: t("admin:products.fields.features"),
      featured: t("admin:products.fields.featured"),
    };
    if (product) {
      const changes = diffProduct(product as unknown as Record<string, unknown>, payload, labels);
      if (changes.length) {
        await logActivity({
          action: "Modification produit",
          entityType: "Produit",
          entityName: payload.name,
          entityId: product.id,
          oldValue: changes.map((c) => `${c.label}: ${c.old || "—"}`).join(" | "),
          newValue: changes.map((c) => `${c.label}: ${c.new || "—"}`).join(" | "),
        });
      }
    } else {
      await logActivity({
        action: "Ajout produit",
        entityType: "Produit",
        entityName: payload.name,
        newValue: `${formatPrice(payload.price)} — ${payload.stock_quantity} u.`,
      });
    }
    toast.success(product ? t("admin:products.toasts.updated") : t("admin:products.toasts.created"));
    onDone();
  };


  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{product ? t("admin:products.dialog.editTitle") : t("admin:products.dialog.newTitle")}</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="info">
        <TabsList className="mb-4">
          <TabsTrigger value="info">{t("admin:movements.productHistory.info")}</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><ArrowLeftRight className="h-4 w-4" /> {t("admin:movements.productHistory.tab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          {product ? <ProductMovements productId={product.id} /> : <p className="p-6 text-center text-sm text-muted-foreground">{t("admin:movements.productHistory.saveFirst")}</p>}
        </TabsContent>
        <TabsContent value="info">
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("admin:products.dialog.name")}</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>{t("admin:products.dialog.slug")}</Label>
            <Input value={form.slug} placeholder={t("admin:products.dialog.slugPlaceholder")} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div>
            <Label>{t("admin:products.dialog.price")}</Label>
            <Input type="number" step="0.001" required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{t("admin:products.dialog.category")}</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder={t("admin:products.dialog.categoryPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("admin:products.dialog.stockQuantity")}</Label>
            <Input type="number" min={0} value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{t("admin:products.dialog.lowStockThreshold")}</Label>
            <Input type="number" min={0} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label>{t("admin:products.dialog.shortDescription")}</Label>
          <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
        </div>
        <div>
          <Label>{t("admin:products.dialog.description")}</Label>
          <Textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <ProductImagesInput
          value={form.images.split("\n").map((s) => s.trim()).filter(Boolean)}
          onChange={(imgs) => setForm({ ...form, images: imgs.join("\n") })}
        />

        <div>
          <Label>{t("admin:products.dialog.features")}</Label>
          <Textarea rows={3} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2">
            <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
            <span className="text-sm">{t("admin:products.dialog.featured")}</span>
          </label>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? t("admin:products.dialog.saving") : t("admin:products.dialog.save")}</Button>
        </DialogFooter>
      </form>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

function ProductMovements({ productId }: { productId: string }) {
  const { t } = useTranslation(["admin"]);
  const { data: movements = [] } = useQuery(productMovementsQuery(productId));
  return <MovementsTable movements={movements} emptyLabel={t("admin:movements.productHistory.empty")} />;
}
