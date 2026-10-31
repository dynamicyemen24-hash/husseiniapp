import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";

type WishlistItem = { id: number; name: string; code: string; price: number };
type WishlistContextValue = {
  items: WishlistItem[];
  has: (id: number) => boolean;
  toggle: (item: WishlistItem) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const KEY = "alhusainia:wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as WishlistItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // حجم التخزين ممتلئ أو غير متاح — نتجاهل بصمت
    }
  }, [items]);

  const has = useCallback(
    (id: number) => items.some(i => i.id === id),
    [items]
  );
  const toggle = useCallback((item: WishlistItem) => {
    setItems(prev =>
      prev.some(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
    );
  }, []);
  const clear = useCallback(() => setItems([]), []);

  return (
    <WishlistContext.Provider value={{ items, has, toggle, clear }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
