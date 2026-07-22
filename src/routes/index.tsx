import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, MessageCircle, Truck, ShieldCheck, Sparkles, Headphones } from "lucide-react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/site/ProductCard";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { SHOP, waLink } from "@/lib/constants";
import heroImg from "@/assets/hero-workshop.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BricoMed — Quincaillerie & bricolage en Tunisie" },
      {
        name: "description",
        content:
          "Découvrez BricoMed : outillage, électricité, plomberie, peinture, jardinage. Commandez en un clic via WhatsApp.",
      },
      { property: "og:title", content: "BricoMed — Quincaillerie & bricolage" },
      { property: "og:description", content: "Tous vos outils, matériaux et fournitures au meilleur prix." },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(productsQuery),
    ]);
  },
  component: HomePage,
});

const reasons = [
  { icon: Sparkles, title: "Produits de qualité", text: "Sélection rigoureuse de marques reconnues." },
  { icon: ShieldCheck, title: "Prix transparents", text: "Des tarifs justes, sans surprises." },
  { icon: Truck, title: "Retrait rapide", text: "Vos produits prêts en magasin." },
  { icon: Headphones, title: "Conseil expert", text: "Une équipe de bricoleurs à votre écoute." },
];

function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Comp = (name && (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name]) || Icons.Package;
  return <Comp className={className} />;
}

function HomePage() {
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const { data: products } = useSuspenseQuery(productsQuery);
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const topCats = categories.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" width={1920} height={1080} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 md:py-36">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              Quincaillerie · Bricolage · Jardinage
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Tout pour vos travaux, <span className="text-primary">au meilleur prix.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">{SHOP.slogan}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/catalogue">
                  Voir les produits <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                asChild
              >
                <a href={waLink(`Bonjour ${SHOP.name}, j'aimerais des renseignements.`)} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Contacter via WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Nos catégories</h2>
            <p className="mt-2 text-muted-foreground">Trouvez rapidement ce dont vous avez besoin.</p>
          </div>
          <Link to="/catalogue" className="hidden text-sm font-medium text-primary hover:underline sm:inline">
            Tout voir →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {topCats.map((c) => (
            <Link
              key={c.id}
              to="/catalogue"
              search={{ cat: c.slug }}
              className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:border-primary hover:shadow-hover"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <CategoryIcon name={c.icon} className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="bg-secondary/50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold">Pourquoi nous choisir ?</h2>
            <p className="mt-2 text-muted-foreground">L'expérience quincaillerie, en mieux.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {reasons.map((r) => (
              <div key={r.title} className="rounded-xl bg-card p-6 shadow-card">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <r.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Produits populaires</h2>
            <p className="mt-2 text-muted-foreground">Une sélection de nos best-sellers.</p>
          </div>
          <Link to="/catalogue" className="hidden text-sm font-medium text-primary hover:underline sm:inline">
            Voir tout →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-2xl bg-brand-gradient p-10 text-center text-brand-foreground md:p-16">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Une question ? Un devis ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-foreground/90">
            Envoyez-nous votre besoin sur WhatsApp, nous vous répondons rapidement.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-6"
            asChild
          >
            <a href={waLink(`Bonjour ${SHOP.name}`)} target="_blank" rel="noreferrer">
              <MessageCircle className="h-5 w-5" /> Écrire sur WhatsApp
            </a>
          </Button>
        </div>
      </section>
    </>
  );
}
