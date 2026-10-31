/**
 * queryTiers — centralized React Query freshness tiers (single source of truth).
 *
 * - LIVE (30s): transactional lists the operator watches (sales, vouchers).
 * - STANDARD (60s): default dashboards and working lists (global default).
 * - REFERENCE (10min): slow-changing lookup data (accounts, customers,
 *   suppliers, products, warehouses) used by dropdowns and selectors.
 * - STATIC (30min): currencies, units, master data that rarely changes.
 *
 * Raising a tier lowers Neon load and kills refetch storms; mutations must
 * invalidate explicitly (see each page's onSuccess handlers).
 */
export const QUERY_TIERS = {
  LIVE: 30_000,
  STANDARD: 60_000,
  REFERENCE: 600_000,
  STATIC: 1_800_000,
} as const;
