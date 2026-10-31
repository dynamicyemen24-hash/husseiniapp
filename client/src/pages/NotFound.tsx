import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { brand, whatsappLink } from "@/lib/brand";
import { Home, Compass } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sand to-background brand-dotgrid px-4"
    >
      <div className="w-full max-w-lg text-center">
        <div className="flex justify-center mb-6">
          <BrandLogo size={64} />
        </div>

        <div className="text-7xl font-extrabold font-display text-ink leading-none">
          ٤٠٤
        </div>

        <h1 className="mt-3 text-2xl font-bold font-display text-foreground text-balance">
          الصفحة غير موجودة
        </h1>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed text-pretty">
          عذراً، الصفحة التي تبحث عنها غير متوفرة أو ربما تم نقلها أو حذفها.
          <br />
          يمكنك العودة للرئيسية أو التواصل معنا مباشرة.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => setLocation("/")}
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Home className="w-4 h-4 ml-2" />
            العودة للرئيسية
          </Button>
          <a
            href={whatsappLink(
              `السلام عليكم ${brand.names.legalFull}، واجهت صفحة 404 وأحتاج مساعدة.`
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              className="w-full sm:w-auto border-brand/40 text-brand-deep hover:bg-brand/10 px-6 py-2.5 rounded-xl"
            >
              <Compass className="w-4 h-4 ml-2" />
              تواصل معنا
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
