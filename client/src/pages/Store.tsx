import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { openPrintableInvoiceWindow } from "@/lib/pdfInvoiceGenerator";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  Store as StoreIcon,
  Phone,
  MapPin,
  User,
  PackageCheck,
  ChefHat,
  Info,
  Heart,
} from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import { fmtYER } from "@/lib/format";

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  salePrice: string;
  currentStock: number;
}

export default function Store() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [category, setCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placed, setPlaced] = useState<{ orderNumber: string } | null>(null);
  const [lastPhone, setLastPhone] = useState("");
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const {
    items: wishlistItems,
    has: hasWishlist,
    toggle: toggleWishlist,
  } = useWishlist();

  const catalog = trpc.store.catalog.useQuery(
    {
      search: debouncedSearch || undefined,
      category: category === "all" ? undefined : category,
    },
    {
      placeholderData: (prev: any) => prev,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );
  const placeOrder = trpc.store.placeOrder.useMutation({
    onSuccess: res => {
      setPlaced(res);
      setCart([]);
      setCartOpen(false);
      setCheckoutOpen(false);
      catalog.refetch();
    },
    onError: (e: any) => toast.error(String(e?.message || "تعذر إرسال الطلب")),
  });

  const items = catalog.data?.items ?? [];
  const categories = catalog.data?.categories ?? [];
  const cartCount = cart.reduce((s, it) => s + it.quantity, 0);
  const cartTotal = cart.reduce(
    (s, it) => s + parseFloat(it.salePrice) * it.quantity,
    0
  );

  const fmt = (v: any) => fmtYER(v);

  const addToCart = (p: any) => {
    const stock = p.currentStock ?? 0;
    if (stock <= 0) {
      toast.error("هذا الصنف غير متوفر حالياً");
      return;
    }
    let added = false;
    setCart(prev => {
      const found = prev.find(it => it.productId === p.id);
      if (found) {
        if (found.quantity >= stock) {
          toast.error("الكمية المتوفرة محدودة");
          return prev;
        }
        added = true;
        return prev.map(it =>
          it.productId === p.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      added = true;
      return [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          quantity: 1,
          salePrice: p.salePrice || "0",
          currentStock: stock,
        },
      ];
    });
    if (added) toast.success("تمت الإضافة إلى السلة");
  };

  const changeQty = (productId: number, delta: number) => {
    setCart(prev =>
      prev.map(it => {
        if (it.productId !== productId) return it;
        const next = it.quantity + delta;
        if (next <= 0) return it;
        if (next > it.currentStock) {
          toast.error("الكمية المتوفرة محدودة");
          return it;
        }
        return { ...it, quantity: next };
      })
    );
  };

  const removeFromCart = (productId: number) =>
    setCart(prev => prev.filter(it => it.productId !== productId));

  const submitOrder = () => {
    if (cart.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    const name = (
      document.getElementById("cust-name") as HTMLInputElement
    )?.value?.trim();
    if (!name) {
      toast.error("يرجى إدخال الاسم");
      return;
    }
    const phone = (
      document.getElementById("cust-phone") as HTMLInputElement
    )?.value?.trim();
    if (!phone) {
      toast.error("يرجى إدخال رقم الهاتف للتواصل");
      return;
    }
    if (phone.replace(/\D/g, "").length < 7) {
      toast.error("رقم الهاتف غير صحيح");
      return;
    }
    const address = (
      document.getElementById("cust-address") as HTMLInputElement
    )?.value;
    const notes = (document.getElementById("cust-notes") as HTMLInputElement)
      ?.value;
    setLastPhone(phone);
    placeOrder.mutate({
      customerName: name,
      customerPhone: phone || undefined,
      deliveryAddress: address || undefined,
      notes: notes || undefined,
      items: cart.map(it => ({
        productId: it.productId,
        quantity: it.quantity,
      })),
    });
  };

  const cartList = (
    <div className="space-y-3">
      {cart.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-6">السلة فارغة</p>
      )}
      {cart.map(it => (
        <div
          key={it.productId}
          className="flex items-center justify-between p-2 bg-white rounded-lg border"
        >
          <div className="min-w-0">
            <p className="font-bold text-xs text-ink truncate">
              {it.productName}
            </p>
            <p className="text-[10px] text-gray-500">
              {fmt(it.salePrice)} × {it.quantity}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="outline"
              className="w-6 h-6"
              onClick={() => changeQty(it.productId, -1)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-xs font-bold w-6 text-center">
              {it.quantity}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="w-6 h-6"
              onClick={() => changeQty(it.productId, 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="w-6 h-6 text-red-500"
              onClick={() => removeFromCart(it.productId)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ))}
      {cart.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-bold text-ink">الإجمالي</span>
          <span className="text-sm font-bold text-brand">
            {fmt(cartTotal)}{" "}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-sand flex" dir="rtl">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="bg-ink-800 text-white border-b border-ink-600 shadow-sm py-2 px-4 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <StoreIcon className="w-4 h-4 text-brand-300" />
              <span className="font-bold">
                كتالوج المنتجات والخدمات الاستشارية والمكتبية
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-white border-white/30 h-7 text-xs bg-ink hover:bg-ink-600 relative"
                onClick={() => setWishlistOpen(true)}
              >
                <Heart
                  className={`w-3.5 h-3.5 ml-1 ${wishlistItems.length > 0 ? "fill-red-500 text-red-500" : ""}`}
                />
                <span>المفضلة</span>
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {wishlistItems.length}
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-white border-white/30 h-7 text-xs bg-ink hover:bg-ink-600"
                onClick={() => setLocation("/about")}
              >
                <Info className="w-3 h-3 ml-1 text-brand-300" />
                عن المؤسسة
              </Button>
              <Button
                size="sm"
                className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep relative h-7 font-bold text-xs"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="w-3.5 h-3.5 ml-1" />
                <span>سلة الطلبات</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        <main className="max-w-6xl mx-auto w-full p-3">
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="ابحث عن منتج..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-white border-gray-200 pr-10 h-10 text-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
            <button
              onClick={() => setCategory("all")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${category === "all" ? "bg-ink text-white border-ink" : "bg-white text-gray-600 border-gray-200"}`}
            >
              الكل
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${category === c ? "bg-ink text-white border-ink" : "bg-white text-gray-600 border-gray-200"}`}
              >
                {c}
              </button>
            ))}
          </div>

          {catalog.isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div
                  key={i}
                  className="h-44 bg-gray-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          )}

          {catalog.isError && (
            <div className="text-center py-16">
              <StoreIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-3">
                تعذر تحميل المنتجات — تحقق من اتصالك بالإنترنت
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => catalog.refetch()}
              >
                إعادة المحاولة
              </Button>
            </div>
          )}

          {!catalog.isLoading && !catalog.isError && items.length === 0 && (
            <div className="text-center py-16">
              <StoreIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                لا توجد منتجات متاحة حالياً — تابعنا قريباً
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((p: any) => {
              const stock = p.currentStock ?? 0;
              const out = stock <= 0;
              const low = !out && stock <= (p.minStock ?? 0);
              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-xl border shadow-sm p-3 flex flex-col ${out ? "opacity-70" : ""}`}
                >
                  <div className="w-full h-16 bg-ink/5 rounded-lg flex items-center justify-center mb-2">
                    <ChefHat className="w-7 h-7 text-brand" />
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <Badge
                      variant="outline"
                      className="text-[9px] text-gray-400 px-1.5 py-0"
                    >
                      {p.code}
                    </Badge>
                    {out ? (
                      <Badge className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0">
                        نفد المخزون
                      </Badge>
                    ) : low ? (
                      <Badge className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0">
                        كمية محدودة
                      </Badge>
                    ) : (
                      <Badge className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0">
                        متوفر
                      </Badge>
                    )}
                  </div>
                  <p className="font-bold text-sm text-ink leading-snug">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-gray-500 mb-2">
                    {p.category || "عام"} • {p.unit}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div>
                      <span className="font-extrabold text-brand text-sm">
                        {fmt(p.salePrice)}
                      </span>
                      <span className="text-[9px] text-gray-400 mr-1">
                        ر.ي / {p.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-7 h-7"
                        onClick={() => {
                          toggleWishlist({
                            id: p.id,
                            name: p.name,
                            code: p.code,
                            price: parseFloat(p.salePrice || "0"),
                          });
                          toast.success(
                            hasWishlist(p.id)
                              ? "أُزيل من المفضلة"
                              : "أُضيف إلى المفضلة"
                          );
                        }}
                        aria-label="المفضلة"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${hasWishlist(p.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`}
                        />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-ink hover:bg-ink-600 h-7 px-2 text-[11px]"
                        disabled={out}
                        onClick={() => addToCart(p)}
                      >
                        <Plus className="w-3 h-3 ml-1" />
                        أضف
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Cart drawer */}
        {cartOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setCartOpen(false)}
          >
            <div
              className="absolute left-0 top-0 h-full w-full max-w-sm bg-sand shadow-2xl p-4 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm text-ink flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-brand" />
                  سلة التسوق
                </h2>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7"
                  onClick={() => setCartOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">{cartList}</div>
              <Button
                className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold mt-3"
                disabled={cart.length === 0}
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
              >
                إتمام الطلب
              </Button>
            </div>
          </div>
        )}

        {/* Wishlist dialog */}
        <Dialog open={wishlistOpen} onOpenChange={setWishlistOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-ink flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                المفضلة ({wishlistItems.length})
              </DialogTitle>
              <DialogDescription className="text-xs">
                المنتجات التي حفظتها — محفوظة محلياً على جهازك
              </DialogDescription>
            </DialogHeader>
            {wishlistItems.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">قائمة المفضلة فارغة</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {wishlistItems.map(it => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">{it.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {it.code} • {fmtYER(it.price)}{" "}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-red-500"
                      onClick={() => toggleWishlist(it)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => setWishlistOpen(false)}
              >
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Checkout dialog */}
        <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-ink">بيانات التوصيل</DialogTitle>
              <DialogDescription className="text-xs">
                سنتواصل معك لتأكيد الطلب قبل التوصيل
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  <User className="w-3 h-3 inline ml-1" />
                  الاسم الكامل *
                </Label>
                <Input
                  id="cust-name"
                  placeholder="مثال: أحمد محمد"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  <Phone className="w-3 h-3 inline ml-1" />
                  رقم الهاتف
                </Label>
                <Input
                  id="cust-phone"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  <MapPin className="w-3 h-3 inline ml-1" />
                  عنوان التوصيل
                </Label>
                <Input
                  id="cust-address"
                  placeholder="الحي، الشارع، رقم المنزل"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ملاحظات</Label>
                <Input
                  id="cust-notes"
                  placeholder="أي تفاصيل إضافية"
                  className="h-9 text-sm"
                />
              </div>
              <div className="bg-white rounded-lg border p-3">
                <p className="text-xs font-bold text-ink mb-2">
                  ملخص الطلب ({cartCount} صنف)
                </p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">الإجمالي</span>
                  <span className="font-bold text-brand">
                    {fmt(cartTotal)}{" "}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold"
                disabled={placeOrder.isPending}
                onClick={submitOrder}
              >
                {placeOrder.isPending ? "جارٍ إرسال الطلب..." : "تأكيد الطلب"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success dialog */}
        <Dialog
          open={!!placed}
          onOpenChange={v => {
            if (!v) setPlaced(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-ink flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-green-600" />
                تم استلام طلبك بنجاح!
              </DialogTitle>
              <DialogDescription className="text-xs">
                رقم الطلب:{" "}
                <b dir="ltr" className="text-ink">
                  {placed?.orderNumber}
                </b>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-xs text-gray-600">
              <p>سنتصل بك قريباً لتأكيد الطلب وتحديد موعد التوصيل.</p>
              <p>للمتابعة عبر واتساب اضغط الزر أدناه.</p>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => setPlaced(null)}
              >
                متابعة التسوق
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs border-brand text-brand-700 bg-amber-50 font-bold"
                onClick={() => {
                  if (placed) {
                    openPrintableInvoiceWindow({
                      invoiceNumber: placed.orderNumber,
                      invoiceDate: new Date().toISOString(),
                      customerName: "عميل المتجر الإلكتروني",
                      customerPhone: lastPhone,
                      institutionName: "اسم المنشأة",
                      currency: "ريال يمني (YER)",
                      items: [
                        {
                          description: `طلب جديد من المتجر (${placed.orderNumber})`,
                          quantity: 1,
                          unitPrice: 0,
                          totalPrice: 0,
                        },
                      ],
                      subtotal: 0,
                      total: 0,
                      notes: "تم إرسال الطلب إلكترونياً من متجر الحسينية",
                    });
                  }
                }}
              >
                طباعة السند بـ QR
              </Button>
              <a
                className="w-full inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white text-xs font-bold h-9 rounded-md"
                href={`https://wa.me/?text=${encodeURIComponent(`طلب جديد ${placed?.orderNumber} من متجر الحسينة — بانتظار التأكيد ${lastPhone ? `at ${lastPhone}` : ``}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                متابعة عبر واتساب
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
