/**
 * Offline-first IndexedDB data layer for ALHUSAINIA Accounting.
 * Uses native IndexedDB API (no external dependencies).
 *
 * Architecture:
 * - All CRUD operations go through IndexedDB first (write-through cache)
 * - Sync queue tracks pending mutations for server replay
 * - Conflict resolution via version tracking (last-writer-wins)
 * - Each table stores a `_version` field for incremental sync
 */

const DB_NAME = "alhusainia-accounting";
// v4: recreate the `_status` index properly on the upgrade transaction —
// the previous attempt nested a NEW transaction inside onupgradeneeded
// (invalid in IndexedDB) and silently failed, leaving existing clients
// without the index (NotFoundError on every getByIndex("_status") call).
const DB_VERSION = 4;

export type SyncStatus = "synced" | "pending" | "conflict";

export interface SyncMeta {
  _syncId: string;
  _version: number;
  _syncedAt: number;
  _status: SyncStatus;
  _deviceId: string;
}

export interface SyncQueueEntry {
  id?: number;
  tableName: string;
  recordId: string;
  operation: "create" | "update" | "delete";
  payload: unknown;
  timestamp: number;
  deviceId: string;
  retries: number;
}

// ─── IndexedDB Singleton Connection ────────────────────────────────

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("accounts")) {
        const store = db.createObjectStore("accounts", { keyPath: "id" });
        store.createIndex("code", "code", { unique: true });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("_syncId", "_syncId", { unique: true });
      }
      if (!db.objectStoreNames.contains("transactions")) {
        const store = db.createObjectStore("transactions", { keyPath: "id" });
        store.createIndex("accountId", "accountId", { unique: false });
        store.createIndex("transactionDate", "transactionDate", {
          unique: false,
        });
        store.createIndex("_syncId", "_syncId", { unique: true });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("budgets")) {
        db.createObjectStore("budgets", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("openingBalances")) {
        const store = db.createObjectStore("openingBalances", {
          keyPath: "id",
        });
        store.createIndex("accountId", "accountId", { unique: false });
      }
      if (!db.objectStoreNames.contains("branches")) {
        db.createObjectStore("branches", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("tenants")) {
        db.createObjectStore("tenants", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("activityLogs")) {
        const store = db.createObjectStore("activityLogs", { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("users")) {
        const store = db.createObjectStore("users", { keyPath: "id" });
        store.createIndex("openId", "openId", { unique: true });
      }
      if (!db.objectStoreNames.contains("branchPermissions")) {
        const store = db.createObjectStore("branchPermissions", {
          keyPath: "id",
        });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("branchId", "branchId", { unique: false });
      }
      // Business module stores
      if (!db.objectStoreNames.contains("products")) {
        const store = db.createObjectStore("products", { keyPath: "id" });
        store.createIndex("code", "code", { unique: true });
        store.createIndex("barcode", "barcode", { unique: false });
      }
      if (!db.objectStoreNames.contains("warehouses")) {
        const store = db.createObjectStore("warehouses", { keyPath: "id" });
        store.createIndex("code", "code", { unique: true });
      }
      if (!db.objectStoreNames.contains("inventoryMovements")) {
        const store = db.createObjectStore("inventoryMovements", {
          keyPath: "id",
        });
        store.createIndex("productId", "productId", { unique: false });
      }
      if (!db.objectStoreNames.contains("customers")) {
        const store = db.createObjectStore("customers", { keyPath: "id" });
        store.createIndex("code", "code", { unique: true });
        store.createIndex("phone", "phone", { unique: false });
      }
      if (!db.objectStoreNames.contains("suppliers")) {
        const store = db.createObjectStore("suppliers", { keyPath: "id" });
        store.createIndex("code", "code", { unique: true });
      }
      if (!db.objectStoreNames.contains("salesInvoices")) {
        const store = db.createObjectStore("salesInvoices", { keyPath: "id" });
        store.createIndex("invoiceNumber", "invoiceNumber", { unique: true });
        store.createIndex("customerId", "customerId", { unique: false });
      }
      if (!db.objectStoreNames.contains("salesInvoiceItems")) {
        const store = db.createObjectStore("salesInvoiceItems", {
          keyPath: "id",
        });
        store.createIndex("invoiceId", "invoiceId", { unique: false });
      }
      if (!db.objectStoreNames.contains("purchaseInvoices")) {
        const store = db.createObjectStore("purchaseInvoices", {
          keyPath: "id",
        });
        store.createIndex("invoiceNumber", "invoiceNumber", { unique: true });
        store.createIndex("supplierId", "supplierId", { unique: false });
      }
      if (!db.objectStoreNames.contains("purchaseInvoiceItems")) {
        const store = db.createObjectStore("purchaseInvoiceItems", {
          keyPath: "id",
        });
        store.createIndex("invoiceId", "invoiceId", { unique: false });
      }
      if (!db.objectStoreNames.contains("orders")) {
        const store = db.createObjectStore("orders", { keyPath: "id" });
        store.createIndex("orderNumber", "orderNumber", { unique: true });
        store.createIndex("customerId", "customerId", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains("orderItems")) {
        const store = db.createObjectStore("orderItems", { keyPath: "id" });
        store.createIndex("orderId", "orderId", { unique: false });
      }
      if (!db.objectStoreNames.contains("payments")) {
        const store = db.createObjectStore("payments", { keyPath: "id" });
        store.createIndex("invoiceId", "invoiceId", { unique: false });
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        const store = db.createObjectStore("syncQueue", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("tableName", "tableName", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
      if (!db.objectStoreNames.contains("syncMeta")) {
        db.createObjectStore("syncMeta", { keyPath: "tableName" });
      }

      // PERFORMANCE: Add _status index to all data stores for fast stats queries.
      // This index is used by getOfflineStats() to count pending/synced records
      // without loading all records into memory.
      // IMPORTANT: indices MUST be created on the upgrade transaction itself —
      // opening a nested db.transaction() inside onupgradeneeded is invalid and
      // throws NotFoundError (previously swallowed, so the index never existed).
      const upgradeTx = (event.target as IDBOpenDBRequest).transaction;
      const dataStores = [
        "accounts",
        "transactions",
        "settings",
        "budgets",
        "openingBalances",
        "branches",
        "tenants",
        "activityLogs",
        "users",
        "branchPermissions",
        "products",
        "warehouses",
        "inventoryMovements",
        "customers",
        "suppliers",
        "salesInvoices",
        "salesInvoiceItems",
        "purchaseInvoices",
        "purchaseInvoiceItems",
        "orders",
        "orderItems",
        "payments",
      ];
      for (const storeName of dataStores) {
        if (db.objectStoreNames.contains(storeName) && upgradeTx) {
          try {
            const store = upgradeTx.objectStore(storeName);
            if (!store.indexNames.contains("_status")) {
              store.createIndex("_status", "_status", { unique: false });
            }
          } catch (e) {
            console.warn(`Could not create _status index for ${storeName}:`, e);
          }
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      _dbPromise = null;
      reject(request.error);
    };
  });
  return _dbPromise;
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateSyncId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDeviceId(): string {
  let id = localStorage.getItem("alhusainia_device_id");
  if (!id) {
    id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem("alhusainia_device_id", id);
  }
  return id;
}

// ─── Transaction Helper (safe, no async executor) ──────────────────

async function runTx<T>(
  mode: IDBTransactionMode,
  storeName: string | string[],
  fn: (stores: IDBObjectStore | IDBObjectStore[]) => IDBRequest<T> | Promise<T>
): Promise<T> {
  const db = await openDB();
  const names = Array.isArray(storeName) ? storeName : [storeName];
  const transaction = db.transaction(names, mode);
  const stores = names.map(n => transaction.objectStore(n));
  const target = stores.length === 1 ? stores[0] : stores;
  try {
    const raw = fn(target);
    const result = raw instanceof Promise ? await raw : await reqToPromise(raw);
    return await new Promise<T>((resolve, reject) => {
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch (e) {
    transaction.abort();
    throw e;
  }
}

// ─── Generic CRUD Operations ──────────────────────────────────────

export type TableName =
  | "accounts"
  | "transactions"
  | "settings"
  | "budgets"
  | "openingBalances"
  | "branches"
  | "tenants"
  | "activityLogs"
  | "users"
  | "branchPermissions"
  | "products"
  | "warehouses"
  | "inventoryMovements"
  | "customers"
  | "suppliers"
  | "salesInvoices"
  | "salesInvoiceItems"
  | "purchaseInvoices"
  | "purchaseInvoiceItems"
  | "orders"
  | "orderItems"
  | "payments";

type WithSync<T> = T & SyncMeta;

export async function getAll<T>(table: TableName): Promise<WithSync<T>[]> {
  return runTx("readonly", table, store => (store as IDBObjectStore).getAll());
}

export async function getById<T>(
  table: TableName,
  id: string | number
): Promise<WithSync<T> | undefined> {
  return runTx("readonly", table, store => (store as IDBObjectStore).get(id));
}

export async function getByIndex<T>(
  table: TableName,
  indexName: string,
  value: IDBValidKey
): Promise<WithSync<T>[]> {
  return runTx("readonly", table, store => {
    const s = store as IDBObjectStore;
    // Defensive: a missing index (old DB version) must degrade to a full scan,
    // never throw NotFoundError into an unhandled rejection.
    if (!s.indexNames.contains(indexName)) {
      return reqToPromise(s.getAll()).then(records =>
        (records as WithSync<T>[]).filter(
          r => (r as unknown as Record<string, unknown>)[indexName] === value
        )
      );
    }
    return s.index(indexName).getAll(value);
  });
}

export async function count(table: TableName): Promise<number> {
  return runTx("readonly", table, store => (store as IDBObjectStore).count());
}

export async function countByIndex(
  table: TableName,
  indexName: string,
  value: IDBValidKey
): Promise<number> {
  return runTx("readonly", table, store => {
    const s = store as IDBObjectStore;
    if (!s.indexNames.contains(indexName)) {
      return reqToPromise(s.getAll()).then(
        records =>
          (records as unknown as Record<string, unknown>[]).filter(
            r => r[indexName] === value
          ).length
      );
    }
    return s.index(indexName).count(value);
  });
}

export async function put<T extends { id?: string | number }>(
  table: TableName,
  record: T & Partial<SyncMeta>,
  forceOperation?: "create" | "update"
): Promise<void> {
  const existingRecord = record.id
    ? await getById(table, record.id)
    : undefined;
  const operation = forceOperation || (existingRecord ? "update" : "create");

  const enriched = {
    ...record,
    _syncId: record._syncId || generateSyncId(),
    _version: (record._version || 0) + 1,
    _syncedAt: record._syncedAt || 0,
    _status: "pending" as SyncStatus,
    _deviceId: getDeviceId(),
  };
  await runTx("readwrite", table, store =>
    (store as IDBObjectStore).put(enriched)
  );
  await enqueueSync(
    table,
    String(enriched.id || enriched._syncId),
    operation,
    enriched
  );
}

export async function remove(
  table: TableName,
  id: string | number
): Promise<void> {
  const existing = await getById(table, id);
  if (existing) {
    await runTx("readwrite", table, store =>
      (store as IDBObjectStore).delete(id)
    );
    await enqueueSync(table, String(id), "delete", { id });
  }
}

export async function removeLocalRow(
  table: TableName,
  id: string | number
): Promise<void> {
  await runTx("readwrite", table, store =>
    (store as IDBObjectStore).delete(id)
  );
}

export async function clear(table: TableName): Promise<void> {
  await runTx("readwrite", table, store => (store as IDBObjectStore).clear());
}

// ─── Bulk Operations ──────────────────────────────────────────────

export async function bulkPut<T>(
  table: TableName,
  records: T[]
): Promise<void> {
  return runTx("readwrite", table, async store => {
    const s = store as IDBObjectStore;
    for (const record of records) {
      const enriched = {
        ...record,
        _syncId: (record as any)._syncId || generateSyncId(),
        _version: (record as any)._version || 0,
        _syncedAt: Date.now(),
        _status: "synced" as SyncStatus,
        _deviceId: getDeviceId(),
      };
      s.put(enriched);
    }
  });
}

export async function bulkGet<T>(table: TableName): Promise<WithSync<T>[]> {
  return getAll<T>(table);
}

// ─── Sync Queue ───────────────────────────────────────────────────

async function enqueueSync(
  tableName: string,
  recordId: string,
  operation: "create" | "update" | "delete",
  payload: unknown
): Promise<void> {
  const entry: Omit<SyncQueueEntry, "id"> = {
    tableName,
    recordId,
    operation,
    payload,
    timestamp: Date.now(),
    deviceId: getDeviceId(),
    retries: 0,
  };
  await runTx("readwrite", "syncQueue", store =>
    (store as IDBObjectStore).put(entry)
  );
}

export async function getPendingSyncs(): Promise<SyncQueueEntry[]> {
  return runTx("readonly", "syncQueue", store =>
    (store as IDBObjectStore).getAll()
  );
}

export async function removeSyncEntry(id: number): Promise<void> {
  await runTx("readwrite", "syncQueue", store =>
    (store as IDBObjectStore).delete(id)
  );
}

export async function incrementRetry(id: number): Promise<void> {
  await runTx("readwrite", "syncQueue", store => {
    const s = store as IDBObjectStore;
    const req = s.get(id);
    return reqToPromise(req).then(entry => {
      if (entry) {
        entry.retries = (entry.retries || 0) + 1;
        s.put(entry);
      }
    });
  });
}

export async function getSyncMeta(
  tableName: string
): Promise<
  { tableName: string; lastSyncVersion: number; lastSyncAt: number } | undefined
> {
  return runTx("readonly", "syncMeta", store =>
    (store as IDBObjectStore).get(tableName)
  );
}

export async function setSyncMeta(
  tableName: string,
  lastSyncVersion: number
): Promise<void> {
  await runTx("readwrite", "syncMeta", store =>
    (store as IDBObjectStore).put({
      tableName,
      lastSyncVersion,
      lastSyncAt: Date.now(),
    })
  );
}

// ─── Statistics ───────────────────────────────────────────────────

export async function getOfflineStats(): Promise<
  Record<TableName, { total: number; pending: number; synced: number }>
> {
  const tables: TableName[] = [
    "accounts",
    "transactions",
    "settings",
    "budgets",
    "openingBalances",
    "branches",
    "tenants",
    "activityLogs",
    "users",
    "branchPermissions",
    "products",
    "warehouses",
    "inventoryMovements",
    "customers",
    "suppliers",
    "salesInvoices",
    "salesInvoiceItems",
    "purchaseInvoices",
    "purchaseInvoiceItems",
    "orders",
    "orderItems",
    "payments",
  ];
  const stats: Record<
    string,
    { total: number; pending: number; synced: number }
  > = {};
  for (const table of tables) {
    // PERFORMANCE: Use count() and index.count() instead of getAll() to avoid
    // loading all records into memory. The _status index (added in DB v3)
    // allows counting pending/synced records via an indexed lookup.
    const [total, pending, synced] = await Promise.all([
      count(table),
      countByIndex(table, "_status", "pending"),
      countByIndex(table, "_status", "synced"),
    ]);
    stats[table] = { total, pending, synced };
  }
  return stats as Record<
    TableName,
    { total: number; pending: number; synced: number }
  >;
}

// ─── Default Account Chart (aligned with server seed: 1010–5050) ──

const DEFAULT_ACCOUNTS = [
  // الأصول
  {
    id: "1",
    code: "1010",
    name: "الصندوق الرئيسي (الخزينة)",
    type: "asset",
    category: "الأصول المتداولة",
    balance: 0,
    isActive: true,
  },
  {
    id: "2",
    code: "1020",
    name: "البنك التجاري / الإسلامي",
    type: "asset",
    category: "الأصول المتداولة",
    balance: 0,
    isActive: true,
  },
  {
    id: "3",
    code: "1030",
    name: "حساب العُملاء والمدينون",
    type: "asset",
    category: "الأصول المتداولة",
    balance: 0,
    isActive: true,
  },
  // الخصوم
  {
    id: "4",
    code: "2010",
    name: "الدائنون والموردون",
    type: "liability",
    category: "الخصوم المتداولة",
    balance: 0,
    isActive: true,
  },
  // حقوق الملكية
  {
    id: "5",
    code: "3010",
    name: "رأس المال",
    type: "equity",
    category: "حقوق الملكية",
    balance: 0,
    isActive: true,
  },
  // الإيرادات
  {
    id: "6",
    code: "4010",
    name: "إيرادات خدمات الأعمال والمعاملات",
    type: "revenue",
    category: "الإيرادات التشغيلية",
    balance: 0,
    isActive: true,
  },
  {
    id: "7",
    code: "4020",
    name: "إيرادات متنوعة",
    type: "revenue",
    category: "إيرادات أخرى",
    balance: 0,
    isActive: true,
  },
  // المصروفات
  {
    id: "8",
    code: "5010",
    name: "مصروفات الرواتب والأجور",
    type: "expense",
    category: "المصروفات التشغيلية",
    balance: 0,
    isActive: true,
  },
  {
    id: "9",
    code: "5020",
    name: "مصروفات الإيجار والخدمات (كهرباء، ماء، إنترنت)",
    type: "expense",
    category: "المصروفات التشغيلية",
    balance: 0,
    isActive: true,
  },
  {
    id: "10",
    code: "5030",
    name: "مصروفات حكومية ورسوم تخليص",
    type: "expense",
    category: "المصروفات التشغيلية",
    balance: 0,
    isActive: true,
  },
  {
    id: "11",
    code: "5040",
    name: "مصروفات متنوعة وعمومية",
    type: "expense",
    category: "المصروفات الإدارية",
    balance: 0,
    isActive: true,
  },
  {
    id: "12",
    code: "5050",
    name: "تكلفة البضاعة المشتراة (المشتريات التجارية)",
    type: "expense",
    category: "تكلفة المبيعات",
    balance: 0,
    isActive: true,
  },
];

const DEFAULT_SETTINGS = [
  { id: "currency", value: "YER" },
  { id: "companyName", value: "" },
  { id: "fiscalYear", value: new Date().getFullYear().toString() },
  { id: "taxRate", value: "0" },
];

// ─── Seed Default Data ────────────────────────────────────────────

export async function seedDefaultData(): Promise<void> {
  const accountsCount = await count("accounts");
  if (accountsCount > 0) return; // already seeded

  const deviceId = getDeviceId();

  const accountsWithMeta = DEFAULT_ACCOUNTS.map(a => ({
    ...a,
    _syncId: generateSyncId(),
    _version: 1,
    _syncedAt: 0,
    _status: "synced" as SyncStatus,
    _deviceId: deviceId,
  }));

  const settingsWithMeta = DEFAULT_SETTINGS.map(s => ({
    ...s,
    _syncId: generateSyncId(),
    _version: 1,
    _syncedAt: 0,
    _status: "synced" as SyncStatus,
    _deviceId: deviceId,
  }));

  await runTx("readwrite", ["accounts", "settings"], async stores => {
    const aStore = (stores as IDBObjectStore[])[0];
    const sStore = (stores as IDBObjectStore[])[1];
    for (const a of accountsWithMeta) aStore.put(a);
    for (const s of settingsWithMeta) sStore.put(s);
  });
}

export { openDB, getDeviceId };
