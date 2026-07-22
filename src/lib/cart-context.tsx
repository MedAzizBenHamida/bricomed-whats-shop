import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
};

const CartCtx = createContext<CartState | null>(null);
const KEY = "bricomed_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartState>(() => ({
    items,
    add: (item, qty = 1) =>
      setItems((cur) => {
        const found = cur.find((i) => i.id === item.id);
        if (found) return cur.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i));
        return [...cur, { ...item, qty }];
      }),
    remove: (id) => setItems((cur) => cur.filter((i) => i.id !== id)),
    setQty: (id, qty) =>
      setItems((cur) =>
        qty <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, qty } : i)),
      ),
    clear: () => setItems([]),
    count: items.reduce((a, b) => a + b.qty, 0),
    total: items.reduce((a, b) => a + b.qty * b.price, 0),
  }), [items]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
