import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/site/ProductCard";
import { categoriesQuery, productsQuery } from "@/lib/queries";

const search = z.object({
  cat: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["name-asc", "price-asc", "price-desc"]).optional(),
});

export const Route = createFileRoute("/catalogue")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Catalogue — BricoMed" },
      { name: "description", content: "Parcourez notre catalogue complet : outillage, électricité, plomberie, peinture, jardinage, visserie et serrurerie." },
      { property: "og:title", content: "Catalogue — BricoMed" },
      { property: "og:description", content: "Tous les produits BricoMed en un coup d'œil." },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(productsQuery),
    ]);
  },
  component: CataloguePage,
});

function CataloguePage() {
  const { cat, q, sort } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const { data: products } = useSuspenseQuery(productsQuery);
  const [term, setTerm] = useState(q ?? "");

  const filtered = useMemo(() => {
    const catId = cat ? categories.find((c) => c.slug === cat)?.id : null;
    let list = products.filter((p) => {
      if (catId && p.category_id !== catId) return false;
      if (term && !`${p.name} ${p.description}`.toLowerCase().includes(term.toLowerCase())) return false;
      return true;
    });
    if (sort === "name-asc") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, categories, cat, term, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold">Catalogue</h1>
        <p className="mt-2 text-muted-foreground">{filtered.length} produits disponibles</p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_220px_200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit…"
            className="pl-9"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              navigate({ search: (s) => ({ ...s, q: e.target.value || undefined }), replace: true });
            }}
          />
        </div>
        <Select
          value={cat ?? "all"}
          onValueChange={(v) => navigate({ search: (s) => ({ ...s, cat: v === "all" ? undefined : v }) })}
        >
          <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort ?? "default"}
          onValueChange={(v) => navigate({ search: (s) => ({ ...s, sort: v === "default" ? undefined : (v as "name-asc" | "price-asc" | "price-desc") }) })}
        >
          <SelectTrigger><SelectValue placeholder="Trier par" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Par défaut</SelectItem>
            <SelectItem value="name-asc">Nom (A → Z)</SelectItem>
            <SelectItem value="price-asc">Prix croissant</SelectItem>
            <SelectItem value="price-desc">Prix décroissant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <p className="text-muted-foreground">Aucun produit ne correspond à votre recherche.</p>
          <Button variant="link" onClick={() => { setTerm(""); navigate({ search: {} }); }}>Réinitialiser</Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
