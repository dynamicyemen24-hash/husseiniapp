/**
 * Offline Context for ALHUSAINIA Accounting.
 *
 * Provides:
 * - Online/offline status
 * - Sync state and progress
 * - Sync trigger functions
 * - Offline data statistics
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { syncManager, type SyncResult } from "./sync";
import { getOfflineStats, seedDefaultData, type TableName } from "./db";
import { useAuth } from "@/_core/hooks/useAuth";

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  syncNow: () => Promise<SyncResult | null>;
  offlineStats: Record<
    TableName,
    { total: number; pending: number; synced: number }
  > | null;
  refreshStats: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  lastSyncResult: null,
  syncNow: async () => null,
  offlineStats: null,
  refreshStats: async () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [offlineStats, setOfflineStats] = useState<Record<
    TableName,
    { total: number; pending: number; synced: number }
  > | null>(null);

  // Local (IndexedDB) seed runs for every visitor so the app shell has data to
  // render; the server sync loop only runs for authenticated subscribers so we
  // never fire unauthenticated /api/trpc/sync.* calls (which would 401 on the
  // public marketing site).
  useEffect(() => {
    seedDefaultData().then(() => getOfflineStats().then(setOfflineStats));
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let unsub = () => {};
    if (isAuthenticated) {
      syncManager.start();
      unsub = syncManager.subscribe(status => {
        setIsOnline(status.isOnline);
        setIsSyncing(status.isSyncing);
        if (status.lastResult) {
          setLastSyncResult(status.lastResult);
        }
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsub();
      syncManager.stop();
    };
  }, [isAuthenticated]);

  // Connectivity heartbeat for unauthenticated visitors. Relying solely on the
  // `offline` DOM event is NOT enough — under an emulated/blackout link
  // (Playwright setOffline, Wi-Fi without internet) navigator.onLine stays true
  // while every request fails, so the app would wrongly render "online". Probe
  // /api/health (never SW-cached) on mount and periodically while the tab is
  // visible; the first failed probe flips the banner within seconds.
  useEffect(() => {
    if (isAuthenticated) return; // authenticated sessions get the sync loop above
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    // XHR (not fetch): a fetch issued here has a Chrome/Playwright quirk where
    // the request never emits its finish lifecycle event (breaks the
    // networkidle state used by perf benchmarks). XHR completes normally.
    const probe = () => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/health");
      let done = false;
      const timeout = setTimeout(() => {
        if (done) return;
        done = true;
        xhr.abort();
        if (!stopped) setIsOnline(false);
      }, 2500);
      xhr.onload = () => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        if (!stopped) setIsOnline(xhr.status >= 200 && xhr.status < 300);
      };
      xhr.onerror = () => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        if (!stopped) setIsOnline(false);
      };
      xhr.send();
    };

    let starter: ReturnType<typeof setTimeout> | undefined;
    starter = setTimeout(probe, 1500);
    timer = setInterval(probe, 15_000);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (starter) clearTimeout(starter);
        if (timer) clearInterval(timer);
        timer = undefined;
        starter = undefined;
      } else if (!timer) {
        starter = setTimeout(probe, 500);
        timer = setInterval(probe, 15_000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      if (starter) clearTimeout(starter);
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated]);

  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    const result = await syncManager.syncNow();
    if (result) setLastSyncResult(result);
    const stats = await getOfflineStats();
    setOfflineStats(stats);
    return result;
  }, []);

  const refreshStats = useCallback(async () => {
    const stats = await getOfflineStats();
    setOfflineStats(stats);
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        lastSyncResult,
        syncNow,
        offlineStats,
        refreshStats,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
