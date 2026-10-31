import { useMemo, useState, useCallback } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Tag,
  Package,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/modules/pos/utils/currency";
import type { CartLine, AppliedOffer } from "@/modules/pos/types";

interface CartLineRowProps {
  line: CartLine;
  onQuantityChange: (id: string, quantity: number) => void;
  onDiscountChange: (id: string, discount: number, isPercent: boolean) => void;
  onPriceChange: (id: string, price: number) => void;
  onRemove: (id: string) => void;
  onUnitChange: (id: string, unitId: number) => void;
  units: Array<{
    id: number;
    unitId: number;
    unitName: string;
    conversionFactor: number;
    isBase: boolean;
  }>;
  allowPriceOverride: boolean;
  allowQuantityOverride: boolean;
  maxDiscountPercent: number;
  currency: string;
  decimals: number;
  showOffers: boolean;
}

export function CartLineRow({
  line,
  onQuantityChange,
  onDiscountChange,
  onPriceChange,
  onRemove,
  onUnitChange,
  units,
  allowPriceOverride,
  allowQuantityOverride,
  maxDiscountPercent,
  currency,
  decimals,
  showOffers = true,
}: CartLineRowProps) {
  const [showUnits, setShowUnits] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showPrice, setShowPrice] = useState(false);

  const baseTotal = line.unitPrice * line.quantity;
  const discountAmount =
    line.discount + (line.discountPercent / 100) * baseTotal;
  const taxableAmount = baseTotal - discountAmount;
  const taxAmount = taxableAmount * (line.taxRate / 100);
  const lineNetTotal = taxableAmount + taxAmount;

  const offerDiscount = line.appliedOffers.reduce((sum, offer) => {
    if (offer.discountType === "percent") {
      return sum + (baseTotal * offer.discountValue) / 100;
    } else if (offer.discountType === "fixed") {
      return sum + offer.discountValue * offer.appliedQuantity;
    }
    return sum;
  }, 0);

  const finalTotal = lineNetTotal - offerDiscount;

  const handleQuantityChange = (delta: number) => {
    if (!allowQuantityOverride && delta !== 0) return;
    onQuantityChange(line.id, Math.max(1, line.quantity + delta));
  };

  const handleDiscountInput = (value: string, isPercent: boolean) => {
    const num = parseFloat(value) || 0;
    onDiscountChange(line.id, num, isPercent);
  };

  const handlePriceInput = (value: string) => {
    if (!allowPriceOverride) return;
    const num = parseFloat(value) || 0;
    onPriceChange(line.id, num);
  };

  const selectedUnit = units.find(u => u.id === line.unitId);

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {line.name}
            </span>
            {line.nameAr && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {line.nameAr}
              </span>
            )}
            {line.type === "service" && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                <Package className="h-2.5 w-2.5 mr-0.5" /> خدمة
              </Badge>
            )}
            {line.priceOverride && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                <Tag className="h-2.5 w-2.5 mr-0.5" /> سعر معدل
              </Badge>
            )}
          </div>
          {line.category && (
            <span className="text-[10px] text-muted-foreground">
              {line.category}
            </span>
          )}
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
            <span>كود: {line.productCode}</span>
            {line.barcode && <span>باركود: {line.barcode}</span>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(line.id)}
          aria-label="حذف الصنف"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => handleQuantityChange(-1)}
            disabled={line.quantity <= 1}
            aria-label="تقليل الكمية"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Input
            type="number"
            className="w-14 text-center border-0 bg-transparent focus-visible:ring-0 text-sm font-mono"
            value={line.quantity}
            onChange={e =>
              onQuantityChange(
                line.id,
                Math.max(1, parseInt(e.target.value) || 1)
              )
            }
            min={1}
            max={line.type === "goods" ? line.stock : 9999}
            readOnly={!allowQuantityOverride}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => handleQuantityChange(1)}
            disabled={line.type === "goods" && line.quantity >= line.stock}
            aria-label="زيادة الكمية"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <span className="flex-1 text-right text-sm font-medium text-ink">
          {formatCurrency(finalTotal, currency, decimals)}
        </span>
      </div>

      {showUnits && units.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={line.unitId?.toString() || ""}
            onValueChange={v => onUnitChange(line.id, parseInt(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="الوحدة الأساسية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">الوحدة الأساسية</SelectItem>
              {units.map(u => (
                <SelectItem key={u.id} value={u.id.toString()}>
                  {u.unitName}{" "}
                  {u.isBase ? "(أساسية)" : `×${u.conversionFactor}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUnit && (
            <span className="text-[10px] text-muted-foreground">
              معامل التحويل ×{selectedUnit.conversionFactor}
            </span>
          )}
        </div>
      )}

      {showDiscount && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleDiscountInput("", false)}
          >
            <Tag className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-1 flex-1">
            <Input
              type="number"
              className="h-7 text-xs flex-1"
              placeholder="خصم ثابت"
              value={line.discount || ""}
              onChange={e => handleDiscountInput(e.target.value, false)}
              step={0.01}
              min={0}
              max={baseTotal}
            />
            <span className="text-[10px] text-muted-foreground">أو</span>
            <Input
              type="number"
              className="h-7 text-xs w-20"
              placeholder="%"
              value={line.discountPercent || ""}
              onChange={e => handleDiscountInput(e.target.value, true)}
              step={0.1}
              min={0}
              max={maxDiscountPercent}
            />
          </div>
        </div>
      )}

      {showPrice && allowPriceOverride && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => handlePriceInput("")}
          >
            <Tag className="h-3.5 w-3.5" />
          </Button>
          <Input
            type="number"
            className="h-7 text-xs flex-1"
            placeholder="سعر الوحدة"
            value={line.unitPrice}
            onChange={e => handlePriceInput(e.target.value)}
            step={0.01}
            min={0}
          />
          <span className="text-[10px] text-muted-foreground">
            أصلي: {formatCurrency(line.originalUnitPrice, currency, decimals)}
          </span>
        </div>
      )}

      {showOffers && line.appliedOffers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {line.appliedOffers.map((offer, idx) => (
            <Badge
              key={idx}
              variant="default"
              className="text-[10px] h-4 px-1.5 bg-emerald-100 text-emerald-800"
            >
              عرض: {offer.offerName} -
              {offer.discountType === "percent"
                ? offer.discountValue + "%"
                : formatCurrency(offer.discountValue, currency, decimals)}
            </Badge>
          ))}
        </div>
      )}

      {line.type === "goods" && line.stock <= 0 && (
        <div className="flex items-center gap-1 text-destructive text-[11px]">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>نفد من المخزون</span>
        </div>
      )}

      {line.type === "goods" && line.stock > 0 && line.stock <= 5 && (
        <div className="flex items-center gap-1 text-amber-600 text-[11px]">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>مخزون منخفض: {line.stock} متبقي</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setShowUnits(!showUnits)}
            aria-label={showUnits ? "إخفاء الوحدات" : "إظهار الوحدات"}
          >
            {showUnits ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setShowDiscount(!showDiscount)}
            aria-label={showDiscount ? "إخفاء الخصم" : "إظهار الخصم"}
          >
            <Tag className="h-3.5 w-3.5" />
          </Button>
          {allowPriceOverride && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPrice(!showPrice)}
              aria-label={showPrice ? "إخفاء السعر" : "إظهار السعر"}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <div>
            السعر: {formatCurrency(line.unitPrice, currency, decimals)} ×{" "}
            {line.quantity}
          </div>
          {discountAmount > 0 && (
            <div className="text-destructive">
              خصم: -{formatCurrency(discountAmount, currency, decimals)}
            </div>
          )}
          {offerDiscount > 0 && (
            <div className="text-emerald-600">
              عرض: -{formatCurrency(offerDiscount, currency, decimals)}
            </div>
          )}
          {taxAmount > 0 && (
            <div>ضريبة: +{formatCurrency(taxAmount, currency, decimals)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CartProps {
  lines: CartLine[];
  onQuantityChange: (id: string, quantity: number) => void;
  onDiscountChange: (id: string, discount: number, isPercent: boolean) => void;
  onPriceChange: (id: string, price: number) => void;
  onRemove: (id: string) => void;
  onUnitChange: (id: string, unitId: number) => void;
  getProductUnits: (productId: number) => Promise<
    Array<{
      id: number;
      unitId: number;
      unitName: string;
      conversionFactor: number;
      isBase: boolean;
    }>
  >;
  allowPriceOverride: boolean;
  allowQuantityOverride: boolean;
  maxDiscountPercent: number;
  maxLineDiscountPercent: number;
  currency: string;
  decimals: number;
  selectedCustomer?: { id: number; name: string; loyaltyPoints: number } | null;
  loyaltyPointsRedeemed: number;
  onLoyaltyPointsChange: (points: number) => void;
  globalDiscount: number;
  globalDiscountPercent: number;
  onGlobalDiscountChange: (value: number, isPercent: boolean) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  holdId: string | null;
  onHoldIdChange: (holdId: string | null) => void;
  summary: {
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    total: number;
    itemCount: number;
    totalQuantity: number;
    loyaltyPointsEarned: number;
    loyaltyPointsRedeemed: number;
  };
  due: number;
  change: number;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  payments: Array<{ method: string; amount: number; reference?: string }>;
  onAddPayment: (method: string, amount: number, reference?: string) => boolean;
  onRemovePayment: (index: number) => void;
  canCompleteSale: boolean;
  onCompleteSale: () => void;
  onHold: () => void;
  onClear: () => void;
  isProcessing: boolean;
}

export function Cart({
  lines,
  onQuantityChange,
  onDiscountChange,
  onPriceChange,
  onRemove,
  onUnitChange,
  getProductUnits,
  allowPriceOverride,
  allowQuantityOverride,
  maxDiscountPercent,
  maxLineDiscountPercent,
  currency,
  decimals,
  selectedCustomer,
  loyaltyPointsRedeemed,
  onLoyaltyPointsChange,
  globalDiscount,
  globalDiscountPercent,
  onGlobalDiscountChange,
  notes,
  onNotesChange,
  holdId,
  onHoldIdChange,
  summary,
  due,
  change,
  paymentMethod,
  onPaymentMethodChange,
  payments,
  onAddPayment,
  onRemovePayment,
  canCompleteSale,
  onCompleteSale,
  onHold,
  onClear,
  isProcessing,
}: CartProps) {
  const [unitCache, setUnitCache] = useState<
    Map<
      number,
      Array<{
        id: number;
        unitId: number;
        unitName: string;
        conversionFactor: number;
        isBase: boolean;
      }>
    >
  >(new Map());
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  const loadUnits = useCallback(
    async (productId: number) => {
      if (unitCache.has(productId)) return unitCache.get(productId)!;
      const units = await getProductUnits(productId);
      setUnitCache(prev => new Map(prev).set(productId, units));
      return units;
    },
    [unitCache, getProductUnits]
  );

  const lineUnits = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        id: number;
        unitId: number;
        unitName: string;
        conversionFactor: number;
        isBase: boolean;
      }>
    >();
    lines.forEach(line => {
      if (unitCache.has(line.productId)) {
        map.set(line.id, unitCache.get(line.productId)!);
      }
    });
    return map;
  }, [lines, unitCache]);

  return (
    <div className="sticky top-4 lg:w-[420px] shrink-0 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">السلة</h2>
          <Badge variant="outline" className="text-[11px]">
            {summary.itemCount} صنف • {summary.totalQuantity} قطعة
          </Badge>
        </div>

        {lines.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>أضف الأصناف من الكتالوج أو امسح الباركود</p>
          </div>
        )}

        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
          {lines.map((line, index) => {
            const units = lineUnits.get(line.id) || [];
            const isExpanded = expandedLine === line.id;

            return (
              <div key={line.id}>
                <CartLineRow
                  line={line}
                  onQuantityChange={onQuantityChange}
                  onDiscountChange={onDiscountChange}
                  onPriceChange={onPriceChange}
                  onRemove={onRemove}
                  onUnitChange={onUnitChange}
                  units={units}
                  allowPriceOverride={allowPriceOverride}
                  allowQuantityOverride={allowQuantityOverride}
                  maxDiscountPercent={maxLineDiscountPercent}
                  currency={currency}
                  decimals={decimals}
                  showOffers={true}
                />
                {isExpanded && units.length > 0 && (
                  <div className="ml-4 mt-1 pt-2 border-t border-border/50">
                    <Select
                      value={line.unitId?.toString() || ""}
                      onValueChange={v => onUnitChange(line.id, parseInt(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر الوحدة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">الوحدة الأساسية</SelectItem>
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>
                            {u.unitName}{" "}
                            {u.isBase ? "(أساسية)" : `×${u.conversionFactor}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <span className="font-medium">
              {formatCurrency(summary.subtotal, currency, decimals)}
            </span>
          </div>
          <div className="flex justify-between text-destructive">
            <span>إجمالي الخصم</span>
            <span className="font-medium">
              -{formatCurrency(summary.totalDiscount, currency, decimals)}
            </span>
          </div>
          {summary.totalTax > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>إجمالي الضريبة</span>
              <span className="font-medium">
                +{formatCurrency(summary.totalTax, currency, decimals)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">خصم إضافي</span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                className="h-7 w-20 text-xs text-right"
                value={globalDiscount}
                onChange={e =>
                  onGlobalDiscountChange(parseFloat(e.target.value) || 0, false)
                }
                step={0.01}
                min={0}
                max={summary.subtotal}
              />
              <span className="text-muted-foreground">أو</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  className="h-7 w-16 text-xs text-right"
                  value={globalDiscountPercent}
                  onChange={e =>
                    onGlobalDiscountChange(
                      parseFloat(e.target.value) || 0,
                      true
                    )
                  }
                  step={0.1}
                  min={0}
                  max={maxDiscountPercent}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {selectedCustomer && loyaltyPointsRedeemed > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>نقاط ولاء مستخدمة ({loyaltyPointsRedeemed} نقطة)</span>
              <span className="font-medium">
                -
                {formatCurrency(
                  loyaltyPointsRedeemed * (currency === "YER" ? 10 : 0.1),
                  currency,
                  decimals
                )}
              </span>
            </div>
          )}

          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span className="text-foreground">الإجمالي</span>
            <span className="text-ink text-lg">
              {formatCurrency(summary.total, currency, decimals)}
            </span>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              العميل
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{selectedCustomer.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        رصيد:{" "}
                        {formatCurrency(
                          selectedCustomer.loyaltyPoints || 0,
                          "نقاط",
                          0
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onHoldIdChange(null)}
                      className="h-6 w-6"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onHoldIdChange("new_customer")}
                  >
                    اختر عميل
                  </Button>
                )}
              </div>
              {selectedCustomer &&
                loyaltyPointsRedeemed <
                  (selectedCustomer.loyaltyPoints || 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onLoyaltyPointsChange(loyaltyPointsRedeemed + 100)
                    }
                  >
                    +100 نقطة
                  </Button>
                )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              طريقة الدفع
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                "cash",
                "card",
                "transfer",
                "credit",
                "online",
                "mobile_money",
              ].map(m => (
                <Button
                  key={m}
                  variant={paymentMethod === m ? "default" : "outline"}
                  size="sm"
                  className={
                    paymentMethod === m ? "bg-brand text-ink-deep" : ""
                  }
                  onClick={() => onPaymentMethodChange(m)}
                >
                  {m === "cash" && "نقدي"}
                  {m === "card" && "بطاقة"}
                  {m === "transfer" && "تحويل"}
                  {m === "credit" && "آجل"}
                  {m === "online" && "أونلاين"}
                  {m === "mobile_money" && "محفظة"}
                </Button>
              ))}
            </div>
          </div>

          {payments.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                المدفوعات
              </label>
              <div className="space-y-1">
                {payments.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {p.method} -{" "}
                      {formatCurrency(p.amount, currency, decimals)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onRemovePayment(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              المبلغ المدفوع{" "}
              {due > 0
                ? `(المتبقي: ${formatCurrency(due, currency, decimals)})`
                : change > 0
                  ? `(الباقي: ${formatCurrency(change, currency, decimals)})`
                  : ""}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="h-9 text-sm flex-1"
                placeholder="المبلغ"
                step={0.01}
                min={0}
                onChange={e =>
                  onAddPayment(paymentMethod, parseFloat(e.target.value) || 0)
                }
              />
              {paymentMethod !== "cash" && (
                <Input
                  type="text"
                  className="h-9 text-sm w-32"
                  placeholder="مرجع"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span
              className={
                due > 0
                  ? "text-destructive"
                  : change > 0
                    ? "text-emerald-600"
                    : "text-foreground"
              }
            >
              {due > 0
                ? `متبقي: ${formatCurrency(due, currency, decimals)}`
                : change > 0
                  ? `باقي: ${formatCurrency(change, currency, decimals)}`
                  : "مكتمل"}
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              ملاحظات
            </label>
            <textarea
              className="h-16 w-full rounded-lg border border-border bg-background p-2 text-sm resize-none"
              value={notes}
              onChange={e => onNotesChange(e.target.value)}
              placeholder="ملاحظات الفاتورة..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onHold}
              disabled={lines.length === 0}
            >
              تعليق
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClear}
              disabled={lines.length === 0}
            >
              مسح
            </Button>
            <Button
              className="flex-1 bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand text-lg"
              onClick={onCompleteSale}
              disabled={!canCompleteSale || isProcessing || lines.length === 0}
            >
              {isProcessing
                ? "جاري البيع..."
                : `تأكيد البيع (${formatCurrency(summary.total, currency, decimals)})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
