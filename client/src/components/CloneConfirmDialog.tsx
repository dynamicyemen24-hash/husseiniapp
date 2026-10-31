import React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Calendar, Hash, Tag, Loader2 } from "lucide-react";

interface CloneConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityLabel: string;
  onClone: (options: {
    adjustDate?: boolean;
    adjustNumber?: boolean;
    keepStatus?: boolean;
  }) => void;
  isPending?: boolean;
}

const ENTITY_LABELS: Record<string, string> = {
  invoice: "الفاتورة",
  voucher: "السند",
  product: "المنتج",
  settings: "الإعدادات",
  role: "الصلاحية",
  purchase: "طلب الشراء",
  payment: "دفعة",
};

export function CloneConfirmDialog({
  open,
  onOpenChange,
  entityType,
  entityLabel,
  onClone,
  isPending = false,
}: CloneConfirmDialogProps) {
  const [adjustDate, setAdjustDate] = React.useState(true);
  const [adjustNumber, setAdjustNumber] = React.useState(true);
  const [keepStatus, setKeepStatus] = React.useState(false);

  const handleClone = () => {
    onClone({ adjustDate, adjustNumber, keepStatus });
  };

  const label = ENTITY_LABELS[entityType] ?? entityType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="size-5 text-primary" />
            نسخ {label}
          </DialogTitle>
          <DialogDescription>
            سيتم إنشاء نسخة من{" "}
            <span className="font-semibold text-foreground">{entityLabel}</span>{" "}
            مع الخيارات التالية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* What will be cloned */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">سيتم نسخ:</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{label}</Badge>
              <span className="text-sm font-medium text-foreground">
                {entityLabel}
              </span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={adjustDate}
                onChange={e => setAdjustDate(e.target.checked)}
                className="size-4 rounded border-border accent-primary"
              />
              <Calendar className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div>
                <span className="text-sm text-foreground">
                  تعديل التاريخ ليوم اليوم
                </span>
                <p className="text-xs text-muted-foreground">
                  سيتم ضبط تاريخ الإنشاء على التاريخ الحالي
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={adjustNumber}
                onChange={e => setAdjustNumber(e.target.checked)}
                className="size-4 rounded border-border accent-primary"
              />
              <Hash className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div>
                <span className="text-sm text-foreground">
                  ترقيم تلقائي للرقم
                </span>
                <p className="text-xs text-muted-foreground">
                  سيتم توليد رقم جديد تلقائياً
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={keepStatus}
                onChange={e => setKeepStatus(e.target.checked)}
                className="size-4 rounded border-border accent-primary"
              />
              <Tag className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div>
                <span className="text-sm text-foreground">
                  الاحتفاظ بالحالة الأصلية
                </span>
                <p className="text-xs text-muted-foreground">
                  سيتم نسخ الحالة كما هي (مسودة/مرسل/معتمد)
                </p>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            إلغاء
          </Button>
          <Button onClick={handleClone} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جاري النسخ...
              </>
            ) : (
              <>
                <Copy className="size-4" />
                نسخ
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
