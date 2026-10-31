import { useEffect, useState } from "react";
import { useInstallPrompt } from "@/lib/use-install-prompt";
import { Download, X } from "lucide-react";

export function InstallPrompt() {
  const { hasInstalled, showInstallCTA, handleInstallClick } =
    useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!showInstallCTA || dismissed) return;
    const t = setTimeout(() => setDismissed(true), 15000);
    return () => clearTimeout(t);
  }, [showInstallCTA, dismissed]);

  if (hasInstalled || dismissed || !showInstallCTA) return null;

  return (
    <div className="fixed left-1/2 z-[70] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 bottom-[calc(5rem+env(safe-area-inset-bottom))] font-display">
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-ink/95 px-4 py-2 shadow-2xl backdrop-blur">
        <Download className="h-4 w-4 shrink-0 text-brand" />
        <p className="flex-1 text-[11px] leading-tight text-white/90">
          ثبّت تطبيق ALHUSAINIA على جهازك للوصول السريع دون متصفح
        </p>
        <button
          onClick={handleInstallClick}
          className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold text-ink-deep transition-colors hover:bg-brand-deep hover:text-sand"
        >
          تثبيت
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="إغلاق"
          className="shrink-0 p-1 text-white/50 transition-colors hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
