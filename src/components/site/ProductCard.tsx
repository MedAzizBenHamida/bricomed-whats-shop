import { Link } from "@tanstack/react-router";
import { Eye, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/constants";
import { toast } from "sonner";
import type { Product } from "@/lib/queries";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation(["site", "common"]);
  const { add } = useCart();
  const img = product.images?.[0];
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-hover">
      <Link
        to="/produit/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-secondary"
      >
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">{t("product.noImage")}</div>
        )}
        {product.featured && (
          <span className="absolute start-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
            {t("product.featured")}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.short_description ?? product.description}</p>
        <div className="mt-3 text-lg font-bold text-primary">{formatPrice(product.price)}</div>
        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to="/produit/$slug" params={{ slug: product.slug }}>
              <Eye className="h-4 w-4" /> {t("product.view")}
            </Link>
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={product.stock_quantity <= 0}
            onClick={() => {
              add({ id: product.id, slug: product.slug, name: product.name, price: product.price, image: img });
              toast.success(t("product.addedToCart", { name: product.name }));
            }}
          >
            <ShoppingCart className="h-4 w-4" />{" "}
            {product.stock_quantity <= 0 ? t("common:state.outOfStock") : t("common:actions.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
