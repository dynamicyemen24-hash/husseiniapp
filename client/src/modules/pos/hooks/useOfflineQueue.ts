import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import type { OfflineQueueItem } from "@/modules/pos/types";

const STORAGE_KEY = "pos_offline_queue";
const SYNCED_LEDGER_KEY = "pos_offline_synced";
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;
const SYNC_INTERVAL = 30000;

/**
 * Idempotency ledger — durable set of queue item IDs that have been
 * acknowledged by the server. Guarantees at-least-once delivery WITHOUT
 * duplicate invoices: a crash/network-cut after the server committed but
 * before the response arrived can no longer double-post on the next retry.
 */
function loadSyncedLedger(): Set<string> {
  try {
    const raw = localStorage.getItem(SYNCED_LEDGER_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function persistSyncedLedger(ledger: Set<string>) {
  try {
    localStorage.setItem(SYNCED_LEDGER_KEY, JSON.stringify([...ledger]));
  } catch {
    // localStorage unavailable — ledger is best-effort only.
  }
}

// ─── Raw tRPC transport (same auth path as the sync engine) ─────────

async function trpcMutate<T>(procedure: string, input: unknown): Promise<T> {
  const url = `/api/trpc/${procedure}?batch=1`;
  const resp = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json: input } }),
  });
  if (!resp.ok) throw new Error(`فشل إرسال العملية (${resp.status})`);
  const data = await resp.json();
  const envelope = data?.[0];
  if (envelope?.error) {
    throw new Error(envelope.error.message || "رفض الخادم العملية");
  }
  return (envelope?.result?.data ?? null) as T;
}

/**
 * Delivers an offline sale using EXACTLY the same input contract the online
 * checkout uses (POSPage.handleCompleteSale → sales.create), so offline and
 * online invoices are indistinguishable to the server.
 */
async function pushSale(item: OfflineQueueItem): Promise<void> {
  const p: any = item.payload ?? {};
  const validPaymentMethods = [
    "cash",
    "card",
    "transfer",
    "credit",
    "online",
  ] as const;
  const paymentMethod = (validPaymentMethods as readonly string[]).includes(
    p.paymentMethod
  )
    ? (p.paymentMethod as (typeof validPaymentMethods)[number])
    : "cash";

  await trpcMutate("sales.create", {
    customerId: p.customerId,
    items: Array.isArray(p.items)
      ? p.items.map((i: any) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
        }))
      : [],
    paymentMethod,
    paidAmount: String(p.paidAmount || 0),
    discount: String(p.discount || 0),
    notes: p.notes,
  });
}

