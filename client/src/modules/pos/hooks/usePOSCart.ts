import { useState, useCallback, useMemo, useEffect } from "react";
import type {
  CartLine,
  CartSummary,
  AppliedOffer,
  ProductSearchResult,
  PaymentMethodKey,
  SalesPolicy,
  POSConfig,
} from "@/modules/pos/types";

interface UsePOSCartOptions {
  salesPolicy?: SalesPolicy;
  config?: POSConfig;
  onCartChange?: (cart: CartLine[]) => void;
  onError?: (message: string) => void;
  getApplicableOffers?: (
    productId: number,
    quantity: number
  ) => Promise<AppliedOffer[]>;
  getProductUnits?: (productId: number) => Promise<
    Array<{
      id: number;
      unitId: number;
      unitName: string;
      conversionFactor: number;
      isBase: boolean;
    }>
  >;
}

export function usePOSCart(options: UsePOSCartOptions = {}) {
  const {
    salesPolicy,
    config,
    onCartChange,
    onError,
    getApplicableOffers,
    getProductUnits,
  } = options;

  const [cart, setCart] = useState<CartLine[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: number;
    name: string;
    code: string;
    balance: number;
    creditLimit: number;
    loyaltyPoints: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [payments, setPayments] = useState<
    Array<{ method: PaymentMethodKey; amount: number; reference?: string }>
  >([]);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loyaltyPointsRedeemed, setLoyaltyPointsRedeemed] = useState(0);

  const maxGlobalDiscountPercent = salesPolicy?.maxDiscountPercent ?? 100;
  const maxLineDiscountPercent = salesPolicy?.maxLineDiscountPercent ?? 100;
  const allowNegativeStock = salesPolicy?.allowNegativeStock ?? false;
  const roundingMethod = config?.roundingMethod ?? "none";
  const roundingPrecision = config?.roundingPrecision ?? 2;

  const round = useCallback(
    (value: number) => {
      const precision = Math.pow(10, roundingPrecision);
      switch (roundingMethod) {
        case "round":
          return Math.round(value * precision) / precision;
        case "floor":
          return Math.floor(value * precision) / precision;
        case "ceil":
          return Math.ceil(value * precision) / precision;
        default:
          return value;
      }
    },
    [roundingMethod, roundingPrecision]
  );

  const calculateLineTotals = useCallback(
    (line: CartLine) => {
      const baseTotal = line.unitPrice * line.quantity;
      const discountAmount =
        line.discount + (line.discountPercent / 100) * baseTotal;
      const taxableAmount = baseTotal - discountAmount;
      const taxAmount = taxableAmount * (line.taxRate / 100);
      const lineTotal = baseTotal;
      const lineNetTotal = taxableAmount + taxAmount;

      const offerDiscount = line.appliedOffers.reduce((sum, offer) => {
        if (offer.discountType === "percent") {
          return sum + (baseTotal * offer.discountValue) / 100;
        } else if (offer.discountType === "fixed") {
          return sum + offer.discountValue * offer.appliedQuantity;
        }
        return sum;
      }, 0);

      return {
        baseTotal: round(baseTotal),
        discountAmount: round(discountAmount),
        taxAmount: round(taxAmount),
        lineTotal: round(lineTotal),
        lineNetTotal: round(lineNetTotal),
        offerDiscount: round(offerDiscount),
        finalTotal: round(lineNetTotal - offerDiscount),
      };
    },
    [round]
  );

  const summary = useMemo((): CartSummary => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let total = 0;
    let itemCount = 0;
    let totalQuantity = 0;
    let loyaltyPointsEarned = 0;
    const loyaltyPointsRedeemedTotal = loyaltyPointsRedeemed;

    cart.forEach(line => {
      const totals = calculateLineTotals(line);
      subtotal += totals.baseTotal;
      totalDiscount += totals.discountAmount + totals.offerDiscount;
      totalTax += totals.taxAmount;
      total += totals.finalTotal;
      itemCount++;
      totalQuantity += line.quantity;
      loyaltyPointsEarned += Math.floor(
        totals.finalTotal * (config?.currency === "YER" ? 0.01 : 0.1)
      );
    });

    const globalDiscountAmount =
      globalDiscount > 1
        ? globalDiscount
        : (subtotal * globalDiscountPercent) / 100;

    totalDiscount += globalDiscountAmount;
    total = round(
      total -
        globalDiscountAmount -
        loyaltyPointsRedeemedTotal * (config?.currency === "YER" ? 10 : 0.1)
    );

    return {
      subtotal: round(subtotal),
      totalDiscount: round(totalDiscount),
      totalTax: round(totalTax),
      total: Math.max(0, round(total)),
      itemCount,
      totalQuantity,
      loyaltyPointsEarned,
      loyaltyPointsRedeemed: loyaltyPointsRedeemedTotal,
    };
  }, [
    cart,
    globalDiscount,
    globalDiscountPercent,
    loyaltyPointsRedeemed,
    calculateLineTotals,
    config?.currency,
    round,
  ]);

  const due = useMemo(() => {
    const totalPaid =
      payments.reduce((sum, p) => sum + p.amount, 0) + paidAmount;
    return Math.max(0, summary.total - totalPaid);
  }, [summary.total, payments, paidAmount]);

  const change = useMemo(() => {
    const totalPaid =
      payments.reduce((sum, p) => sum + p.amount, 0) + paidAmount;
    return Math.max(0, totalPaid - summary.total);
  }, [summary.total, payments, paidAmount]);

  const canCompleteSale = useMemo(() => {
    if (cart.length === 0) return false;
    if (due > 0.01 && paymentMethod !== "credit") return false;
    if (selectedCustomer && paymentMethod === "credit") {
      const newBalance = (selectedCustomer.balance || 0) + due;
      if (newBalance > (selectedCustomer.creditLimit || Infinity)) return false;
    }
    return true;
  }, [cart.length, due, paymentMethod, selectedCustomer]);

  const addToCart = useCallback(
    async (product: ProductSearchResult, quantity = 1) => {
      const stock = product.currentStock || 0;

      if (product.type === "goods" && !allowNegativeStock && stock <= 0) {
        onError?.(`المنتج "${product.name}" نفد من المخزون`);
        return false;
      }

      setCart(prev => {
        const existingIndex = prev.findIndex(l => l.productId === product.id);

        const newLine: CartLine = {
          id: crypto.randomUUID(),
          productId: product.id,
          productCode: product.code,
          name: product.name,
          nameAr: product.nameAr,
          unitPrice: product.salePrice,
          quantity,
          discount: 0,
          discountPercent: 0,
          taxRate: product.taxRate || 0,
          taxAmount: 0,
          stock,
          type: product.type,
          category: product.category,
          unitId: product.unitId,
          unitName: product.unitName,
          conversionFactor: product.conversionFactor || 1,
          baseQuantity: quantity * (product.conversionFactor || 1),
          imageUrl: product.imageUrl,
          barcode: product.barcode,
          appliedOffers: [],
          originalUnitPrice: product.salePrice,
          priceOverride: false,
          quantityOverride: false,
          lineTotal: 0,
          lineNetTotal: 0,
          loyaltyPoints: product.loyaltyPoints || 0,

          // Advanced inventory fields (defaults)
          isSerialized: false,
          isBatched: false,
          isMatrix: false,
          requiresSerialEntry: false,
          requiresBatchEntry: false,
        };

        if (existingIndex >= 0) {
          const updated = [...prev];
          const existing = updated[existingIndex];
          const newQty = existing.quantity + quantity;

          if (
            product.type === "goods" &&
            !allowNegativeStock &&
            newQty > stock
          ) {
            onError?.(`الكمية المتاحة من "${product.name}" هي ${stock}`);
            return prev;
          }

          updated[existingIndex] = {
            ...existing,
            quantity: newQty,
            baseQuantity: newQty * existing.conversionFactor,
          };
          return updated;
        }

        return [...prev, newLine];
      });

      return true;
    },
    [allowNegativeStock, onError]
  );

  const updateQuantity = useCallback(
    (lineId: string, quantity: number) => {
      setCart(prev =>
        prev.map(line => {
          if (line.id !== lineId) return line;

          if (quantity < 1) return line;

          if (
            line.type === "goods" &&
            !allowNegativeStock &&
            quantity > line.stock
          ) {
            onError?.(`الكمية المتاحة هي ${line.stock}`);
            return line;
          }

          return {
            ...line,
            quantity,
            baseQuantity: quantity * line.conversionFactor,
            quantityOverride: true,
          };
        })
      );
    },
    [allowNegativeStock, onError]
  );

  const changeQuantity = useCallback(
    (lineId: string, delta: number) => {
      setCart(prev =>
        prev.map(line => {
          if (line.id !== lineId) return line;
          const next = line.quantity + delta;
          if (next < 1) return line;
          if (
            line.type === "goods" &&
            !allowNegativeStock &&
            next > line.stock
          ) {
            onError?.(`الكمية المتاحة هي ${line.stock}`);
            return line;
          }
          return {
            ...line,
            quantity: next,
            baseQuantity: next * line.conversionFactor,
          };
        })
      );
    },
    [allowNegativeStock, onError]
  );

  const setLineDiscount = useCallback(
    (lineId: string, discount: number, isPercent = false) => {
      setCart(prev =>
        prev.map(line => {
          if (line.id !== lineId) return line;

          const baseTotal = line.unitPrice * line.quantity;
          const maxDiscount = isPercent ? maxLineDiscountPercent : baseTotal;

          let newDiscount = Math.max(0, Math.min(discount, maxDiscount));
          let newDiscountPercent = isPercent
            ? newDiscount
            : baseTotal > 0
              ? (newDiscount / baseTotal) * 100
              : 0;

          if (!isPercent) {
            newDiscountPercent = Math.min(
              newDiscountPercent,
              maxLineDiscountPercent
            );
            newDiscount = (baseTotal * newDiscountPercent) / 100;
          }

          return {
            ...line,
            discount: newDiscount,
            discountPercent: newDiscountPercent,
          };
        })
      );
    },
    [maxLineDiscountPercent]
  );

  const setLinePrice = useCallback(
    (lineId: string, price: number) => {
      if (!salesPolicy?.allowPriceOverride) {
        onError?.("تعديل السعر غير مسموح");
        return;
      }
      setCart(prev =>
        prev.map(line =>
          line.id === lineId
            ? { ...line, unitPrice: price, priceOverride: true }
            : line
        )
      );
    },
    [salesPolicy?.allowPriceOverride, onError]
  );

  const removeLine = useCallback((lineId: string) => {
    setCart(prev => prev.filter(line => line.id !== lineId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setGlobalDiscount(0);
    setGlobalDiscountPercent(0);
    setSelectedCustomer(null);
    setPaymentMethod("cash");
    setPaidAmount(0);
    setPayments([]);
    setHoldId(null);
    setNotes("");
    setLoyaltyPointsRedeemed(0);
  }, []);

  const applyGlobalDiscount = useCallback(
    (value: number, isPercent = false) => {
      const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
      const maxDiscount = isPercent ? maxGlobalDiscountPercent : subtotal;

      if (isPercent) {
        setGlobalDiscountPercent(
          Math.max(0, Math.min(value, maxGlobalDiscountPercent))
        );
        setGlobalDiscount(0);
      } else {
        setGlobalDiscount(Math.max(0, Math.min(value, maxDiscount)));
        setGlobalDiscountPercent(0);
      }
    },
    [cart, maxGlobalDiscountPercent]
  );

  const addPayment = useCallback(
    (method: PaymentMethodKey, amount: number, reference?: string) => {
      const totalDue = due;
      const actualAmount = Math.min(amount, totalDue);

      if (actualAmount <= 0) return false;

      setPayments(prev => [
        ...prev,
        { method, amount: actualAmount, reference },
      ]);
      return true;
    },
    [due]
  );

  const removePayment = useCallback((index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const applyLoyaltyPoints = useCallback(
    (points: number) => {
      const maxPoints = Math.min(
        selectedCustomer?.loyaltyPoints || 0,
        Math.floor(summary.total / (config?.currency === "YER" ? 10 : 0.1)),
        summary.total * (salesPolicy?.loyaltyRedemptionRate || 1)
      );
      setLoyaltyPointsRedeemed(Math.max(0, Math.min(points, maxPoints)));
    },
    [
      selectedCustomer?.loyaltyPoints,
      summary.total,
      config?.currency,
      salesPolicy?.loyaltyRedemptionRate,
    ]
  );

  const fetchOffersForLine = useCallback(
    async (lineId: string) => {
      if (!getApplicableOffers) return;

      setCart(prev => {
        return prev.map(line => {
          if (line.id !== lineId) return line;
          return line; // Return unchanged, will be updated async
        });
      });

      // Fetch offers asynchronously and update
      const line = cart.find(l => l.id === lineId);
      if (line) {
        const offers = await getApplicableOffers(line.productId, line.quantity);
        setCart(prev =>
          prev.map(l => (l.id === lineId ? { ...l, appliedOffers: offers } : l))
        );
      }
    },
    [getApplicableOffers, cart]
  );

  const fetchProductUnits = useCallback(
    async (productId: number) => {
      if (!getProductUnits) return [];
      return getProductUnits(productId);
    },
    [getProductUnits]
  );

  const setUnit = useCallback(
    (
      lineId: string,
      unitId: number,
      units: Array<{
        id: number;
        unitId: number;
        unitName: string;
        conversionFactor: number;
        isBase: boolean;
      }>
    ) => {
      const unit = units.find(u => u.id === unitId);
      if (!unit) return;

      setCart(prev =>
        prev.map(line => {
          if (line.id !== lineId) return line;
          return {
            ...line,
            unitId: unit.id,
            unitName: unit.unitName,
            conversionFactor: unit.conversionFactor,
            baseQuantity: line.quantity * unit.conversionFactor,
          };
        })
      );
    },
    []
  );

  const getCartForSubmission = useCallback(() => {
    const totalPaidNow =
      payments.reduce((sum, p) => sum + p.amount, 0) + paidAmount;
    const taxableBase =
      summary.subtotal -
        Number(
          (globalDiscount > 1
            ? globalDiscount
            : (summary.subtotal * globalDiscountPercent) / 100
          ).toFixed(2)
        ) >
      0
        ? summary.subtotal -
          Number(
            (globalDiscount > 1
              ? globalDiscount
              : (summary.subtotal * globalDiscountPercent) / 100
            ).toFixed(2)
          )
        : 0;
    const blendedTaxRate =
      taxableBase > 0
        ? ((summary.totalTax / taxableBase) * 100).toFixed(2)
        : "0";

    return {
      customerId: selectedCustomer?.id,
      items: cart.map(line => {
        const totals = calculateLineTotals(line);
        return {
          productId: line.productId,
          productName: line.name,
          productNameAr: line.nameAr,
          quantity: line.quantity,
          unitPrice: line.unitPrice.toString(),
          discount: totals.discountAmount.toString(),
          discountPercent: line.discountPercent.toString(),
          taxRate: line.taxRate.toString(),
          taxAmount: totals.taxAmount.toString(),
          total: totals.finalTotal.toString(),
          unitId: line.unitId,
          unitName: line.unitName,
          conversionFactor: line.conversionFactor,
          appliedOffers: line.appliedOffers,
        };
      }),
      paymentMethod,
      paidAmount: summary.total - due,
      discount:
        globalDiscount > 1
          ? globalDiscount.toString()
          : ((summary.subtotal * globalDiscountPercent) / 100).toString(),
      taxRate: blendedTaxRate,
      payments: payments.map(p => ({
        method: p.method,
        amount: p.amount.toString(),
        reference: p.reference,
      })),
      notes,
      loyaltyPointsRedeemed,
      holdId,
      summary: {
        subtotal: summary.subtotal,
        totalDiscount: summary.totalDiscount,
        totalTax: summary.totalTax,
        total: summary.total,
        itemCount: summary.itemCount,
        totalQuantity: summary.totalQuantity,
        loyaltyPointsEarned: summary.loyaltyPointsEarned,
        loyaltyPointsRedeemed: summary.loyaltyPointsRedeemed,
      },
      _paidNow: totalPaidNow,
    };
  }, [
    cart,
    selectedCustomer,
    paymentMethod,
    summary,
    due,
    payments,
    globalDiscount,
    globalDiscountPercent,
    notes,
    loyaltyPointsRedeemed,
    paidAmount,
    holdId,
    calculateLineTotals,
  ]);

  // Restore a persisted hold/cart snapshot (server pos_held_carts.snapshot JSON)
  const restoreSnapshot = useCallback((snap: any) => {
    if (!snap) return;
    if (Array.isArray(snap.cart)) {
      setCart(snap.cart);
    }
    if (typeof snap.globalDiscount === "number")
      setGlobalDiscount(snap.globalDiscount);
    if (typeof snap.globalDiscountPercent === "number")
      setGlobalDiscountPercent(snap.globalDiscountPercent);
    if (snap.selectedCustomer) setSelectedCustomer(snap.selectedCustomer);
    if (snap.paymentMethod) setPaymentMethod(snap.paymentMethod);
    if (typeof snap.paidAmount === "number") setPaidAmount(snap.paidAmount);
    if (Array.isArray(snap.payments)) setPayments(snap.payments);
    if (typeof snap.notes === "string") setNotes(snap.notes);
    if (typeof snap.loyaltyPointsRedeemed === "number")
      setLoyaltyPointsRedeemed(snap.loyaltyPointsRedeemed);
  }, []);

  useEffect(() => {
    onCartChange?.(cart);
  }, [cart, onCartChange]);

  return {
    cart,
    summary,
    due,
    change,
    canCompleteSale,
    selectedCustomer,
    setSelectedCustomer,
    paymentMethod,
    setPaymentMethod,
    paidAmount,
    setPaidAmount,
    payments,
    addPayment,
    removePayment,
    globalDiscount,
    globalDiscountPercent,
    setGlobalDiscount: (v: number) => applyGlobalDiscount(v, false),
    setGlobalDiscountPercent: (v: number) => applyGlobalDiscount(v, true),
    notes,
    setNotes,
    holdId,
    setHoldId,
    loyaltyPointsRedeemed,
    setLoyaltyPointsRedeemed: applyLoyaltyPoints,
    addToCart,
    updateQuantity,
    changeQuantity,
    setLineDiscount,
    setLinePrice,
    removeLine,
    clearCart,
    calculateLineTotals,
    fetchOffersForLine,
    fetchProductUnits,
    setUnit,
    getCartForSubmission,
    restoreSnapshot,
    round,
  };
}
