import { createFileRoute } from "@tanstack/react-router";
import { Award, Heart, Users } from "lucide-react";
import { SHOP } from "@/lib/constants";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: `À propos — ${SHOP.name}` },
      { name: "description", content: `Découvrez l'histoire, les valeurs et l'équipe de ${SHOP.name}.` },
      { property: "og:title", content: `À propos — ${SHOP.name}` },
      { property: "og:description", content: "Notre passion : vous accompagner dans tous vos projets de bricolage." },
    ],
  }),
  component: AboutPage,
});

const values = [
  { icon: Heart, title: "Passion", text: "Le bricolage est notre métier depuis plus de 20 ans." },
  { icon: Award, title: "Qualité", text: "Nous ne vendons que des produits que nous utiliserions nous-mêmes." },
  { icon: Users, title: "Proximité", text: "Un conseil humain, à votre écoute, en boutique comme sur WhatsApp." },
];

function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold md:text-5xl">À propos de {SHOP.name}</h1>
      <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
        {SHOP.name} est une quincaillerie familiale située au cœur de Tunis. Nous accompagnons
        les particuliers, les artisans et les professionnels avec un large choix de produits
        et un conseil qui fait vraiment la différence.
      </p>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold">Notre histoire</h2>
          <p className="mt-3 text-muted-foreground">
            Fondée en 2003, {SHOP.name} a grandi avec le quartier. D'un petit magasin de
            quartier, nous sommes devenus une référence locale du bricolage, tout en gardant
            l'accueil et l'écoute qui font notre force.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold">Notre magasin</h2>
          <p className="mt-3 text-muted-foreground">
            Sur plus de 400m², retrouvez plus de 5 000 références réparties en 8 rayons :
            outillage, électricité, plomberie, peinture, jardinage, visserie, serrurerie
            et quincaillerie générale.
          </p>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="font-display text-2xl font-bold">Nos valeurs</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="rounded-xl border bg-card p-6 shadow-card">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{v.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {[
          "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
          "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800",
          "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800",
        ].map((src) => (
          <img key={src} src={src} alt="Magasin BricoMed" className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" />
        ))}
      </div>

      <div className="mt-12 rounded-xl bg-secondary p-6">
        <h3 className="font-semibold">Horaires & adresse</h3>
        <p className="mt-2 text-sm text-muted-foreground">{SHOP.hours}</p>
        <p className="text-sm text-muted-foreground">{SHOP.address}</p>
      </div>
    </div>
  );
}
