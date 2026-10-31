import React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  FileDown,
  FileSpreadsheet,
  MessageCircle,
  X,
  FileText,
  Receipt,
  FileIcon,
} from "lucide-react";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: React.ReactNode;
  onPrint: () => void;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
  onShareWhatsApp?: () => void;
}

type PaperFormat = "a4" | "a5" | "receipt";

const PAPER_SIZES: Record<
  PaperFormat,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    dimensions: string;
  }
> = {
  a4: { label: "A4", icon: FileText, dimensions: "210 × 297 مم" },
  a5: { label: "A5", icon: FileIcon, dimensions: "148 × 210 مم" },
  receipt: { label: " إيصال (80مم)", icon: Receipt, dimensions: "80 × 297 مم" },
};

export function PrintPreviewDialog({
  open,
  onOpenChange,
  title,
  content,
  onPrint,
  onExportPdf,
  onExportCsv,
  onShareWhatsApp,
}: PrintPreviewDialogProps) {
  const [paperFormat, setPaperFormat] = React.useState<PaperFormat>("a4");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5 text-primary" />
            معاينة الطباعة — {title}
          </DialogTitle>
        </DialogHeader>

        {/* Paper Format Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(PAPER_SIZES) as PaperFormat[]).map(format => {
            const { label, icon: Icon, dimensions } = PAPER_SIZES[format];
            return (
              <button
                key={format}
                onClick={() => setPaperFormat(format)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all",
                  paperFormat === format
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-4" />
                <span className="font-medium">{label}</span>
                <span className="text-[10px] opacity-70">{dimensions}</span>
              </button>
            );
          })}
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-muted/30 p-4">
          <div
            dir="rtl"
            className={cn(
              "mx-auto bg-card shadow-lg border border-border/50 p-6 prose prose-sm max-w-none",
              paperFormat === "a4" && "max-w-[210mm] min-h-[297mm]",
              paperFormat === "a5" && "max-w-[148mm] min-h-[210mm]",
              paperFormat === "receipt" && "max-w-[80mm] min-h-[200mm]"
            )}
          >
            {content}
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            {onShareWhatsApp && (
              <Button variant="outline" size="sm" onClick={onShareWhatsApp}>
                <MessageCircle className="size-4 text-success" />
                واتساب
              </Button>
            )}
            {onExportCsv && (
              <Button variant="outline" size="sm" onClick={onExportCsv}>
                <FileSpreadsheet className="size-4" />
                CSV
              </Button>
            )}
            {onExportPdf && (
              <Button variant="outline" size="sm" onClick={onExportPdf}>
                <FileDown className="size-4" />
                PDF
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
              إغلاق
            </Button>
            <Button onClick={onPrint}>
              <Printer className="size-4" />
              طباعة
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
