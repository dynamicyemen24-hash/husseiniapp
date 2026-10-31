import Link from "next/link";

export default function HomePage({ params }: { params: { locale: string } }) {
  const locale = params.locale === "en" ? "en" : "ar";
  const isAr = locale === "ar";
  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
          aria-label="Main"
        >
          <span className="text-xl font-bold">AlHusainia</span>
          <div className="flex items-center gap-4">
            <Link href="/app/login" className="text-sm font-medium">
              {isAr ? "تسجيل الدخول" : "Sign in"}
            </Link>
            <Link
              href="/app/register"
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg"
            >
              {isAr ? "ابدأ مجاناً" : "Start free"}
            </Link>
          </div>
        </nav>
      </header>
      <main className="pt-32 pb-20 max-w-7xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6">
          {isAr
            ? "حلول أعمال متكاملة لمؤسسات الغد"
            : "Integrated business solutions"}
        </h1>
        <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
          {isAr
            ? "المبيعات، المخزون، المحاسبة، الموارد البشرية، والمشتريات — منصة واحدة."
            : "Sales, inventory, accounting, HR, and procurement — one platform."}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/app/register"
            className="px-8 py-4 text-white bg-orange-600 rounded-xl font-semibold"
          >
            {isAr ? "ابدأ تجربتك المجانية" : "Start free trial"}
          </Link>
          <Link
            href="/app/login"
            className="px-8 py-4 border rounded-xl font-semibold"
          >
            {isAr ? "دخول النظام" : "Open system"}
          </Link>
        </div>
        <p className="mt-10 text-sm text-neutral-500">
          {isAr
            ? "الموقع التسويقي منفصل تماماً عن نواة النظام (System Core)."
            : "Marketing site is fully separate from System Core."}
        </p>
      </main>
    </div>
  );
}
