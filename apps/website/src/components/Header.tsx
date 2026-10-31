import Link from "next/link";
import LanguageToggle from "./LanguageToggle";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
        aria-label="Main"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-orange-600">الحسينية</span>
          <span className="hidden sm:block text-sm text-neutral-500">| AlHusainia</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link
            href="/app/login"
            className="hidden sm:inline-flex text-sm font-medium text-neutral-700 hover:text-orange-600"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/app/register"
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
          >
            ابدأ مجاناً
          </Link>
        </div>
      </nav>
    </header>
  );
}