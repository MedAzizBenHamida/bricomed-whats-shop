import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Clock, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SHOP } from "@/lib/constants";

export function Footer() {
  const { t } = useTranslation(["site", "common"]);

  return (
    <footer className="mt-24 border-t border-border bg-secondary/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-brand-foreground">
              <Wrench className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold">{SHOP.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("common:brand.tagline")}</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.navigation")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/catalogue" className="hover:text-foreground">{t("common:nav.catalogue")}</Link></li>
            <li><Link to="/a-propos" className="hover:text-foreground">{t("common:nav.about")}</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">{t("common:nav.contact")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.contact")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" /><span dir="ltr">{SHOP.phone}</span></li>
            <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" />{SHOP.email}</li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{SHOP.address}</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.hours")}</h4>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />{SHOP.hours}
          </p>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SHOP.name}. {t("footer.rights")}
      </div>
    </footer>
  );
}
