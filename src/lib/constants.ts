export const SHOP = {
  name: "BricoMed",
  tagline: "Votre quincaillerie de confiance",
  slogan: "Tous vos outils, matériaux et fournitures — au meilleur prix.",
  whatsapp: "21692841145",
  phone: "+216 92 841 145",
  // Modifiable facilement par l'administrateur
  email: "contact@quicaillerie.tn",
  address: "Quicaillerie, Route de Médenine, Plus Code : 8FXV+FPH, Médenine, Tunisie",
  addressLines: ["Quicaillerie", "Route de Médenine", "Plus Code : 8FXV+FPH", "Médenine, Tunisie"],
  hours: "Lun–Ven : 08:00 – 18:00 · Sam : 08:00 – 13:00 · Dim : Fermé",
  openingHours: [
    { day: "Lundi – Vendredi", time: "08:00 – 18:00" },
    { day: "Samedi", time: "08:00 – 13:00" },
    { day: "Dimanche", time: "Fermé" },
  ],
  currency: "DT",
  mapQuery: "8FXV+FPH Médenine, Tunisie",
  mapEmbed:
    "https://www.google.com/maps?q=8FXV%2BFPH%20M%C3%A9denine%2C%20Tunisie&hl=fr&z=16&output=embed",
  mapLink: "https://www.google.com/maps/search/?api=1&query=8FXV%2BFPH%20M%C3%A9denine%2C%20Tunisie",
};

export const GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Le Kef",
  "Mahdia",
  "La Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
] as const;

export function waLink(text: string) {
  const phone = SHOP.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function formatPrice(n: number) {
  return `${n.toFixed(3).replace(/\.?0+$/, "")} ${SHOP.currency}`;
}
