import Link from "next/link";

export default function Hero({ isAr }: { isAr: boolean }) {
  const title = isAr
    ? "نحوّل تعليم الأعمال إلى قارات واضحة بأرقام موثوقة"
    : "Turn Business Complexity into Clear, Trusted Numbers";
  const sub = isAr
    ? "Uamex_erp — نظام إدارة الأعمال الموحّد: محاسبة، مبيعات، مخزون، مشتريات، موارد بشرية، مشاريع، تقارير، ونظام صيانة أجهزة ذكي. منصة واحدة، شريك واحد، نتائج قابلة للقيادة."
    : "Uamex_erp — the unified business platform: accounting, sales, inventory, procurement, HR, projects, reports, and smart device maintenance. One platform, one partner, led by numbers.";

  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 bg-gradient-to-b from-orange-50 via-white to-white overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -start-40 h-[28rem] w-[28rem] rounded-full bg-orange-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 -end-24 h-[24rem] w-[24rem] rounded-full bg-green-100/40 blur-3xl"
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-medium text-orange-700 mb-6">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          {isAr ? "منصة إدارية متكاملة — Since 2018" : "Integrated Platform — Since 2018"}
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 max-w-4xl mx-auto">
          {title}
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
          {sub}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/app/register"
            className="w-full sm:w-auto px-8 py-4 text-white bg-orange-600 rounded-xl font-semibold text-lg hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/25"
          >
            {isAr ? "ابدأ التجربة مجانية" : "Start Free Trial"}
          </Link>
          <Link
            href="/app/login"
            className="w-full sm:w-auto px-8 py-4 border-2 border-neutral-300 rounded-xl font-semibold text-lg text-neutral-800 hover:bg-neutral-50 transition-colors"
          >
            {isAr ? "دخول النظام" : "Open System"}
          </Link>
        </div>
        <p className="mt-6 text-sm text-neutral-500">
          {isAr
            ? "14 يوم مجاناً · بدون بطاقة ائتمان · دعم عربي · يعمل بدون إنترنت"
            : "14 days free · no card · Arabic support · works offline"}
        </p>
      </div>
    </section>
  );
}