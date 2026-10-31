"use client";

import { useState } from "react";
import { X, AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Batch {
  batchId: number;
  batchNumber: string;
  expiryDate: string;
  availableQty: number;
}

interface BatchEntryModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (batchId: number, quantity: number) => void;
  productName: string;
  productNameAr?: string;
  requiredQuantity: number;
  batches: Batch[];
}

export function BatchEntryModal({
  open,
  onClose,
  onConfirm,
  productName,
  productNameAr,
  requiredQuantity,
  batches,
}: BatchEntryModalProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(requiredQuantity);

  const selectedBatch = batches.find(b => b.batchId === selectedBatchId);

  const handleConfirm = () => {
    if (!selectedBatchId) return;
    onConfirm(selectedBatchId, quantity);
    onClose();
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">اختيار الدفعة</h2>
            <p className="text-sm text-muted-foreground">
              {productNameAr || productName}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>الكمية المطلوبة: {requiredQuantity}</span>
          </div>

          <ScrollArea className="h-48">
            {batches.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                لا توجد دفعات متاحة
              </p>
            ) : (
              <div className="space-y-1">
                {batches.map(batch => {
                  const expired = isExpired(batch.expiryDate);
                  const selected = selectedBatchId === batch.batchId;
                  return (
                    <div
                      key={batch.batchId}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        selected
                          ? "bg-primary/10 border border-primary"
                          : expired
                            ? "bg-destructive/5 border border-destructive/20"
                            : "bg-muted/30 border border-border hover:bg-muted/50"
                      }`}
                      onClick={() =>
                        !expired && setSelectedBatchId(batch.batchId)
                      }
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {batch.batchNumber}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>الصلاحية: {batch.expiryDate}</span>
                          {expired && (
                            <Badge variant="destructive">منتهية</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">
                          {batch.availableQty}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          متاح
                        </div>
                      </div>
                      {selected && (
                        <CheckCircle2 className="h-4 w-4 text-primary ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {selectedBatch && (
            <div className="space-y-2">
              <label className="text-sm font-medium">الكمية</label>
              <Input
                type="number"
                min={1}
                max={selectedBatch.availableQty}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                المتاح: {selectedBatch.availableQty}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedBatchId ||
              quantity <= 0 ||
              (selectedBatch && quantity > selectedBatch.availableQty)
            }
          >
            تأكيد
          </Button>
        </div>
      </div>
    </div>
  );
}
