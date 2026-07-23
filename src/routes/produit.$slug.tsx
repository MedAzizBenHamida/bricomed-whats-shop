import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, ShoppingCart, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productBySlugQuery } from "@/lib/queries";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/produit/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productBySlugQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Produit introuvable — BricoMed" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: `${loaderData.name} — BricoMed` },
        { name: "description", content: loaderData.short_description ?? loaderData.description.slice(0, 155) },
        { property: "og:title", content: loaderData.name },
        { property: "og:description", content: loaderData.short_description ?? loaderData.description.slice(0, 155) },
        ...(loaderData.images?.[0] ? [{ property: "og:image" as const, content: loaderData.images[0] }, { name: "twitter:image" as const, content: loaderData.images[0] }] : []),
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productBySlugQuery(slug));
  const { add } = useCart();
  const [active, setActive] = useState(0);

  if (!product) return null;
  const images = product.images.length ? product.images : ["https://placehold.co/800x800?text=BricoMed"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link to="/catalogue" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border bg-secondary">
            <img src={images[active]} alt={product.name} className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`aspect-square h-20 shrink-0 overflow-hidden rounded-md border-2 ${i === active ? "border-primary" : "border-transparent"}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">{product.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            {product.stock_quantity > 0 ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> En stock ({product.stock_quantity} disponible{product.stock_quantity > 1 ? "s" : ""})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-destructive">
                <XCircle className="h-4 w-4" /> Momentanément indisponible
              </span>
            )}
          </div>
          <div className="mt-4 font-display text-4xl font-bold text-primary">{formatPrice(product.price)}</div>
          <p className="mt-6 text-muted-foreground leading-relaxed">{product.description}</p>

          {product.features.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-semibold">Caractéristiques</h3>
              <ul className="space-y-2">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            size="lg"
            className="mt-8 w-full sm:w-auto"
            disabled={product.stock_quantity <= 0}
            onClick={() => {
              add({ id: product.id, slug: product.slug, name: product.name, price: product.price, image: images[0] });
              toast.success(`${product.name} ajouté au panier`);
            }}
          >
            <ShoppingCart className="h-5 w-5" /> {product.stock_quantity <= 0 ? "Momentanément indisponible" : "Ajouter au panier"}
          </Button>
        </div>
      </div>
    </div>
  );
}
