import { useEffect, useRef } from "react";
import { Smartphone } from "lucide-react";
import { useServiceWorkerUpdate } from "@/lib/use-sw-update";

/**
 * SWUpdateToast — non-blocking toast that surfaces when the PWA has a fresh
 * build ready. Mounted once at the app root alongside the other global widgets.
 *
 * Uses `sonner`'s imperative toast API (same as the session-expiry handler in
 * main.tsx) so the update notification is consistent with the rest of the app's
 * notification surface.
 */
export function SWUpdateToast() {
  const { isUpdateAvailable, applyUpdate } = useServiceWorkerUpdate();
  // Guard against duplicate toasts: the effect re-runs when `isApplying`
  // flips, but the update should only be announced once per page load.
  const hasAnnounced = useRef(false);

  useEffect(() => {
    if (!isUpdateAvailable || hasAnnounced.current) return;
    hasAnnounced.current = true;

    // Lazy-import sonner so the critical boot path stays lean.
    import("sonner").then(({ toast }) => {
      toast("إصدار جديد متاح", {
        description: "تم تحميل تحسينات جديدة. اضغط لإعادة التشغيل وتطبيقها.",
        duration: 0, // persistent until dismissed or applied
        icon: <Smartphone className="w-4 h-4 text-brand" />,
        action: {
          label: "تحديث الآن",
          onClick: () => applyUpdate(),
        },
        closeButton: true,
      });
    });
  }, [isUpdateAvailable, applyUpdate]);

  return null; // purely side-effect; rendered as <SWUpdateToast /> in App.tsx
}
