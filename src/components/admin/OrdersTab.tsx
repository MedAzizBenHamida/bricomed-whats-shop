import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersQuery, type Order } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function normalizePhone(raw: string | null | undefined) {
  const digits = (raw ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 8) return `216${digits}`;
  return digits.length >= 8 ? digits : null;
}

function orderRef(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function openWhatsApp(o: Order, message: string, invalidPhoneMsg: string) {
  const phone = normalizePhone(o.customer_phone);
  if (!phone) {
    toast.error(invalidPhoneMsg);
    return;
  }
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
}

export function OrdersTab() {
  const { t } = useTranslation(["admin", "common"]);
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery(ordersQuery);
  const [filter, setFilter] = useState<"all" | Order["status"]>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["stock_movements"] });
    qc.invalidateQueries({ queryKey: ["activity_logs"] });

  };

  const confirm = async (o: Order) => {
    const { error } = await supabase.rpc("confirm_order", { _order_id: o.id });
    if (error) return toast.error(error.message);
    toast.success(t("admin:orders.toasts.confirmed"));
    refresh();
  };

  const cancel = async (o: Order) => {
    const { error } = await supabase.rpc("cancel_order", { _order_id: o.id });
    if (error) return toast.error(error.message);
    toast.success(t("admin:orders.toasts.cancelled"));
    refresh();
  };

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">{t("admin:orders.tabs.all", { count: orders.length })}</TabsTrigger>
          <TabsTrigger value="pending">{t("admin:orders.tabs.pending", { count: orders.filter((o) => o.status === "pending").length })}</TabsTrigger>
          <TabsTrigger value="confirmed">{t("admin:orders.tabs.confirmed", { count: orders.filter((o) => o.status === "confirmed").length })}</TabsTrigger>
          <TabsTrigger value="cancelled">{t("admin:orders.tabs.cancelled", { count: orders.filter((o) => o.status === "cancelled").length })}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filtered.map((o) => {
          const isOpen = expanded === o.id;
          return (
            <Card key={o.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{o.customer_name}</CardTitle>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {o.customer_phone} · {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold">{formatPrice(Number(o.total))}</span>
                    <Badge variant={o.status === "confirmed" ? "default" : o.status === "pending" ? "secondary" : "outline"}>
                      {t(`admin:orders.status.${o.status}`)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="ghost" size="sm" onClick={() => setExpanded(isOpen ? null : o.id)}>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {t("admin:orders.details", { count: o.order_items?.length ?? 0, plural: (o.order_items?.length ?? 0) > 1 ? "s" : "" })}
                </Button>
                {isOpen && (
                  <div className="space-y-2 rounded-lg border bg-secondary/40 p-3 text-sm">
                    {o.governorate && <p><strong>{t("admin:orders.governorate")}</strong> {o.governorate}</p>}
                    {o.customer_address && <p><strong>{t("admin:orders.address")}</strong> {o.customer_address}</p>}
                    {o.notes && <p><strong>{t("admin:orders.notes")}</strong> {o.notes}</p>}
                    <ul className="mt-2 divide-y">
                      {o.order_items?.map((it) => (
                        <li key={it.id} className="flex justify-between py-2">
                          <span>{it.product_name} × {it.quantity}</span>
                          <span className="font-medium">{formatPrice(it.quantity * Number(it.unit_price))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {o.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => confirm(o)}>
                      <CheckCircle2 className="h-4 w-4" /> {t("admin:orders.confirm")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => cancel(o)}>
                      <XCircle className="h-4 w-4" /> {t("admin:orders.cancel")}
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {o.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        openWhatsApp(
                          o,
                          t("admin:orders.whatsapp.confirmed", {
                            name: o.customer_name,
                            ref: orderRef(o.id),
                            total: Number(o.total).toFixed(3).replace(/\.?0+$/, ""),
                          }),
                          t("admin:orders.toasts.invalidPhone"),
                        )
                      }
                    >
                      <MessageCircle className="h-4 w-4" /> {t("admin:orders.informClient")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      openWhatsApp(
                        o,
                        t("admin:orders.whatsapp.unavailable", {
                          name: o.customer_name,
                          ref: orderRef(o.id),
                        }),
                        t("admin:orders.toasts.invalidPhone"),
                      )
                    }
                  >
                    <MessageCircle className="h-4 w-4" /> {t("admin:orders.informUnavailability")}
                  </Button>
                </div>

              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("admin:orders.empty")}</p>
        )}
      </div>
    </div>
  );
}
