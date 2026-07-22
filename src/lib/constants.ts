export const SHOP = {
  name: "BricoMed",
  tagline: "Votre quincaillerie de confiance",
  slogan: "Tous vos outils, matériaux et fournitures — au meilleur prix.",
  whatsapp: "21692841145",
  phone: "+216 92 841 145",
  email: "contact@bricomed.tn",
  address: "Avenue Habib Bourguiba, Tunis, Tunisie",
  hours: "Lun–Sam : 8h – 19h · Dim : 9h – 13h",
  currency: "DT",
  mapEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3193.0!2d10.181667!3d36.806389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sTunis!5e0!3m2!1sfr!2stn!4v1700000000000",
};

export function waLink(text: string) {
  return `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function formatPrice(n: number) {
  return `${n.toFixed(3).replace(/\.?0+$/, "")} ${SHOP.currency}`;
}
