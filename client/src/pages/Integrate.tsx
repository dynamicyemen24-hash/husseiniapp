import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Code2,
  Globe,
  Webhook,
  Copy,
  Check,
  BookOpen,
  ShieldCheck,
  Layers,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { brand } from "@/lib/brand";

const PLATFORM_URL = brand.contact.website;

function CodeBlock({ code, lang = "html" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("تم نسخ الكود");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("تعذّر النسخ");
    }
  };
  return (
    <div className="relative bg-ink-deep border border-ink-600 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-ink border-b border-ink-600">
        <span className="text-[10px] font-mono text-brand-300 uppercase">
          {lang}
        </span>
        <button
          onClick={copy}
          className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[11px] leading-relaxed text-slate-200 font-mono text-left dir-ltr">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Integrate() {
  const [, setLocation] = useLocation();

  const storePhpSnippet = `<?php
// Store.php — ضعه في جذر موقعك (WordPress/PHP)
$STORE_URL = "${PLATFORM_URL}/store"; // غيّر إلى عنوان منصتك
header("Content-Type: text/html; charset=UTF-8");
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>متجر الحسينية الإلكتروني</title></head>
<body style="margin:0">
<iframe src="<?= htmlspecialchars($STORE_URL, ENT_QUOTES) ?>"
  style="width:100%;height:100vh;border:0"></iframe>
</body></html>`;

  const wordpressSnippet = `<!-- كتلة HTML مخصص في صفحة ووردبريس -->
<iframe src="${PLATFORM_URL}/store"
  style="width:100%;height:80vh;border:0;border-radius:12px"
  allow="geolocation"></iframe>`;

  const syncJsSnippet = `<!-- أضف قبل </body> في موقعك -->
<script src="${PLATFORM_URL}/SyncJav.js"></script>
<script>
  SyncJav.init({
    storeUrl: "${PLATFORM_URL}/store",
    // اختياري: العملة والفرع لمنشأتك (دعم تعدد المنشآت والفروع)
    currency: "YER",
    branchCode: "MAIN"
  });
</script>

<!-- أي زر بفتح المتجر تلقائياً -->
<a href="#" data-store="open">افتح متجر الحسينية</a>`;

  const catalogSnippet = `// جلب الكتالوج المباشر (يدعم CORS)
fetch("${PLATFORM_URL}/api/web/catalog?search=كتاب")
  .then(r => r.json())
  .then(data => {
    // data = { ok, items: [...], categories: [...] }
    console.log(data.items);
  });`;

  const orderSnippet = `// إرسال طلب مباشر للمنصة (بدون تسجيل دخول)
fetch("${PLATFORM_URL}/api/web/place-order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    customerName: "محمد علي",
    customerPhone: "770000000",
    currency: "YER",
    branchCode: "MAIN",
    items: [{ productId: 12, quantity: 2 }]
  })
})
  .then(r => r.json())
  .then(res => console.log(res.orderNumber));`;

  const webhookSnippet = `# متغير البيئة على Vercel
ORDER_WEBHOOK_URL=https://your-site.com/api/alhusainia/orders

# يُستلم عند كل طلب جديد (JSON):
{
  "event": "order.created",
  "orderId": 482,
  "orderNumber": "ORD-482",
  "tenantId": 1,
  "branchCode": "MAIN",
  "currency": "YER",
  "total": 15000,
  "items": [ ... ]
}`;

  return (
    <div className="min-h-screen bg-sand text-ink pb-20 font-sans" dir="rtl">
      {/* Hero */}
      <section className="relative brand-gradient text-white py-16 px-4 overflow-hidden border-b border-ink-600">
        <div className="absolute inset-0 brand-dotgrid opacity-10" />
        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 bg-ink-600 border border-brand/50 text-brand-300 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow">
            <Code2 className="w-3.5 h-3.5 text-brand" />
            مركز التكامل مع موقعك ومنصتك
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-balance">
            دمج منظومة الحسينية مع موقعك <br />
            <span className="text-brand-300">بسطرين من الكود</span>
          </h1>
          <p className="max-w-3xl mx-auto text-xs sm:text-base text-slate-300 leading-relaxed font-light text-pretty">
            اربط متجرك الإلكتروني، موقع الووردبريس، أو نظامك الداخلي بالمنصة عبر
            iframe، جسر JavaScript، أو واجهة REST عامة مدعومة بـ CORS وويب هوك —
            مع تعدد المؤسسات والفروع والعملات.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => setLocation("/store")}
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-sm h-11 px-6 rounded-2xl flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              جرّب المتجر المباشر
            </Button>
            <a href="#methods">
              <Button
                variant="outline"
                className="border-ink-500 bg-ink-600 text-white hover:bg-ink-500 text-sm h-11 px-5 rounded-2xl flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-brand-300" />
                استعرض طرق الدمج
              </Button>
            </a>
          </div>
        </div>
      </section>

      <main id="methods" className="max-w-5xl mx-auto px-4 py-14 space-y-12">
        {/* Capabilities */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Globe, t: "تضمين iframe", d: "متجر كامل في صفحتك" },
            { icon: Code2, t: "جسر JS", d: "مزامنة السلة فورياً" },
            { icon: BookOpen, t: "REST عام", d: "كتالوج وطلبات CORS" },
            { icon: Webhook, t: "ويب هوك", d: "إشعار طلب جديد" },
          ].map(c => {
            const Icon = c.icon;
            return (
              <Card
                key={c.t}
                className="border border-slate-200 bg-white shadow-sm"
              >
                <CardContent className="p-4 text-center space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-xl bg-ink text-brand-300 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">{c.t}</p>
                  <p className="text-[11px] text-slate-500">{c.d}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Methods */}
        <Tabs defaultValue="iframe" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-ink-800 p-1 rounded-xl border border-ink-600 h-auto">
            <TabsTrigger
              value="iframe"
              className="text-xs font-bold data-[state=active]:bg-brand data-[state=active]:text-ink-deep rounded-lg py-2"
            >
              تضمين iframe
            </TabsTrigger>
            <TabsTrigger
              value="js"
              className="text-xs font-bold data-[state=active]:bg-brand data-[state=active]:text-ink-deep rounded-lg py-2"
            >
              جسر JavaScript
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="text-xs font-bold data-[state=active]:bg-brand data-[state=active]:text-ink-deep rounded-lg py-2"
            >
              واجهة REST
            </TabsTrigger>
            <TabsTrigger
              value="webhook"
              className="text-xs font-bold data-[state=active]:bg-brand data-[state=active]:text-ink-deep rounded-lg py-2"
            >
              ويب هوك
            </TabsTrigger>
          </TabsList>

          <TabsContent value="iframe" className="space-y-4 pt-4">
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand" /> 1) تضمين المتجر في صفحة
                (PHP / WordPress)
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                حمّل الملف{" "}
                <code className="font-mono text-brand">Store.php</code> إلى جذر
                موقعك، أو الصق الكتلة أسفل في صفحة ووردبريس عبر "HTML مخصص".
              </p>
            </div>
            <CodeBlock code={storePhpSnippet} lang="php" />
            <CodeBlock code={wordpressSnippet} lang="html" />
          </TabsContent>

          <TabsContent value="js" className="space-y-4 pt-4">
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-brand" /> 2) جسر التكامل
                SyncJav.js
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                يحمّل السكربت جسراً خفيفاً يفتح المتجر، يضمّنه، ويبقي سلة الزائر
                متزامنة عبر localStorage، مع دعم اختياري للعملة والفرع.
              </p>
            </div>
            <CodeBlock code={syncJsSnippet} lang="html" />
            <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <span className="font-bold text-amber-900">دوال متاحة:</span>{" "}
              <code className="font-mono">SyncJav.openStore()</code> ·{" "}
              <code className="font-mono">SyncJav.embed(selector, height)</code>{" "}
              · <code className="font-mono">SyncJav.fetchCatalog()</code> ·{" "}
              <code className="font-mono">SyncJav.placeOrder(payload)</code> ·{" "}
              <code className="font-mono">SyncJav.sync(cart)</code>
            </div>
          </TabsContent>

          <TabsContent value="api" className="space-y-4 pt-4">
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand" /> 3) واجهة REST عامة
                (CORS-m enabled)
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                نقاط نهاية عامة لجلب الكتالوج وإرسال الطلبات من أي نطاق — مثالية
                للتطبيقات المخصصة والويب هوك.
              </p>
            </div>
            <CodeBlock code={catalogSnippet} lang="javascript" />
            <CodeBlock code={orderSnippet} lang="javascript" />
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4 pt-4">
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
                <Webhook className="w-5 h-5 text-brand" /> 4) ويب هوك للطلبات
                الجديدة
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                اضبط متغير البيئة{" "}
                <code className="font-mono text-brand">ORDER_WEBHOOK_URL</code>{" "}
                على Vercel لاستقبال إشعار JSON مع كل طلب جديد.
              </p>
            </div>
            <CodeBlock code={webhookSnippet} lang="bash" />
          </TabsContent>
        </Tabs>

        {/* Multi-tenant note */}
        <section className="bg-ink-800 text-white rounded-3xl p-6 md:p-8 border border-ink-600 space-y-4">
          <h3 className="text-lg font-bold font-display flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-300" /> تعدد المنشآت في
            التكامل
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            كل طلب ومصدر بيانات مرتبط بمنشأتك (tenant) وفرع (branch) وعملة
            (currency) ووحدة قياس. مرّر هذه الحقول في الـ payload لربط الطلب
            بالفرع الصحيح ومحاسبته آلياً ضمن دليل الحسابات المركزي.
          </p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {["tenantId", "branchCode", "currency", "unit"].map(k => (
              <Badge
                key={k}
                variant="outline"
                className="border-brand/50 text-brand-300 font-mono"
              >
                {k}
              </Badge>
            ))}
          </div>
        </section>

        <section className="flex items-center gap-3 justify-center text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          جميع نقاط التكامل مشفّرة عبر SSL، ومحمية بـ Rate Limiting وCORS مقيد.
        </section>
      </main>
    </div>
  );
}
