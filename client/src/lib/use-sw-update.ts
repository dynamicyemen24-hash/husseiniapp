import { useEffect, useState, useCallback } from "react";

/**
 * useServiceWorkerUpdate — detects when a new Service Worker has installed and
 * is waiting to activate (i.e. a newer version of the site is ready).
 *
 * Returns `isUpdateAvailable` and an `applyUpdate` function that activates the
 * waiting worker and reloads the page. This is the foundation of the
 * "update detection UX" — without it, users never know they're on a stale build
 * of a PWA that silently fetches every 5 minutes.
 *
 * Degrades gracefully: if the browser doesn't support SWs, the hook reports
 * `isUpdateAvailable = false` and `applyUpdate` is a no-op reload.
 */
export function useServiceWorkerUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const swContainer = navigator.serviceWorker;

    // `onUpdatefound` tracks new SW installs on the registration.
    // We also store a cleanup so the `statechange` listener on the
    // installing worker doesn't leak.
    let stateChangeListener: ((ev: Event) => void) | null = null;

    swContainer.getRegistration().then(reg => {
      if (!reg) return;

      // Check if a waiting worker already exists (e.g. user reloaded after
      // a new SW was installed in a previous session).
      if (reg.waiting) {
        setIsUpdateAvailable(true);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        stateChangeListener = () => {
          // `installed` means the new SW finished installing but is waiting
          // because the old one is still controlling the page.
          if (newWorker.state === "installed" && reg.waiting) {
            setIsUpdateAvailable(true);
          }
        };
        newWorker.addEventListener("statechange", stateChangeListener);
      });
    });

    // `controllerchange` fires when the active worker changes — i.e. a new
    // SW took control (after the page reloads). Clear the update flag so the
    // toast doesn't re-appear on the fresh page.
    const onControllerChange = () => {
      setIsUpdateAvailable(false);
      setIsApplying(false);
    };
    swContainer.addEventListener("controllerchange", onControllerChange);

    return () => {
      swContainer.removeEventListener("controllerchange", onControllerChange);
      if (stateChangeListener) {
        swContainer
          .getRegistration()
          .then(reg =>
            reg?.installing?.removeEventListener(
              "statechange",
              stateChangeListener!
            )
          );
      }
    };
  }, []);

  const applyUpdate = useCallback(async () => {
    if (isApplying) return;
    setIsApplying(true);

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        // Instruct the waiting worker to take control immediately.
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
        // Once it activates and takes over, reload to pick up new assets.
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => window.location.reload(),
          { once: true }
        );
      } else {
        // No waiting worker — just hard-reload to fetch fresh assets.
        window.location.reload();
      }
    } catch {
      // Fallback: force-reload regardless.
      window.location.reload();
    }
  }, [isApplying]);

  // Auto-apply updates without user intervention: when a new build is ready,
  // activate the waiting worker and reload automatically.
  useEffect(() => {
    if (isUpdateAvailable && !isApplying) {
      applyUpdate();
    }
  }, [isUpdateAvailable, isApplying, applyUpdate]);

  return { isUpdateAvailable, applyUpdate, isApplying };
}
