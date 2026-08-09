import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery, type ShopSettings } from "@/lib/roles";
import { logActivity } from "@/lib/activity-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save } from "lucide-react";

const emptyShop: ShopSettings = {
  name: "", phone: "", whatsapp: "", email: "", address: "",
  hours: { monfri: "", sat: "", sun: "" },
};

export function SettingsTab() {
  const { t } = useTranslation(["admin", "common"]);
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const [shop, setShop] = useState<ShopSettings>(emptyShop);
  const [threshold, setThreshold] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const s = (settings["shop"] ?? {}) as Partial<ShopSettings>;
    setShop({ ...emptyShop, ...s, hours: { ...emptyShop.hours, ...(s.hours ?? {}) } });
    const st = settings["stock"] as { low_stock_threshold?: number } | undefined;
    setThreshold(Number(st?.low_stock_threshold ?? 5));
  }, [settings]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert([
      { key: "shop", value: JSON.parse(JSON.stringify(shop)) },
      { key: "stock", value: { low_stock_threshold: Math.max(0, Number(threshold)) } },
    ]);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logActivity({
      action: "Modification des paramètres",
      entityType: "Paramètres",
      entityName: shop.name,
      newValue: `${shop.phone} — ${shop.email} — seuil ${threshold}`,
    });
    qc.invalidateQueries({ queryKey: ["app_settings"] });
    qc.invalidateQueries({ queryKey: ["activity_logs"] });
    toast.success(t("admin:settings.saved"));
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin:settings.shopTitle")}</CardTitle>
          <CardDescription>{t("admin:settings.shopDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("admin:settings.fields.name")}</Label>
            <Input value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} />
          </div>
          <div>
            <Label>{t("admin:settings.fields.email")}</Label>
            <Input type="email" value={shop.email} onChange={(e) => setShop({ ...shop, email: e.target.value })} />
          </div>
          <div>
            <Label>{t("admin:settings.fields.phone")}</Label>
            <Input value={shop.phone} onChange={(e) => setShop({ ...shop, phone: e.target.value })} />
          </div>
          <div>
            <Label>{t("admin:settings.fields.whatsapp")}</Label>
            <Input value={shop.whatsapp} onChange={(e) => setShop({ ...shop, whatsapp: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("admin:settings.fields.address")}</Label>
            <Input value={shop.address} onChange={(e) => setShop({ ...shop, address: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin:settings.hoursTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>{t("admin:settings.fields.monfri")}</Label>
            <Input value={shop.hours.monfri} onChange={(e) => setShop({ ...shop, hours: { ...shop.hours, monfri: e.target.value } })} />
          </div>
          <div>
            <Label>{t("admin:settings.fields.sat")}</Label>
            <Input value={shop.hours.sat} onChange={(e) => setShop({ ...shop, hours: { ...shop.hours, sat: e.target.value } })} />
          </div>
          <div>
            <Label>{t("admin:settings.fields.sun")}</Label>
            <Input value={shop.hours.sun} onChange={(e) => setShop({ ...shop, hours: { ...shop.hours, sun: e.target.value } })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin:settings.generalTitle")}</CardTitle>
          <CardDescription>{t("admin:settings.thresholdHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="max-w-xs">
          <Label>{t("admin:settings.fields.threshold")}</Label>
          <Input type="number" min={0} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? t("admin:settings.saving") : t("admin:settings.save")}
      </Button>
    </form>
  );
}
