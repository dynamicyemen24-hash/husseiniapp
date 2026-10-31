import { useEffect, useState, useRef } from "react";

/** Returns whether the PWA install prompt is available and visible */
export function useInstallPrompt() {
  const [hasInstalled, setHasInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const installButtonRef = useRef<HTMLButtonElement | null>(null);

  // Check if already installed (standalone mode on mobile)
  useEffect(() => {
    const checkInstalled = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setHasInstalled(true);
      }
    };

    checkInstalled();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", checkInstalled);

    return () => {
      mq.removeEventListener("change", checkInstalled);
    };
  }, []);

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show the install CTA
      if (installButtonRef.current) {
        installButtonRef.current.style.display = "block";
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [installButtonRef]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      // Hide the install button after user clicks
      if (installButtonRef.current) {
        installButtonRef.current.style.display = "none";
      }
      // Reset deferred prompt variable after prompt is shown
      // At this point, user can accept or dismiss the install prompt
      (deferredPrompt as any).userChoice.then((choiceResult: any) => {
        if (choiceResult?.outcome === "accepted") {
          setHasInstalled(true);
        }
        // Clear the deferred prompt so it can't be shown again
        setDeferredPrompt(null);
      });
    }
  };

  return {
    hasInstalled,
    showInstallCTA: !hasInstalled && !!deferredPrompt,
    handleInstallClick,
    installButtonRef,
  };
}
