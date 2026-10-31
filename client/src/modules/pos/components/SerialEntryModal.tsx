"use client";

import { useState, useRef, useCallback } from "react";
import { X, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface SerialEntryModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (serials: string[]) => void;
  productName: string;
  productNameAr?: string;
  requiredQuantity: number;
  existingSerials?: string[];
}

export function SerialEntryModal({
  open,
  onClose,
  onConfirm,
  productName,
  productNameAr,
  requiredQuantity,
  existingSerials = [],
}: SerialEntryModalProps) {
  const [serials, setSerials] = useState<string[]>(existingSerials);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addSerial = useCallback(() => {
    const val = inputValue.trim();
    if (!val) return;
    if (serials.includes(val)) {
      toast.warning("رقم السيريال مكرر");
      return;
    }
    setSerials(prev => [...prev, val]);
    setInputValue("");
    inputRef.current?.focus();
  }, [inputValue, serials]);

  const removeSerial = useCallback((index: number) => {
    setSerials(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirm = () => {
    if (serials.length < requiredQuantity) {
      toast.warning(`يجب إدخال ${requiredQuantity} أرقام سيريال على الأقل`);
      return;
    }
    onConfirm(serials.slice(0, requiredQuantity));
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSerial();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">إدخال أرقام السيريال</h2>
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
            <span>
              المطلوب: {requiredQuantity} | المُدخَل: {serials.length}
            </span>
            {serials.length >= requiredQuantity && (
              <Badge variant="default" className="ml-auto">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                مكتمل
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="أدخل رقم السيريال..."
              className="flex-1"
            />
            <Button onClick={addSerial} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-48">
            {serials.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                لم يتم إدخال أي أرقام سيريال بعد
              </p>
            ) : (
              <div className="space-y-1">
                {serials.map((serial, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <span className="font-mono text-sm">{serial}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeSerial(i)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={serials.length < requiredQuantity}
          >
            تأكيد ({serials.length}/{requiredQuantity})
          </Button>
        </div>
      </div>
    </div>
  );
}
