import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function EntityDocuments({
  entityType,
  entityId,
  label = "المستندات",
  compact = false,
}: {
  entityType: string;
  entityId: number;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data, isPending } = trpc.modules.documents.listByEntity.useQuery(
    { entityType, entityId },
    { enabled: open }
  );
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [notes, setNotes] = useState("");

  const invalidate = () =>
    utils.modules.documents.listByEntity.invalidate({ entityType, entityId });

  const link = trpc.modules.documents.link.useMutation({
    onSuccess: () => {
      toast.success("تم ربط المستند");
      invalidate();
      setTitle("");
      setDocType("");
      setReferenceUrl("");
      setNotes("");
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الربط"),
  });
  const unlink = trpc.modules.documents.unlink.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستند");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الحذف"),
  });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={`text-[9px] h-6 text-sky-700 border-sky-200 ${
          compact ? "" : "gap-1"
        }`}
        onClick={() => setOpen(true)}
      >
        <FileText className="w-3 h-3" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">المستندات المرتبطة</DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {isPending ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                جاري التحميل...
              </p>
            ) : (data ?? []).length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                لا توجد مستندات مرتبطة
              </p>
            ) : (
              (data ?? []).map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border p-2"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold truncate">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.type || "بدون نوع"}
                      {d.referenceUrl ? " • رابط مرجعي" : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-rose-600"
                    onClick={() => unlink.mutate({ id: d.id })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2 border-t pt-2">
            <Input
              className="h-8 text-[12px]"
              placeholder="عنوان المستند *"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                className="h-8 text-[12px]"
                placeholder="النوع (فاتورة، عقد...)"
                value={docType}
                onChange={e => setDocType(e.target.value)}
              />
              <Input
                className="h-8 text-[12px]"
                placeholder="رابط مرجعي (اختياري)"
                value={referenceUrl}
                onChange={e => setReferenceUrl(e.target.value)}
              />
            </div>
            <Textarea
              className="text-[12px]"
              rows={2}
              placeholder="ملاحظات"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <Button
              size="sm"
              className="w-full bg-brand text-ink-deep"
              disabled={!title || link.isPending}
              onClick={() =>
                link.mutate({
                  entityType,
                  entityId,
                  title,
                  docType: docType || undefined,
                  url: referenceUrl || undefined,
                  notes: notes || undefined,
                })
              }
            >
              <Plus className="w-3 h-3" /> إضافة مستند
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
