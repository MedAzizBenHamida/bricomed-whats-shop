import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, ShoppingCart, Wrench } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { CartSheet } from "./CartSheet";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SHOP } from "@/lib/constants";

const nav = [
  { to: "/", key: "nav.home" },
  { to: "/catalogue", key: "nav.catalogue" },
  { to: "/a-propos", key: "nav.about" },
  { to: "/contact", key: "nav.contact" },
] as const;

export function Header() {
  const { t } = useTranslation("common");
  const { count } = useCart();
  const [openCart, setOpenCart] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminArea = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-brand-foreground">
            <Wrench className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">{SHOP.name}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {!isAdminArea && (
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setOpenCart(true)}
              aria-label={t("labels.cart")}
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -end-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                  {count}
                </span>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("labels.menu")}
            onClick={() => setOpenMenu((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {openMenu && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpenMenu(false)}
                className="py-3 text-sm font-medium text-muted-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {t(n.key)}
              </Link>
            ))}
            <LanguageSwitcher className="my-3 self-start sm:hidden" />
          </div>
        </div>
      )}

      <CartSheet open={openCart} onOpenChange={setOpenCart} />
    </header>
  );
}
