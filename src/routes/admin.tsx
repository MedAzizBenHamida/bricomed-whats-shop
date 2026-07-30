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
import { Plus, Pencil, Trash2, LogOut, Star, ShieldAlert, LayoutDashboard, Package, ShoppingCart, Boxes, UserCog, ScrollText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatsDashboard } from "@/components/admin/StatsDashboard";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { StockTab } from "@/components/admin/StockTab";
import { ProfileTab } from "@/components/admin/ProfileTab";
import { ActivityLogTab } from "@/components/admin/ActivityLogTab";
import { ensureProfile, logActivity, diffProduct } from "@/lib/activity-log";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesQuery, productsQuery, ordersQuery, type Product } from "@/lib/queries";
import { formatPrice } from "@/lib/constants";
import type { User } from "@supabase/supabase-js";


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
  const nav = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return nav({ to: "/auth" });
      setUser(data.user);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      setIsAdmin(!!roles?.some((r) => (r as { role: string }).role === "admin"));
    })();
  }, [nav]);

  if (!user || isAdmin === null) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">Chargement…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Accès restreint</h1>
        <p className="mt-2 text-muted-foreground">
          Votre compte ({user.email}) n'a pas le rôle administrateur. Contactez l'équipe BricoMed pour être ajouté.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Identifiant à communiquer : <code className="rounded bg-secondary px-2 py-1">{user.id}</code>
        </p>
        <Button variant="outline" className="mt-6" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }}>
          <LogOut className="h-4 w-4" /> Se déconnecter
        </Button>
      </div>
    );
  }

  return <AdminDashboard email={user.email ?? ""} userId={user.id} />;
}

function AdminDashboard({ email, userId }: { email: string; userId: string }) {
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
      const key = `bricomed-login-logged-${userId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      logActivity({ action: "Connexion", entityType: "Administration", entityName: name, entityId: userId });
    })();
  }, [userId, email]);

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["activity_logs"] });
  };

  const signOut = async () => {
    await logActivity({ action: "Déconnexion", entityType: "Administration", entityName: username, entityId: userId });
    sessionStorage.removeItem(`bricomed-login-logged-${userId}`);
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
    toast.success("Mis à jour");
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
    toast.success("Produit supprimé");
    refresh();
  };


  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Administration</h1>
          <p className="text-sm text-muted-foreground">Connecté : {email}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Nouveau produit</Button>
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
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>

        </div>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="stats" className="gap-2"><LayoutDashboard className="h-4 w-4" /> Tableau de bord</TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" /> Commandes
            {pendingCount > 0 && <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2"><Boxes className="h-4 w-4" /> Stock</TabsTrigger>
          <TabsTrigger value="products" className="gap-2"><Package className="h-4 w-4" /> Produits</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><ScrollText className="h-4 w-4" /> Journal d'activité</TabsTrigger>
          <TabsTrigger value="profile" className="gap-2"><UserCog className="h-4 w-4" /> Profil</TabsTrigger>
        </TabsList>

        <TabsContent value="stats"><StatsDashboard /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="stock"><StockTab /></TabsContent>
        <TabsContent value="logs"><ActivityLogTab /></TabsContent>
        <TabsContent value="profile"><ProfileTab email={email} userId={userId} /></TabsContent>



        <TabsContent value="products">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left">
                <tr>
                  <th className="p-3">Produit</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Prix</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Vedette</th>
                  <th className="p-3">Dernière modification</th>
                  <th className="p-3 text-right">Actions</th>

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
                        {isOut && <Badge variant="destructive" className="ml-2">Rupture</Badge>}
                        {isLow && <Badge variant="secondary" className="ml-2">Faible</Badge>}
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" onClick={() => toggleFeatured(p)}>
                          <Star className={`h-4 w-4 ${p.featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                        </Button>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {p.last_modified_at ? (
                          <>
                            <div>{new Date(p.last_modified_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</div>
                            <div className="font-medium text-foreground">{p.last_modified_by ?? "—"}</div>
                          </>
                        ) : "—"}
                      </td>

                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(p)}>Supprimer</AlertDialogAction>
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

    const labels: Record<string, string> = {
      name: "Nom",
      price: "Prix",
      category_id: "Catégorie",
      stock_quantity: "Stock",
      low_stock_threshold: "Seuil d'alerte",
      short_description: "Description courte",
      description: "Description",
      images: "Images",
      features: "Caractéristiques",
      featured: "Vedette",
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
    toast.success(product ? "Produit mis à jour" : "Produit créé");
    onDone();
  };


  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{product ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nom</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Slug (URL)</Label>
            <Input value={form.slug} placeholder="auto" onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div>
            <Label>Prix (DT)</Label>
            <Input type="number" step="0.001" required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantité en stock</Label>
            <Input type="number" min={0} value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Seuil d'alerte stock faible</Label>
            <Input type="number" min={0} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label>Description courte</Label>
          <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
        </div>
        <div>
          <Label>Description complète</Label>
          <Textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label>Images (une URL par ligne)</Label>
          <Textarea rows={3} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
        </div>
        <div>
          <Label>Caractéristiques (une par ligne)</Label>
          <Textarea rows={3} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2">
            <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
            <span className="text-sm">Mettre en vedette</span>
          </label>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
