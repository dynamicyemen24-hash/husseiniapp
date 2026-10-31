"use client";

import { useState, useCallback } from "react";
import { Zap, Receipt, Loader2, Wallet, CreditCard, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatCurrency } from "@/modules/pos/utils/currency";

interface QuickSaleButtonProps {
  customerId?: number;
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
  }>;
  paymentMethod: string;
  paidAmount: string;
  onQuickSaleComplete?: (invoiceNumber: string, total: number) => void;
}

export function QuickSaleButton({
  customerId,
  items,
  paymentMethod,
  paidAmount,
  onQuickSaleComplete,
}: QuickSaleButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const createSale = trpc.modules.posIntelligence.quickSale.useMutation();

  const total = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity - item.discount,
    0
  );

  const handleQuickSale = useCallback(async () => {
    if (items.length === 0) {
      toast.warning("السلة فارغة");
      return;
    }
    if (parseFloat(paidAmount) < total) {
      toast.error("المبلغ المدفوع أقل من الإجمالي");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createSale.mutateAsync({
        customerId,
        items,
        paymentMethod,
        paidAmount,
      });
      toast.success(`تم إتمام البيع السريع: ${result.invoiceNumber}`);
      onQuickSaleComplete?.(result.invoiceNumber, result.total);
    } catch (err) {
      toast.error("فشل إتمام البيع السريع");
    } finally {
      setIsProcessing(false);
    }
  }, [
    customerId,
    items,
    paymentMethod,
    paidAmount,
    total,
    createSale,
    onQuickSaleComplete,
  ]);

  return (
    <Button
      variant="default"
      className="h-9 gap-2 bg-brand text-ink-deep hover:bg-brand-deep"
      onClick={handleQuickSale}
      disabled={
        isProcessing || items.length === 0 || parseFloat(paidAmount) < total
      }
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Zap className="h-4 w-4" />
      )}
      <span className="text-sm">بيع سريع</span>
      <Badge variant="secondary" className="bg-ink/20 text-ink">
        {formatCurrency(total, "YER", 0)}
      </Badge>
    </Button>
  );
}
