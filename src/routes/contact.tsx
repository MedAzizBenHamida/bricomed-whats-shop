import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SHOP, waLink } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: `Contact — ${SHOP.name}` },
      { name: "description", content: `Contactez ${SHOP.name} : téléphone, WhatsApp, email, adresse et formulaire.` },
      { property: "og:title", content: `Contact — ${SHOP.name}` },
      { property: "og:description", content: "Notre équipe vous répond rapidement." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Bonjour ${SHOP.name},\n\nNom: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    window.open(waLink(text), "_blank");
    toast.success("Message prêt à être envoyé sur WhatsApp");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold md:text-5xl">Nous contacter</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Une question, un devis, un besoin de conseil ? Nous vous répondons rapidement.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href={waLink(`Bonjour ${SHOP.name}`)} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" /> Contacter via WhatsApp
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href={`tel:${SHOP.phone.replace(/\s/g, "")}`}>
            <Phone className="h-4 w-4" /> Appeler
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href={SHOP.mapLink} target="_blank" rel="noreferrer">
            <MapPin className="h-4 w-4" /> Ouvrir dans Google Maps
          </a>
        </Button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-xl border bg-card p-5">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></span>
            <div>
              <p className="text-sm text-muted-foreground">Adresse</p>
              {SHOP.addressLines.map((line) => (
                <p key={line} className="font-semibold leading-6">{line}</p>
              ))}
            </div>
          </div>
          <a href={`tel:${SHOP.phone.replace(/\s/g, "")}`} className="flex items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Phone className="h-5 w-5" /></span>
            <div>
              <p className="text-sm text-muted-foreground">Téléphone</p>
              <p className="font-semibold">{SHOP.phone}</p>
            </div>
          </a>
          <a href={waLink(`Bonjour ${SHOP.name}`)} target="_blank" rel="noreferrer" className="flex items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageCircle className="h-5 w-5" /></span>
            <div>
              <p className="text-sm text-muted-foreground">WhatsApp</p>
              <p className="font-semibold">Écrire maintenant</p>
            </div>
          </a>
          <a href={`mailto:${SHOP.email}`} className="flex items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Mail className="h-5 w-5" /></span>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold break-all">{SHOP.email}</p>
            </div>
          </a>
          <div className="flex items-start gap-4 rounded-xl border bg-card p-5">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Clock className="h-5 w-5" /></span>
            <div className="w-full">
              <p className="text-sm text-muted-foreground">Horaires d'ouverture</p>
              <ul className="mt-1 space-y-1">
                {SHOP.openingHours.map((h) => (
                  <li key={h.day} className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{h.day}</span>
                    <span className="font-semibold">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border shadow-card">
            <iframe
              title="Carte Quicaillerie — Route de Médenine"
              src={SHOP.mapEmbed}
              width="100%"
              height="340"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 0 }}
              className="block w-full"
            />
          </div>
        </div>


        <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-bold">Envoyez-nous un message</h2>
          <p className="text-sm text-muted-foreground">Nous répondons via WhatsApp pour un échange rapide.</p>
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <Button type="submit" size="lg" className="w-full">
            <Send className="h-4 w-4" /> Envoyer via WhatsApp
          </Button>
        </form>
      </div>
    </div>
  );
}
