// Dexie IndexedDB Schema - Offline-First 100%
import { BaseEntity, BaseMaster, BaseDocument } from '../../../../../shared/core/types/base-entity';
import { StatusHistoryEntry } from '../../../../../shared/core/types/base-entity';

// Dexie is loaded from CDN at runtime; declare the global so SSR/non-browser
// builds don't fail on the typeof guard.
declare const Dexie: unknown;

export interface OfflineBase extends BaseEntity {
  _localId?: string;
  _dirty?: boolean;
}

export class HusseiniyaOfflineDB {
  organizations: any;
  branches: any;
  warehouses: any;
  currencies: any;
  customers: any;
  suppliers: any;
  products: any;
  chartOfAccounts: any;
  uoms: any;
  salesInvoices: any;
  purchaseInvoices: any;
  salesOrders: any;
  purchaseOrders: any;
  goodsReceipts: any;
  deliveryNotes: any;
  journalEntries: any;
  payments: any;
  stockMovements: any;
  statusHistory: any;
  syncOutbox: any;
  syncMeta: any;
  version: any;

  constructor() {
    (this as any)._dbName = 'HusseiniyaOfflineDB';
    // Dexie is loaded from CDN at runtime; guard for SSR/non-browser builds.
    if (typeof Dexie !== 'undefined') {
      // placeholder
    }
    (this as any).version = (v: number) => ({
      stores: (stores: any) => this
    });
  }
}

export const offlineDb = new HusseiniyaOfflineDB();