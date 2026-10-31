"use client";

import { useState } from "react";
import {
  Receipt,
  Download,
  Printer,
  QrCode,
  Mail,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DigitalReceiptProps {
  invoiceNumber: string;
}

export function DigitalReceipt({ invoiceNumber }: DigitalReceiptProps) {
  const [showReceipt, setShowReceipt] = useState(false);
  const digitalReceiptQuery =
    trpc.modules.posIntelligence.digitalReceipt.useQuery(
      { invoiceNumber, format: "pdf" },
      { enabled: false }
    );

  const handleGenerate = async () => {
    try {
      await digitalReceiptQuery.refetch();
      setShowReceipt(true);
    } catch {
      toast.error("فشل تحميل الإيصال");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (digitalReceiptQuery.data?.receiptHtml) {
      const blob = new Blob([digitalReceiptQuery.data.receiptHtml], {
        type: "text/html",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt_${invoiceNumber}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleShareQR = () => {
    if (digitalReceiptQuery.data?.qrData) {
      const qrData = digitalReceiptQuery.data.qrData;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(qrData).then(() => {
          toast.success("تم نسخ بيانات QR للحافظة");
        });
      }
    }
  };

  return (
    <div>
      <Button variant="outline" size="sm" onClick={handleGenerate}>
        <Receipt className="h-4 w-4 mr-1" /> إيصال رقمي
      </Button>
      {showReceipt && digitalReceiptQuery.data && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <CardContent className="bg-card rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">إيصال مبيعات رقمي</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReceipt(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div
              className="space-y-2 text-sm"
              dangerouslySetInnerHTML={{
                __html: digitalReceiptQuery.data.receiptHtml,
              }}
            />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> طباعة
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" /> تنزيل
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareQR}>
                <QrCode className="h-4 w-4 mr-1" /> QR
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
