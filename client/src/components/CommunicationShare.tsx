import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "../../../shared/permissions";
import {
  buildShareMessage,
  type ShareDocumentSummary,
} from "../../../shared/communication";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ExternalLink, Mail, MessageCircle, Share2 } from "lucide-react";

type ShareDocType =
  | "purchase_order"
  | "goods_receipt"
  | "purchase_invoice"
  | "procurement_report";
type Channel = "whatsapp" | "email";

/**
 * مشاركة الطلبات والتقارير عبر واتساب أو الإيميل:
 * - يُخفي الزر عند غياب صلاحيات الإرسال (COMMUNICATION_SEND) مع شرط صلاحية
 *   قراءة المستند (PROCUREMENT_VIEW للطلبات، REPORTS_VIEW للتقرير).
 * - يقرأ إعدادات القنوات من «الإعدادات العامة» ويثبّت الزر المعطّلة.
 * - الخادم هو مصدر الحقيقة: يعيد بناء الرسالة ويُسجل المشاركة ويصدر الرابط.
 */
export function CommunicationShare({
  docType,
  docId,
  label = "مشاركة",
  variant = "icon",
  summary,
}: {
  docType: ShareDocType;
  docId?: number;
  label?: string;
  variant?: "icon" | "text";
  summary?: ShareDocumentSummary;
}) {
  const { can } = usePermissions();
  const allowed =
    can(PERMISSIONS.COMMUNICATION_SEND) &&
    (docType === "procurement_report"
      ? can(PERMISSIONS.REPORTS_VIEW)
      : can(PERMISSIONS.PROCUREMENT_VIEW));
  const settingsQ = trpc.accounting.getSettings.useQuery(undefined, {
    staleTime: 60_000,
  });
  const config = (settingsQ.data as any)?.communicationConfig;

  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<any>(null);

  const sendDoc = trpc.communication.sendPurchaseDocument.useMutation({
    onError: e => toast.error(e?.message || "تعذّر إرسال المشاركة"),
  });
  const sendReport = trpc.communication.sendReport.useMutation({
    onError: e => toast.error(e?.message || "تعذّر إرسال التقرير"),
  });

  if (!allowed) return null;

  const whatsappDisabled = config?.whatsappEnabled === false;
  const emailDisabled = config?.emailEnabled === false;
  const sending = sendDoc.isPending || sendReport.isPending;

  const preview = result
    ? (result.message as string)
    : summary
      ? buildShareMessage(summary)
      : "";

  const submitChannel = () => {
    const input = {
      channel,
      ...(to.trim() ? { to: to.trim() } : {}),
    } as any;
    const handle = (res: any) => {
      setResult(res);
      toast.success(
        channel === "whatsapp"
          ? "تم تجهيز رابط واتساب للمشاركة"
          : res.delivered
            ? "تم إرسال البريد بنجاح"
            : "فشل الإرسال عبر SMTP — عُرضت الرسالة في سجل الخادم"
      );
    };
    if (docType === "procurement_report") {
      sendReport.mutate(input, { onSuccess: handle });
    } else {
      sendDoc.mutate({ ...input, docType, docId }, { onSuccess: handle });
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px]"
        title="مشاركة عبر واتساب أو الإيميل"
        onClick={e => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Share2 className="w-3 h-3" />
        {variant === "text" ? label : ""}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              مشاركة {label}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تُرسل وفق صلاحياتك وإعدادات التواصل المفعلة في الإعدادات العامة،
              ويُسجل الإجراء في سجل النشاطات.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={channel === "whatsapp" ? "default" : "outline"}
                disabled={whatsappDisabled}
                className={
                  channel === "whatsapp"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] h-9"
                    : "text-[11px] h-9"
                }
                onClick={() => setChannel("whatsapp")}
              >
                <MessageCircle className="w-3.5 h-3.5 ml-1" /> واتساب
              </Button>
              <Button
                type="button"
                size="sm"
                variant={channel === "email" ? "default" : "outline"}
                disabled={emailDisabled}
                className={
                  channel === "email"
                    ? "bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand text-[11px] h-9 font-bold"
                    : "text-[11px] h-9"
                }
                onClick={() => setChannel("email")}
              >
                <Mail className="w-3.5 h-3.5 ml-1" /> إيميل
              </Button>
            </div>

            {whatsappDisabled && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                واتساب معطّل من الإعدادات العامة.
              </p>
            )}
            {emailDisabled && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                الإيميل معطّل من الإعدادات العامة.
              </p>
            )}

            <div>
              <Label className="text-[10px]">
                {channel === "whatsapp"
                  ? "رقم واتساب المستلم (اختياري)"
                  : "بريد المستلم (اختياري)"}
              </Label>
              <Input
                value={to}
                onChange={e => setTo(e.target.value)}
                className="h-9 text-xs"
                dir={channel === "email" ? "ltr" : "rtl"}
                placeholder={
                  channel === "whatsapp"
                    ? "مثال: 771234567 — أو يُؤخذ من بيانات المورد"
                    : "مثال: supplier@example.com — أو يُؤخذ من بيانات المورد"
                }
              />
            </div>

            <div>
              <Label className="text-[10px]">معاينة الرسالة</Label>
              <textarea
                readOnly
                rows={6}
                value={
                  preview ||
                  "اختر القناة واضغط إرسال — ستُبنى الرسالة من بيانات المستند على الخادم."
                }
                className="w-full p-3 rounded-md border border-slate-200 text-[11px] bg-slate-50 text-slate-800 leading-relaxed"
              />
            </div>

            {result?.channel === "whatsapp" && result?.link && (
              <a
                href={result.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                فتح واتساب وإرسال الآن ({result.target})
              </a>
            )}
            {result?.channel === "email" && (
              <p className="text-[11px] text-slate-500">
                {result.delivered
                  ? `أُرسل إلى ${result.target} عبر SMTP.`
                  : `فشل SMTP — ظهرت الرسالة في سجل الخادم (console). الوجهة: ${result.target}`}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="text-xs h-9"
              onClick={() => setOpen(false)}
            >
              إغلاق
            </Button>
            <Button
              disabled={
                sending ||
                (channel === "whatsapp" ? whatsappDisabled : emailDisabled)
              }
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
              onClick={submitChannel}
            >
              {sending
                ? "جاري الإرسال…"
                : channel === "whatsapp"
                  ? "تحضير رابط واتساب"
                  : "إرسال عبر الإيميل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
