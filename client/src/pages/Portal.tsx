import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  HardHat,
  FileText,
  Printer,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { openPrintableInvoiceWindow } from "@/lib/pdfInvoiceGenerator";
import { InteractiveLandMap } from "@/components/InteractiveLandMap";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Portal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searched, setSearched] = useState(false);

  // Privacy: the portal NEVER lists all orders. Results are fetched only
  // after an explicit search and match the visitor's own order reference
  // or phone number (server-side `orders.track`).
  const { data: trackData, isFetching: tracking } = trpc.orders.track.useQuery(
    { query: searchQuery.trim() },
    { enabled: searched && searchQuery.trim().length >= 6 }
  );
  const orders = trackData?.items ?? [];

  const statusMap: Record<string, { text: string; color: string }> = {
    pending: { text: "قيد الانتظار", color: "bg-amber-600" },
    confirmed: { text: "تم التأكيد", color: "bg-blue-600" },
    processing: { text: "قيد التنفيذ", color: "bg-amber-600" },
    shipped: { text: "تم الشحن", color: "bg-indigo-600" },
    delivered: { text: "تم التسليم", color: "bg-emerald-600" },
    cancelled: { text: "ملغي", color: "bg-red-600" },
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 6) {
      toast.error(
        "أدخل رقم طلب مرجعي كاملاً أو رقم هاتف صحيح (6 أرقام على الأقل)"
      );
      return;
    }
    setSearched(true);
  };

  const handlePrintPdf = (order: (typeof orders)[0]) => {
    openPrintableInvoiceWindow({
      invoiceNumber: order.orderNumber,
      invoiceDate: order.createdAt?.toString?.() ?? new Date().toISOString(),
      customerName: "",
      customerPhone: "",
      institutionName: "مجموعة الحسينية",
      currency: "ريال يمني (YER)",
      items: [
        {
          description: order.deliveryAddress ?? `طلب رقم ${order.orderNumber}`,
          quantity: 1,
          unitPrice: Number(order.total),
          totalPrice: Number(order.total),
        },
      ],
      subtotal: Number(order.total),
      total: Number(order.total),
      paidAmount: 0,
      notes:
        order.deliveryNotes ??
        `حالة الطلب: ${statusMap[order.status]?.text ?? order.status} — المسؤول: ${order.assignedTo ?? "غير محدد"}`,
    });
  };

  return (
    <div className="min-h-screen bg-sand text-ink pb-20 font-sans" dir="rtl">
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Banner Section */}
        <div className="bg-gradient-to-br from-ink to-ink-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <Badge className="bg-brand text-ink-deep font-bold text-xs px-3 py-1 mb-2">
                بوابة العميل والمقاول
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white flex items-center gap-2">
                <HardHat className="w-7 h-7 text-brand-300" />
                بوابة تتبع المشاريع والخدمات المباشرة
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                تتبع حالة المخططات الهندسية، الرفع المساحي، جداول BOQ، وطلبات
                المكتبة والصيانة برقم الطلب أو الهاتف.
              </p>
            </div>
          </div>

          {/* Search Box */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-2 pt-2"
          >
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="أدخل رقم الهاتف (مثال: 770000000) أو رقم الطلب المرجعي (مثال: HSN-2026-8812)..."
                className="pr-10 h-11 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border-0 shadow"
              />
            </div>
            <Button
              type="submit"
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs sm:text-sm h-11 px-6 rounded-xl shadow"
            >
              بحث وتتبع
            </Button>
          </form>
        </div>

        {/* Results Tabs & Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand" />
              المشاريع والطلبات المسجلة
            </h2>
            <Badge
              variant="outline"
              className="text-xs border-brand text-brand-700 bg-amber-50"
            >
              تتبع مباشر 24/7
            </Badge>
          </div>

          <div className="space-y-4">
            {!searched && (
              <div className="text-center py-12 text-slate-500 text-sm bg-white rounded-2xl border border-slate-200">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                أدخل رقم الطلب المرجعي أو رقم هاتفك لعرض حالة طلباتك —
                <br />
                <span className="text-[11px] text-slate-400">
                  لا تُعرض أي بيانات إلا لصاحب الطلب نفسه
                </span>
              </div>
            )}
            {searched && tracking && (
              <div className="text-center py-12 text-slate-500 text-sm bg-white rounded-2xl border border-slate-200">
                جاري البحث عن طلباتك…
              </div>
            )}
            {searched &&
              !tracking &&
              orders.map(order => (
                <Card
                  key={order.id}
                  className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden"
                >
                  <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-brand bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
                            {order.orderNumber}
                          </span>
                          <Badge
                            className={
                              statusMap[order.status]?.color ?? "bg-amber-600"
                            }
                          >
                            {statusMap[order.status]?.text ?? order.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-slate-900 mt-2 font-display">
                          {order.deliveryAddress ??
                            `طلب رقم ${order.orderNumber}`}
                        </CardTitle>
                      </div>

                      <div className="text-left font-mono text-xs text-slate-500">
                        <div>
                          التاريخ:{" "}
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString(
                                "ar-EG"
                              )
                            : "—"}
                        </div>
                        <div>المسؤول: {order.assignedTo ?? "غير محدد"}</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Delivery Notes */}
                    {order.deliveryNotes && (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          ملاحظات التوصيل:
                        </div>
                        <p className="text-slate-600 pr-2">
                          {order.deliveryNotes}
                        </p>
                      </div>
                    )}

                    {/* Financial Summary & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-4 text-slate-700">
                        <div>
                          الإجمالي:{" "}
                          <strong className="font-mono text-slate-900">
                            {Number(order.total).toLocaleString()} YER
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintPdf(order)}
                          className="text-xs h-8 px-3 border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5 text-brand" />
                          طباعة الفاتورة بـ QR
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => {
                            const msg = encodeURIComponent(
                              `السلام عليكم، استفسار بشأن الطلب المرجعي: ${order.orderNumber}`
                            );
                            window.open(
                              `https://wa.me/967770000000?text=${msg}`,
                              "_blank"
                            );
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          التواصل المباشر
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {searched && !tracking && orders.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm bg-white rounded-2xl border border-slate-200">
                لا توجد طلبات مطابقة لرقم البحث — تأكد من رقم الطلب أو الهاتف.
              </div>
            )}
          </div>
        </div>

        {/* Interactive GIS Land Survey Map Component */}
        <InteractiveLandMap />
      </main>
    </div>
  );
}
