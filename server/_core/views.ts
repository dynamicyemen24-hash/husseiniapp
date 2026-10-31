/**
 * server/_core/views.ts
 * ---------------------
 * Drizzle read-only schemas for the enterprise performance VIEWs created by
 * `drizzle/0010_enterprise_performance_views.sql`.
 *
 * These live VIEWs power dashboards, statements and tracking screens without
 * recomputing hundreds of rows in JS. They are defined here (NOT in schema.ts)
 * because they are additive reporting conveniences — the base tables remain
 * the canonical source of truth for writes.
 *
 * Access pattern (tenant-scoped procedures):
 *   const rows = await db.select().from(accountBalancesView)
 *     .where(eq(accountBalancesView.tenantId, tenantId));
 *
 * IMPORTANT: every view derives tenantId from base tables and every consumer
 * must still filter by tenantId — the surface stays zero-trust.
 */
import {
  pgView,
  integer,
  varchar,
  numeric,
  timestamp,
  boolean,
  date,
} from "drizzle-orm/pg-core";

/** Trial-balance style balances per tenant/account. */
export const accountBalancesView = pgView("v_account_balances", {
  tenantId: integer("tenantId"),
  accountId: integer("accountId"),
  code: varchar("code", { length: 50 }),
  name: varchar("name", { length: 255 }),
  type: varchar("type", { length: 50 }),
  balance: numeric("balance"),
}).existing();

/** Stock levels vs reorder/min per product+warehouse. */
export const inventoryHealthView = pgView("v_inventory_health", {
  tenantId: integer("tenantId"),
  productId: integer("productId"),
  warehouseId: integer("warehouseId"),
  productCode: varchar("productCode", { length: 50 }),
  productName: varchar("productName", { length: 255 }),
  productNameAr: varchar("productNameAr", { length: 255 }),
  quantity: integer("quantity"),
  reservedQty: integer("reservedQty"),
  availableQty: integer("availableQty"),
  reorderPoint: numeric("reorderPoint"),
  minStock: numeric("minStock"),
  needsReplenishment: boolean("needsReplenishment"),
}).existing();

/** Daily revenue aggregates for dashboards. */
export const salesTrendView = pgView("v_sales_trend", {
  tenantId: integer("tenantId"),
  branchId: integer("branchId"),
  saleDate: date("saleDate"),
  currency: varchar("currency", { length: 10 }),
  invoiceCount: integer("invoiceCount"),
  grossTotal: numeric("grossTotal"),
  totalDiscount: numeric("totalDiscount"),
  totalTax: numeric("totalTax"),
  netTotal: numeric("netTotal"),
}).existing();

/** Spatial-temporal audit trail (device + geo + hash chain). */
export const activityTraceView = pgView("v_activity_trace", {
  tenantId: integer("tenantId"),
  userId: integer("userId"),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 255 }),
  entityType: varchar("entityType", { length: 100 }),
  entityId: integer("entityId"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 120 }),
  lat: numeric("lat"),
  lng: numeric("lng"),
  deviceId: integer("deviceId"),
  deviceName: varchar("deviceName", { length: 255 }),
  deviceType: varchar("deviceType", { length: 30 }),
  currentHash: varchar("currentHash", { length: 64 }),
  chainSequence: integer("chainSequence"),
  createdAt: timestamp("createdAt"),
}).existing();

/** Multi-tenant/entity KPIs (branches, warehouses, currencies, UOM, master data). */
export const tenantMasterSummaryView = pgView("v_tenant_master_summary", {
  tenantId: integer("tenantId"),
  tenantName: varchar("tenantName", { length: 255 }),
  tenantCode: varchar("tenantCode", { length: 50 }),
  currency: varchar("currency", { length: 20 }),
  country: varchar("country", { length: 100 }),
  branchCount: integer("branchCount"),
  warehouseCount: integer("warehouseCount"),
  currencyCount: integer("currencyCount"),
  uomCount: integer("uomCount"),
  accountCount: integer("accountCount"),
  productCount: integer("productCount"),
  customerCount: integer("customerCount"),
  userCount: integer("userCount"),
}).existing();

export { integer, varchar, numeric, timestamp, boolean, date };
