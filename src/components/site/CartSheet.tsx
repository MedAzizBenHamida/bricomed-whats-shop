import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, MessageCircle, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { SHOP, formatPrice, waLink } from "@/lib/constants";

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, setQty, remove, clear, total } = useCart();

  const buildMessage = () => {
    const lines = items.map((i) => `• ${i.name} x${i.qty} : ${formatPrice(i.qty * i.price)}`).join("\n");
    return `Bonjour ${SHOP.name},\n\nJe souhaite commander :\n\n${lines}\n\nTotal : ${formatPrice(total)}\n\nMerci de confirmer la disponibilité.`;
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
            <ul className="space-y-4">
              {items.map((i) => (
                <li key={i.id} className="flex gap-3 rounded-lg border p-3">
                  {i.image && (
                    <img src={i.image} alt={i.name} className="h-16 w-16 rounded-md object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{i.name}</p>
                    <p className="mt-0.5 text-sm text-primary font-semibold">{formatPrice(i.price)}</p>
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
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="flex-col gap-3 border-t p-6 sm:flex-col sm:space-x-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-bold">{formatPrice(total)}</span>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => window.open(waLink(buildMessage()), "_blank")}
            >
              <MessageCircle className="h-5 w-5" /> Commander via WhatsApp
            </Button>
            <Button variant="ghost" size="sm" onClick={clear}>
              Vider le panier
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
