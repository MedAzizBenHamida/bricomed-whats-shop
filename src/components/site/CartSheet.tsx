import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, Trash2, MessageCircle, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { SHOP, formatPrice, waLink } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, setQty, remove, clear, total } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const buildMessage = (orderId?: string) => {
    const lines = items.map((i) => `• ${i.name} x${i.qty} : ${formatPrice(i.qty * i.price)}`).join("\n");
    const ref = orderId ? `\nRéf. commande : ${orderId.slice(0, 8).toUpperCase()}\n` : "";
    const infos = `\nNom : ${name}\nTéléphone : ${phone}${address ? `\nAdresse : ${address}` : ""}${notes ? `\nNotes : ${notes}` : ""}`;
    return `Bonjour ${SHOP.name},\n\nJe souhaite commander :\n\n${lines}\n\nTotal : ${formatPrice(total)}${ref}${infos}\n\nMerci de confirmer la disponibilité.`;
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Nom et téléphone requis");
      return;
    }
    setSending(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_address: address.trim() || null,
        notes: notes.trim() || null,
        total,
      })
      .select()
      .single();
    if (error || !order) {
      setSending(false);
      toast.error("Impossible d'enregistrer la commande");
      return;
    }
    const payload = items.map((i) => ({
      order_id: order.id,
      product_id: i.id,
      product_name: i.name,
      unit_price: i.price,
      quantity: i.qty,
    }));
    await supabase.from("order_items").insert(payload);
    window.open(waLink(buildMessage(order.id)), "_blank");
    setSending(false);
    clear();
    setName(""); setPhone(""); setAddress(""); setNotes("");
    onOpenChange(false);
    toast.success("Commande enregistrée — en attente de confirmation");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-6">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Mon panier
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Votre panier est vide</p>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {items.map((i) => (
                  <li key={i.id} className="flex gap-3 rounded-lg border p-3">
                    {i.image && <img src={i.image} alt={i.name} className="h-16 w-16 rounded-md object-cover" />}
                    <div className="flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{i.name}</p>
                      <p className="mt-0.5 text-sm font-semibold text-primary">{formatPrice(i.price)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(i.id, i.qty - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{i.qty}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(i.id, i.qty + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(i.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-3 border-t pt-4">
                <div>
                  <Label>Votre nom</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216..." />
                </div>
                <div>
                  <Label>Adresse (optionnel)</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div>
                  <Label>Notes (optionnel)</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="flex-col gap-3 border-t p-6 sm:flex-col sm:space-x-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-bold">{formatPrice(total)}</span>
            </div>
            <Button size="lg" className="w-full" disabled={sending} onClick={submit}>
              <MessageCircle className="h-5 w-5" /> {sending ? "Envoi…" : "Commander via WhatsApp"}
            </Button>
            <Button variant="ghost" size="sm" onClick={clear}>Vider le panier</Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