/** Delivers a stock adjustment via the verified products.adjustStock contract. */
async function pushStockAdjustment(item: OfflineQueueItem): Promise<void> {
  const p: any = item.payload ?? {};
  const type =
    p.type === "in" || p.type === "out" || p.type === "adjustment"
      ? p.type
      : null;
  if (!type) throw new Error("نوع تسوية المخزون غير معروف");
  if (!Number.isInteger(Number(p.productId)))
    throw new Error("معرّف المنتج مفقود");

  await trpcMutate("products.adjustStock", {
    productId: Number(p.productId),
    quantity: Number(p.quantity),
    type,
    notes: p.notes != null ? String(p.notes) : undefined,
  });
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  const addToQueue = useCallback(
    (item: Omit<OfflineQueueItem, "id" | "timestamp" | "retries">) => {
      const newItem: OfflineQueueItem = {
        ...item,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        retries: 0,
        maxRetries: item.maxRetries || MAX_RETRIES,
      };
      setQueue(prev => [...prev, newItem]);
      return newItem.id;
    },
    []
  );

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const retryItem = useCallback((id: string) => {
    setQueue(prev =>
      prev.map(item => (item.id === id ? { ...item, retries: 0 } : item))
    );
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || queue.length === 0 || !isOnline) return;

    processingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    const ledger = loadSyncedLedger();
    const itemsToProcess = [...queue].sort((a, b) => a.timestamp - b.timestamp);
    let blocked = 0;

    for (const item of itemsToProcess) {
      // Idempotency: if this exact operation was already acknowledged by the
      // server, drop it from the local queue without re-posting.
      if (ledger.has(item.id)) {
        removeFromQueue(item.id);
        continue;
      }

      if (item.retries >= item.maxRetries) {
        // Do NOT silently delete. Keep the item visible so the operator can
        // review/retry it (financial data must never vanish in the noise).
        blocked++;
        continue;
      }

      try {
        await processItem(item);
        ledger.add(item.id);
        removeFromQueue(item.id);
      } catch (error) {
        const newRetries = item.retries + 1;
        setQueue(prev =>
          prev.map(i => (i.id === item.id ? { ...i, retries: newRetries } : i))
        );

        if (newRetries >= item.maxRetries) {
          console.error(
            `Item ${item.id} failed after ${newRetries} retries:`,
            error
          );
        }

        await new Promise(resolve =>
          setTimeout(resolve, RETRY_DELAY * newRetries)
        );
      }
    }

    persistSyncedLedger(ledger);

    setLastSync(Date.now());
    setIsSyncing(false);
    processingRef.current = false;

    if (blocked > 0) {
      setSyncError(
        `${blocked} عملية/عمليات تجاوزت حد المحاولات وتحتاج مراجعة يدوية — لن تُحذف.`
      );
    }
  }, [queue, isOnline, removeFromQueue]);

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (!isSyncing && !processingRef.current) {
          processQueue();
        }
      }, SYNC_INTERVAL);
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, queue.length, isSyncing, processQueue]);

  const processItem = async (item: OfflineQueueItem): Promise<void> => {
    switch (item.type) {
      case "sale":
        await pushSale(item);
        return;
      case "stock_adjustment":
        await pushStockAdjustment(item);
        return;
      case "return":
        // Failing closed is the only safe path: there is no verified server
        // procedure for offline returns — silently "succeeding" here would drop
        // money. The item stays in the queue and surfaces a visible error.
        throw new Error(
          "المرتجعات الأوفلاين غير مدعومة بعد — راجِعها يدوياً عند الاتصال"
        );
      case "payment":
        throw new Error(
          "الدفعات الأوفلاين غير مدعومة بعد — راجِعها يدوياً عند الاتصال"
        );
      default:
        throw new Error(`Unknown queue item type: ${(item as any).type}`);
    }
  };

  const forceSync = useCallback(() => {
    if (isOnline && !isSyncing) {
      processQueue();
    }
  }, [isOnline, isSyncing, processQueue]);

  const getQueueStats = useCallback(() => {
    const byType = queue.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const pendingRetries = queue.filter(item => item.retries > 0).length;
    const failedItems = queue.filter(
      item => item.retries >= item.maxRetries
    ).length;

    return {
      total: queue.length,
      byType,
      pendingRetries,
      failedItems,
      oldestItem:
        queue.length > 0 ? Math.min(...queue.map(i => i.timestamp)) : null,
    };
  }, [queue]);

  return {
    queue,
    isOnline,
    isSyncing,
    lastSync,
    syncError,
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryItem,
    forceSync,
    getQueueStats,
  };
}

export function useOfflineSupport() {
  const {
    queue,
    isOnline,
    isSyncing,
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryItem,
    forceSync,
    getQueueStats,
  } = useOfflineQueue();

  const queueSale = useCallback(
    (saleData: any) => {
      return addToQueue({ type: "sale", payload: saleData, maxRetries: 5 });
    },
    [addToQueue]
  );

  const queueReturn = useCallback(
    (returnData: any) => {
      return addToQueue({ type: "return", payload: returnData, maxRetries: 5 });
    },
    [addToQueue]
  );

  const queuePayment = useCallback(
    (paymentData: any) => {
      return addToQueue({
        type: "payment",
        payload: paymentData,
        maxRetries: 5,
      });
    },
    [addToQueue]
  );

  const queueStockAdjustment = useCallback(
    (adjustmentData: any) => {
      return addToQueue({
        type: "stock_adjustment",
        payload: adjustmentData,
        maxRetries: 5,
      });
    },
    [addToQueue]
  );

  return {
    queue,
    isOnline,
    isSyncing,
    lastSync: null,
    syncError: null,
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryItem,
    forceSync,
    getQueueStats,
    queueSale,
    queueReturn,
    queuePayment,
    queueStockAdjustment,
    pendingCount: queue.length,
  };
}
