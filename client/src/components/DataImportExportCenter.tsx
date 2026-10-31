import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Layers,
  Boxes,
  Coins,
  Warehouse,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// UTF-8 BOM for flawless Arabic display in Microsoft Excel
const UTF8_BOM = "\uFEFF";

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([UTF8_BOM + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function DataImportExportCenter() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "accounts" | "products" | "opening_accounts" | "opening_inventory"
  >("accounts");
  const [csvInput, setCsvInput] = useState("");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const utils = trpc.useUtils();

  // Queries for exporting current data
  const { data: accountsList } = trpc.accounting.getAccounts.useQuery(
    undefined,
    { enabled: open }
  );
  const { data: productsList } = trpc.products.list.useQuery(undefined, {
    enabled: open,
  });

  // Mutations
  const importProducts = trpc.products.importCsv.useMutation({
    onSuccess: (res: any) => {
      toast.success(
        `تم استيراد وتحديث ${res?.inserted ?? previewRows.length} صنف/خدمة بنجاح!`
      );
      utils.products.list.invalidate();
      setCsvInput("");
      setPreviewRows([]);
      setIsProcessing(false);
    },
    onError: (err: any) => {
      toast.error(
        err?.message || "تعذر استيراد الأصناف، يرجى مراجعة صياغة الملف"
      );
      setIsProcessing(false);
    },
  });

  const importAccounts = trpc.accounting.addAccount.useMutation({
    onError: (err: any) => toast.error(err?.message || "تعذر استيراد الحسابات"),
  });
  const importOpeningBalances = trpc.accounting.saveOpeningBalances.useMutation(
    {
      onError: (err: any) =>
        toast.error(err?.message || "تعذر حفظ الأرصدة الافتتاحية"),
    }
  );
  const importOpeningStock = trpc.products.setOpeningStock.useMutation({
    onError: (err: any) =>
      toast.error(err?.message || "تعذر ضبط مخزون أول المدة"),
  });

  // ── Template Generators ──────────────────────────────────────
  const handleDownloadTemplate = () => {
    if (activeTab === "accounts") {
      const template =
        "code,name,type,parentCode,notes\n101,الصندوق الرئيسي,asset,,صندوق النقدية الرئيسي\n102,البنك الأهلي - جاري,asset,,حساب البنك الرئيسي\n103,العملاء التجاريون,asset,,الذمم المدينة\n201,الموردون التجاريون,liability,,الذمم الدائنة\n301,رأس المال,equity,,حقوق الملكية\n401,إيرادات المبيعات,revenue,,المبيعات العامة\n501,تكلفة البضاعة المباعة,expense,,تكلفة المبيعات\n502,مصروفات الرواتب والأجور,expense,,المصاريف الإدارية";
      downloadCsv("قالب_دليل_الحسابات_Uamex_erp.csv", template);
      toast.success("تم تحميل قالب دليل الحسابات بنجاح");
    } else if (activeTab === "products") {
      const template =
        "code,name,type,category,unit,purchasePrice,salePrice,wholesalePrice,currentStock,minStock,barcode\nITM-001,شاشة سامسونج 27 بوصة,goods,إلكترونيات,قطعة,120,160,145,15,3,880123456789\nITM-002,كابل شبكة Cat6 10m,goods,شبكات,حبة,4,8,6,50,10,880123456790\nSRV-001,استشارة ودراسة جدول كميات BOQ,service,خدمات هندسية,خدمة,0,250,200,0,0,";
      downloadCsv("قالب_دليل_الأصناف_والخدمات_Uamex_erp.csv", template);
      toast.success("تم تحميل قالب الأصناف والخدمات بنجاح");
    } else if (activeTab === "opening_accounts") {
      const template =
        "accountCode,accountName,debit,credit,notes\n101,الصندوق الرئيسي,50000,0,رصيد أول المدة النقدي\n102,البنك الأهلي,120000,0,رصيد أول المدة البنكي\n103,العميل شركة النور,15000,0,ذمم مدينة رصيد افتتاحي\n201,المورد شركة العالمية,0,35000,ذمم دائنة رصيد افتتاحي\n301,رأس المال,0,150000,رأس المال الافتتاحي المتزن";
      downloadCsv("قالب_الأرصدة_الافتتاحية_للحسابات_Uamex_erp.csv", template);
      toast.success("تم تحميل قالب الأرصدة الافتتاحية بنجاح");
    } else if (activeTab === "opening_inventory") {
      const template =
        "productCode,productName,warehouse,quantity,unitCost,notes\nITM-001,شاشة سامسونج 27 بوصة,MAIN,15,120,بضاعة أول المدة جرد فعلي\nITM-002,كابل شبكة Cat6 10m,MAIN,50,4,بضاعة أول المدة جرد فعلي";
      downloadCsv("قالب_أرصدة_أول_المدة_للمخزون_Uamex_erp.csv", template);
      toast.success("تم تحميل قالب مخزون أول المدة بنجاح");
    }
  };

  // ── Export Existing Live Data ────────────────────────────────
  const handleExportLiveData = () => {
    if (activeTab === "accounts") {
      if (!accountsList || accountsList.length === 0) {
        toast.error("لا توجد حسابات مسجلة للتصدير حالياً");
        return;
      }
      let csv = "code,name,type,parentAccountId,isCustom\n";
      for (const a of accountsList) {
        csv += `"${a.code}","${a.name}","${a.type}","${a.parentAccountId || ""}","${a.isCustom ? "نعم" : "لا"}"\n`;
      }
      downloadCsv(
        `دليل_الحسابات_${new Date().toISOString().slice(0, 10)}.csv`,
        csv
      );
      toast.success(`تم تصدير ${accountsList.length} حساب بنجاح`);
    } else if (activeTab === "products") {
      // products.list returns a paginated payload: { items, total }
      const productList = productsList?.items ?? [];
      if (productList.length === 0) {
        toast.error("لا توجد أصناف مسجلة للتصدير حالياً");
        return;
      }
      let csv =
        "code,name,type,category,unit,purchasePrice,salePrice,wholesalePrice,currentStock,minStock,barcode\n";
      for (const p of productList) {
        csv += `"${p.code}","${p.name}","${p.type || "goods"}","${p.category || ""}","${p.unit || "قطعة"}","${p.purchasePrice || 0}","${p.salePrice || 0}","${p.wholesalePrice || 0}","${p.currentStock || 0}","${p.minStock || 0}","${p.barcode || ""}"\n`;
      }
      downloadCsv(
        `دليل_الأصناف_والمنتجات_${new Date().toISOString().slice(0, 10)}.csv`,
        csv
      );
      toast.success(`تم تصدير ${productList.length} صنف/خدمة بنجاح`);
    } else {
      handleDownloadTemplate();
    }
  };

  // ── Parse & Import CSV ───────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        setCsvInput(text);
        parseAndPreview(text);
      }
    };
    reader.readAsText(file);
  };

  const parseAndPreview = (rawText: string) => {
    try {
      const clean = rawText.replace(/^\uFEFF/, "").trim();
      const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length <= 1) {
        toast.error("الملف لا يحتوي على بيانات كافية");
        return;
      }
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.replace(/"/g, "").trim());
        if (cols.length >= 2) {
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] || "";
          });
          rows.push(rowObj);
        }
      }
      setPreviewRows(rows);
      toast.success(`تمت قراءة ${rows.length} صف جاهزة للاستيراد`);
    } catch {
      toast.error("تعذر قراءة الملف، تأكد أنه بصيغة CSV صحيحة");
    }
  };

  const handleExecuteImport = async () => {
    if (previewRows.length === 0) {
      toast.error("الرجاء رفع ملف أو لصق بيانات CSV أولاً");
      return;
    }
    setIsProcessing(true);
    if (activeTab === "products") {
      const formattedRows = previewRows.map((r, idx) => ({
        code: r.code || `ITM-${idx + 1}`,
        name: r.name || "صنف بدون اسم",
        type: (r.type === "service" ? "service" : "goods") as
          | "goods"
          | "service",
        category: r.category || undefined,
        unit: r.unit || "قطعة",
        purchasePrice: String(r.purchasePrice || "0"),
        salePrice: String(r.salePrice || "0"),
        wholesalePrice: String(r.wholesalePrice || "0"),
        currentStock: parseInt(r.currentStock || "0", 10) || 0,
        minStock: parseInt(r.minStock || "0", 10) || 0,
        barcode: r.barcode || undefined,
      }));
      importProducts.mutate({ rows: formattedRows });
    } else {
      const run = async () => {
        try {
          if (activeTab === "accounts") {
            const typeSet = new Set([
              "asset",
              "liability",
              "equity",
              "revenue",
              "expense",
            ]);
            let created = 0;
            let skipped = 0;
            for (const r of previewRows) {
              const type = String(r.type || "asset")
                .trim()
                .toLowerCase();
              const code = String(r.code || "").trim();
              const name = String(r.name || "").trim();
              if (!code || !name) {
                skipped++;
                continue;
              }
              await importAccounts.mutateAsync({
                code,
                name,
                type: typeSet.has(type) ? (type as any) : "asset",
                ...(r.category ? { category: String(r.category).trim() } : {}),
                ...(r.notes ? { description: String(r.notes).trim() } : {}),
              });
              created++;
            }
            toast.success(
              `تم استيراد ${created} حساب بنجاح${
                skipped ? ` — وتجاهل ${skipped} صفاً ناقصاً` : ""
              }`
            );
          } else if (activeTab === "opening_accounts") {
            if (!accountsList || accountsList.length === 0) {
              throw new Error(
                "لا توجد حسابات — قم باستيراد دليل الحسابات أولاً"
              );
            }
            const idByCode = new Map(
              accountsList.map(a => [String(a.code), a.id as number])
            );
            const balances: any[] = [];
            let skipped = 0;
            for (const r of previewRows) {
              const code = String(r.accountCode || r.code || "").trim();
              const id = idByCode.get(code);
              const debit = parseFloat(String(r.debit || "0")) || 0;
              const credit = parseFloat(String(r.credit || "0")) || 0;
              const amount = Math.max(debit, credit);
              if (!id || amount <= 0) {
                skipped++;
                continue;
              }
              balances.push({
                accountId: id,
                amount: String(amount),
                type: debit >= credit ? "debit" : "credit",
                notes: r.notes ? String(r.notes).trim() : undefined,
              });
            }
            if (balances.length === 0) {
              throw new Error("لا توجد أرصدة صالحة — تأكد من رموز الحسابات");
            }
            await importOpeningBalances.mutateAsync({
              periodName: "أرصدة أول المدة",
              balances,
            });
            toast.success(
              `تم حفظ ${balances.length} رصيد افتتاحي${
                skipped ? ` — وتجاهل ${skipped} صفاً` : ""
              }`
            );
          } else if (activeTab === "opening_inventory") {
            const invList = productsList?.items ?? [];
            if (invList.length === 0) {
              throw new Error("لا توجد منتجات — قم باستيراد الأصناف أولاً");
            }
            const idByCode = new Map<string, number>(
              invList.map((p: any) => [String(p.code), Number(p.id)])
            );
            let updated = 0;
            let skipped = 0;
            for (const r of previewRows) {
              const code = String(r.productCode || r.code || "").trim();
              const id = idByCode.get(code);
              const qty = parseInt(String(r.quantity || "0"), 10) || 0;
              if (!id) {
                skipped++;
                continue;
              }
              await importOpeningStock.mutateAsync({
                productId: id,
                quantity: Math.max(0, qty),
                notes: r.notes ? String(r.notes).trim() : undefined,
              });
              updated++;
            }
            toast.success(
              `تم ضبط مخزون أول المدة لـ ${updated} صنف${
                skipped ? ` — وتجاهل ${skipped} غير موجود` : ""
              }`
            );
          }
          utils.accounting.getAccounts.invalidate();
          utils.products.list.invalidate();
          setCsvInput("");
          setPreviewRows([]);
          setOpen(false);
        } catch (err: any) {
          toast.error(err?.message || "فشل الاستيراد، يرجى المحاولة مرة أخرى");
        } finally {
          setIsProcessing(false);
        }
      };
      run();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-brand/40 text-foreground hover:bg-brand/10 text-xs font-bold h-9 rounded-xl gap-2 shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-brand" />
          <span>استيراد وتصدير البيانات (Excel / CSV)</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto font-display"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <FileSpreadsheet className="w-5 h-5 text-brand" />
            مركز استيراد وتصدير البيانات المتقدم (Excel & CSV Hub)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Tabs Selector */}
          <Tabs
            value={activeTab}
            onValueChange={v => {
              setActiveTab(v as any);
              setCsvInput("");
              setPreviewRows([]);
            }}
          >
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 bg-muted p-1 rounded-xl h-auto">
              <TabsTrigger
                value="accounts"
                className="text-xs font-bold py-2 gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                دليل الحسابات
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="text-xs font-bold py-2 gap-1.5"
              >
                <Boxes className="w-3.5 h-3.5" />
                الأصناف والخدمات
              </TabsTrigger>
              <TabsTrigger
                value="opening_accounts"
                className="text-xs font-bold py-2 gap-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                الأرصدة الافتتاحية
              </TabsTrigger>
              <TabsTrigger
                value="opening_inventory"
                className="text-xs font-bold py-2 gap-1.5"
              >
                <Warehouse className="w-3.5 h-3.5" />
                مخزون أول المدة
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quick Actions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ArrowDownToLine className="w-4 h-4 text-brand" />
                تحميل القوالب والتصدير:
              </div>
              <p className="text-[11px] text-muted-foreground">
                احصل على النموذج الجاهز لتعبئة بياناتك، أو صدّر بياناتك الحالية
                فورياً:
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-8 rounded-lg gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  تحميل القالب الفارغ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportLiveData}
                  className="border-border text-foreground hover:bg-muted text-xs h-8 rounded-lg gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-brand" />
                  تصدير البيانات الحالية
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ArrowUpFromLine className="w-4 h-4 text-emerald-500" />
                رفع واستيراد الملف:
              </div>
              <p className="text-[11px] text-muted-foreground">
                اختر ملف CSV معبأ أو الصق محتواه بالأسفل للمطابقة والمعالجة:
              </p>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="text-xs text-muted-foreground file:mr-0 file:ml-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand file:text-ink-deep cursor-pointer"
              />
            </div>
          </div>

          {/* Paste Raw CSV Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>أو الصق نص البيانات المفصول بفواصل (CSV Raw Data):</span>
              {previewRows.length > 0 && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">
                  {previewRows.length} صف تم التعرف عليه
                </Badge>
              )}
            </div>
            <Textarea
              value={csvInput}
              onChange={e => {
                setCsvInput(e.target.value);
                if (e.target.value.trim()) parseAndPreview(e.target.value);
              }}
              placeholder="code,name,type,category...\nITM-001,اسم الصنف,goods,تصنيف..."
              className="min-h-24 text-xs font-mono resize-none text-left"
              dir="ltr"
            />
          </div>

          {/* Table Preview */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                معاينة أولية للبيانات قبل الاعتماد (Preview):
              </div>
              <div className="max-h-40 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-right text-[11px] border-collapse">
                  <thead className="bg-muted/70 text-muted-foreground sticky top-0">
                    <tr>
                      {Object.keys(previewRows[0]).map(k => (
                        <th
                          key={k}
                          className="p-2 border-b border-border font-bold"
                        >
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 5).map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        {Object.values(row).map((val: any, cidx) => (
                          <td key={cidx} className="p-2 truncate max-w-[150px]">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-xs h-10 rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              disabled={previewRows.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs h-10 px-6 rounded-xl gap-2 shadow-lg"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isProcessing
                  ? "جاري الاستيراد..."
                  : "تأكيد واستيراد البيانات للمنظومة"}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
