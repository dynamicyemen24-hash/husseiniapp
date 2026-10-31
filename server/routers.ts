import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_MONTH_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { getTenantAIProvider, invokeTenantLLM } from "./_core/tenantAI";
import {
  systemRouter,
  provisionGenericTenant,
  applyAuthSchema,
} from "./_core/systemRouter";
import { hashPassword, verifyPassword } from "./_core/password";
import { getClientIp, geolocate, parseDevice } from "./_core/geo";
import { generateSecret, verifyToken, otpauthUrl } from "./_core/totp";
import { validateOrThrow } from "./services/doubleEntryValidator";
import * as inventoryService from "./services/inventoryService";
import {
  genGlobalCode,
  isSaudiCountry,
  buildZatcaQr,
  invoiceHash,
} from "./_core/governance";
import { erpRouter } from "./erpRouter";
import { queryRouter } from "./queryRouter";
import { modulesRouter } from "./modulesRouter";
import { aliasAiRouter } from "./aliasAiRouter";
import { backupRouter } from "./backupRouter";
import { billingRouter } from "./billingRouter";
import { costCentersRouter } from "./costCentersRouter";
import { beneficiariesRouter } from "./beneficiariesRouter";
import { inventoryRouter } from "./inventoryRouter";
import { procurementRouter } from "./procurementRouter";
import {
  purchaseOrdersRouter,
  goodsReceiptsRouter,
} from "./purchaseOrdersRouter";
import { projectsRouter } from "./projectsRouter";
import { posRouter } from "./posRouter";
import { financialReportsRouter } from "./financialReportsRouter";
import { fiscalPeriodsRouter } from "./fiscalPeriodsRouter";
import { salesReportsRouter } from "./salesReportsRouter";
import { purchasesReportsRouter } from "./purchasesReportsRouter";
import { distributionReportsRouter } from "./distributionReportsRouter";
import { customerServiceReportsRouter } from "./customerServiceReportsRouter";
import {
  openingBalancesRouter,
  fiscalPeriodClosingRouter,
  accountingReportsRouter,
  inventoryReportsRouter,
} from "./accountingClosingRouter";
import { assertPeriodOpen } from "./services/accountingEngine";
import { pharmacyRouter } from "./pharmacyRouter";
import { quotationRouter } from "./quotationRouter";
import { computeInvoiceTotals } from "./services/pricingResolver";
import { vouchersRouter } from "./vouchersRouter";
import { healthcareRouter } from "./healthcareRouter";
import { securityRouter } from "./securityRouter";
import { documentTemplateRouter } from "./documentTemplateRouter";
import { communicationRouter } from "./communicationRouter";
import { debtReportsRouter } from "./debtReportsRouter";
import { invoiceEnhancementsRouter } from "./invoiceEnhancementsRouter";
import { procurementReportsRouter } from "./procurementReportsRouter";
import { posIntelligenceRouter } from "./posIntelligenceRouter";
import { smartRouter } from "./smartRouter";
import { auditRouter } from "./routers/auditRouter";
import { workflowRouter } from "./routers/workflowRouter";
import { documentsRouter } from "./documentsRouter";
import { partnerAccountingRouter } from "./partnerAccountingRouter";
import { managerialAccountingRouter } from "./managerialAccountingRouter";
import { advancedCostAccountingRouter } from "./advancedCostAccountingRouter";
import { productionAccountingRouter } from "./productionAccountingRouter";
import { eliasProRouter } from "./eliasPro/router";
import {
  decryptExternalAIConfig,
  encryptExternalAIConfig,
  safeExternalAIConfig,
} from "./_core/externalAIConfig";

/**
 * Separation of Duties (SoD): the creator of a financial transaction must not
 * approve/post it themselves. Only the platform owner (super-admin) is exempt
 * from this rule for governance-level actions. Enforced in updateTransactionLifecycle.
 */
const SOD_EXEMPT_ROLES = ["owner"] as const;

function canApproveOwnTransaction(role: string | undefined): boolean {
  return !!role && (SOD_EXEMPT_ROLES as readonly string[]).includes(role);
}
import {
  publicProcedure,
  protectedProcedure,
  tenantProcedure,
  adminProcedure,
  ownerProcedure,
  router,
  requirePermissions,
} from "./_core/trpc";
import { PERMISSIONS } from "../shared/permissions";
import { DEFAULT_COMMUNICATION_SETTINGS } from "../shared/communication";
import { requireTenantId } from "./_core/tenant";
import { cachedForTenant, TENANT_CACHE_TTL } from "./_core/tenantCache";
import { getDb, upsertUser } from "./db";
import { getJwks, rotateKeys } from "./_core/jwt";
import { timingSafeEqual, randomUUID } from "crypto";
import {
  getCatalog,
  placePublicOrder,
  placeOrderInputSchema,
} from "./webStore";
import { checkRateLimit } from "./_core/rateLimit";
import {
  runScheduledJournalEntries,
  runRecurringExpenses,
  scheduleNextRun,
  generateUpcomingRuns,
  processRecurringExpenseRun,
} from "./automation";
import { TRPCError } from "@trpc/server";
import * as authService from "./services/authService";
import { matchInvoiceAgainstPo, assertSupplierMatches } from "./threeWayMatch";

// Helper function for monthly frequency factor
function getMonthlyFactor(frequency: string): number {
  switch (frequency) {
    case "daily":
      return 30;
    case "weekly":
      return 4.33;
    case "biweekly":
      return 2.17;
    case "monthly":
      return 1;
    case "quarterly":
      return 1 / 3;
    case "semiannual":
      return 1 / 6;
    case "annual":
      return 1 / 12;
    default:
      return 1;
  }
}

import {
  users,
  loginAttempts,
  LoginAttempt,
  accounts,
  transactions,
  journalEntries,
  fiscalPeriods,
  settings,
  budgets,
  activityLogs,
  openingBalances,
  tenants,
  branches,
  costCenters,
  userBranchPermissions,
  products,
  warehouses,
  inventoryMovements,
  stockAdjustments,
  warehouseTransfers,
  workSites,
  devices,
  currencies,
  customers,
  suppliers,
  salesInvoices,
  salesInvoiceItems,
  purchaseInvoices,
  purchaseInvoiceItems,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
  orders,
  orderItems,
  payments,
  posOrders,
  posHeldCarts,
  posReturns,
  posReturnItems,
  scheduledJournalEntries,
  recurringExpenses,
  recurringExpenseRuns,
  warehouseStock,
  inventoryBatches,
  stockReservations,
  cycleCounts,
  cycleCountLines,
  inventoryValuationLayers,
  tenantSubscriptions,
  subscriptionPlans,
  subscriptionPolicies,
  intermediaryParties,
  documentPartyLinks,
  documentExpenses,
  promotions,
  approvalQueues,
  lineItemHistory,
  flexibleLineItems,
} from "../drizzle/schema";
import {
  eq,
  desc,
  sql,
  asc,
  and,
  or,
  gte,
  lte,
  ilike,
  inArray,
  ne,
  isNull,
  getTableColumns,
} from "drizzle-orm";
import { z } from "zod";

// Seed default accounts per-tenant (idempotent upserts)
const _seededTenants = new Set<number>();
export function currencyDisplayName(code?: string): string {
  switch ((code || "YER").toUpperCase()) {
    case "SAR":
      return "Ø±ÙŠØ§Ù„ Ø³Ø¹ÙˆØ¯ÙŠ (SAR)";
    case "AED":
      return "Ø¯Ø±Ù‡Ù… Ø¥Ù…Ø§Ø±Ø§ØªÙŠ (AED)";
    case "USD":
      return "Ø¯ÙˆÙ„Ø§Ø± Ø£Ù…Ø±ÙŠÙƒÙŠ (USD)";
    case "KWD":
      return "Ø¯ÙŠÙ†Ø§Ø± ÙƒÙˆÙŠØªÙŠ (KWD)";
    case "QAR":
      return "Ø±ÙŠØ§Ù„ Ù‚Ø·Ø±ÙŠ (QAR)";
    case "BHD":
      return "Ø¯ÙŠÙ†Ø§Ø± Ø¨Ø­Ø±ÙŠÙ†ÙŠ (BHD)";
    case "OMR":
      return "Ø±ÙŠØ§Ù„ Ø¹Ù…Ø§Ù†ÙŠ (OMR)";
    case "EGP":
      return "Ø¬Ù†ÙŠÙ‡ Ù…ØµØ±ÙŠ (EGP)";
    case "JOD":
      return "Ø¯ÙŠÙ†Ø§Ø± Ø£Ø±Ø¯Ù†ÙŠ (JOD)";
    case "EUR":
      return "ÙŠÙˆØ±Ùˆ (EUR)";
    default:
      return "Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ (YER)";
  }
}

function defaultCityForCountry(country?: string): string {
  const c = (country || "").trim();
  if (/Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©|SA/i.test(c)) return "Ø§Ù„Ø±ÙŠØ§Ø¶";
  if (/Ø§Ù„Ø¥Ù…Ø§Ø±Ø§Øª|Ø§Ù„Ø¥Ù…Ø§Ø±Ø§Øª|AE/i.test(c)) return "Ø¯Ø¨ÙŠ";
  if (/Ø§Ù„ÙƒÙˆÙŠØª|KW/i.test(c)) return "Ù…Ø¯ÙŠÙ†Ø© Ø§Ù„ÙƒÙˆÙŠØª";
  if (/Ù‚Ø·Ø±|QA/i.test(c)) return "Ø§Ù„Ø¯ÙˆØ­Ø©";
  if (/Ø§Ù„Ø¨Ø­Ø±ÙŠÙ†|BH/i.test(c)) return "Ø§Ù„Ù…Ù†Ø§Ù…Ø©";
  if (/Ø¹Ù…Ø§Ù†|Ø³Ù„Ø·Ù†Ø©|OM/i.test(c)) return "Ù…Ø³Ù‚Ø·";
  if (/Ù…ØµØ±|EG/i.test(c)) return "Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©";
  if (/Ø§Ù„Ø£Ø±Ø¯Ù†|JO/i.test(c)) return "Ø¹ÙŽÙ…Ù‘Ø§Ù†";
  if (/Ø§Ù„ÙŠÙ…Ù†|YE/i.test(c)) return "ØµÙ†Ø¹Ø§Ø¡";
  return c || "Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ";
}

async function seedDefaultAccountsForTenant(
  tenantId: number | null,
  overrides?: Partial<{
    institutionName: string;
    currency: string;
    accountingPeriod: string;
    managerName: string;
  }>
) {
  if (!tenantId) return;
  if (_seededTenants.has(tenantId)) return;
  const db = await getDb();
  if (!db) return;
  try {
    const [tenantRecord] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    const institutionName =
      overrides?.institutionName || tenantRecord?.name || "Ø§Ù„Ù…Ø¤Ø³Ø³Ø©";
    const defaultAccounts = [
      {
        code: "1010",
        name: "Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ (Ø§Ù„Ø®Ø²ÙŠÙ†Ø©)",
        type: "asset" as const,
        category: "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©",
        description: "ØµÙ†Ø¯ÙˆÙ‚ Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ Ù„Ù„Ù…Ø¤Ø³Ø³Ø©",
      },
      {
        code: "1020",
        name: "Ø§Ù„Ø¨Ù†Ùƒ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ / Ø§Ù„Ø¥Ø³Ù„Ø§Ù…ÙŠ",
        type: "asset" as const,
        category: "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©",
        description: `Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¨Ù†ÙƒÙŠ Ø§Ù„Ø¬Ø§Ø±ÙŠ Ù„Ù…Ù†Ø´Ø£Ø© ${institutionName}`,
      },
      {
        code: "1030",
        name: "Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¹ÙÙ…Ù„Ø§Ø¡ ÙˆØ§Ù„Ù…Ø¯ÙŠÙ†ÙˆÙ†",
        type: "asset" as const,
        category: "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©",
        description: "Ù…Ø³ØªØ­Ù‚Ø§Øª Ø§Ù„Ù…Ø¤Ø³Ø³Ø© Ù„Ø¯Ù‰ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ù…Ù‚Ø§Ø¨Ù„ Ø§Ù„Ø®Ø¯Ù…Ø§Øª",
      },
      {
        code: "1060",
        name: "Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø© ÙˆØ§Ù„Ù…Ù†ØªØ¬Ø§Øª",
        type: "asset" as const,
        category: "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©",
        description: "Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø© ÙˆØ§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø© Ù„Ù„Ø¨ÙŠØ¹ Ø¨Ø§Ù„Ù…Ø®Ø²ÙˆÙ†",
      },
      {
        code: "2010",
        name: "Ø§Ù„Ø¯Ø§Ø¦Ù†ÙˆÙ† ÙˆØ§Ù„Ù…ÙˆØ±Ø¯ÙˆÙ†",
        type: "liability" as const,
        category: "Ø§Ù„Ø®ØµÙˆÙ… Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©",
        description: "Ø§Ù„ØªØ²Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø¤Ø³Ø³Ø© ØªØ¬Ø§Ù‡ Ù…Ø²ÙˆØ¯ÙŠ Ø§Ù„Ø®Ø¯Ù…Ø© ÙˆØ§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†",
      },
      {
        code: "3010",
        name: "Ø±Ø£Ø³ Ø§Ù„Ù…Ø§Ù„",
        type: "equity" as const,
        category: "Ø­Ù‚ÙˆÙ‚ Ø§Ù„Ù…Ù„ÙƒÙŠØ©",
        description: `Ø±Ø£Ø³ Ù…Ø§Ù„ Ù…Ù†Ø´Ø£Ø© ${institutionName}`,
      },
      {
        code: "4010",
        name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ ÙˆØ§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª",
        type: "revenue" as const,
        category: "Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©",
        description: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ØªØ®Ù„ÙŠØµ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª ÙˆØ§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© ÙˆØ§Ù„Ù…Ø§Ù„ÙŠØ©",
      },
      {
        code: "4020",
        name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ù…ØªÙ†ÙˆØ¹Ø©",
        type: "revenue" as const,
        category: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø£Ø®Ø±Ù‰",
        description: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ØªØ´ØºÙŠÙ„ÙŠØ© Ø£Ø®Ø±Ù‰",
      },
      {
        code: "5010",
        name: "Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ø±ÙˆØ§ØªØ¨ ÙˆØ§Ù„Ø£Ø¬ÙˆØ±",
        type: "expense" as const,
        category: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©",
        description: "Ø±ÙˆØ§ØªØ¨ ÙˆÙ…Ø³ØªØ­Ù‚Ø§Øª Ù…ÙˆØ¸ÙÙŠ Ø§Ù„Ù…Ø¤Ø³Ø³Ø©",
      },
      {
        code: "5020",
        name: "Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ø¥ÙŠØ¬Ø§Ø± ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª (ÙƒÙ‡Ø±Ø¨Ø§Ø¡ØŒ Ù…Ø§Ø¡ØŒ Ø¥Ù†ØªØ±Ù†Øª)",
        type: "expense" as const,
        category: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©",
        description: "Ø¥ÙŠØ¬Ø§Ø± Ø§Ù„Ù…Ù‚Ø± ÙˆÙÙˆØ§ØªÙŠØ± Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©",
      },
      {
        code: "5030",
        name: "Ù…ØµØ±ÙˆÙØ§Øª Ø­ÙƒÙˆÙ…ÙŠØ© ÙˆØ±Ø³ÙˆÙ… ØªØ®Ù„ÙŠØµ",
        type: "expense" as const,
        category: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©",
        description: "Ø§Ù„Ø±Ø³ÙˆÙ… Ø§Ù„Ø­ÙƒÙˆÙ…ÙŠØ© Ø§Ù„Ù…ØªØ¹Ù„Ù‚Ø© Ø¨Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª",
      },
      {
        code: "5040",
        name: "Ù…ØµØ±ÙˆÙØ§Øª Ù…ØªÙ†ÙˆØ¹Ø© ÙˆØ¹Ù…ÙˆÙ…ÙŠØ©",
        type: "expense" as const,
        category: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ©",
        description: "Ø¶ÙŠØ§ÙØ©ØŒ Ø£Ø¯ÙˆØ§Øª Ù…ÙƒØªØ¨ÙŠØ©ØŒ ÙˆÙ…ØµØ±ÙˆÙØ§Øª Ù†Ø«Ø±ÙŠØ©",
      },
      {
        code: "5050",
        name: "ØªÙƒÙ„ÙØ© Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø© Ø§Ù„Ù…Ø´ØªØ±Ø§Ø© (Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ©)",
        type: "expense" as const,
        category: "ØªÙƒÙ„ÙØ© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª",
        description: "ØªÙƒÙ„ÙØ© Ø´Ø±Ø§Ø¡ Ø§Ù„Ø¨Ø¶Ø§Ø¦Ø¹ ÙˆØ§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ù…Ø¨Ø§Ø¹",
      },
    ];
    for (const acc of defaultAccounts) {
      await db
        .insert(accounts)
        .values({ ...acc, tenantId })
        .onConflictDoNothing();
    }
    const existingSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenantId))
      .limit(1);
    if (existingSettings.length === 0) {
      await db.insert(settings).values({
        tenantId,
        institutionName,
        currency: overrides?.currency ?? "Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ (YER)",
        accountingPeriod: overrides?.accountingPeriod ?? "Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026",
        managerName: overrides?.managerName ?? "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¤Ø³Ø³Ø©",
        subscriptionStatus: "trial",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        notes: `Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ØªØ´ØºÙŠÙ„ÙŠØ© Ù„Ù…Ù†Ø´Ø£Ø© ${institutionName}`,
      });
    } else if (
      existingSettings[0].institutionName?.includes("Ã˜Â§") ||
      existingSettings[0].institutionName?.includes("\uFFFD")
    ) {
      await db
        .update(settings)
        .set({
          institutionName,
          currency: "Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ (YER)",
          accountingPeriod: "Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026",
          managerName: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¤Ø³Ø³Ø©",
          notes: `Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ØªØ´ØºÙŠÙ„ÙŠØ© Ù„Ù…Ù†Ø´Ø£Ø© ${institutionName}`,
        })
        .where(eq(settings.id, existingSettings[0].id));
    } else if (
      existingSettings[0].institutionName === "Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ© Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„" &&
      tenantRecord?.name &&
      tenantRecord.name !== "Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ© Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„" &&
      // Never clobber the meaningful schema default with an unnamed-tenant
      // placeholder ("Default Tenant" / blank). A generic tenant name is not
      // a customization â€” replacing the default with it destroys real data
      // (see migration 0029 restoring rows damaged by the unguarded version).
      tenantRecord.name !== "Default Tenant" &&
      tenantRecord.name.trim() !== ""
    ) {
      // Replace the legacy vendor-name default only; preserve tenant-customized fields.
      await db
        .update(settings)
        .set({ institutionName: tenantRecord.name })
        .where(eq(settings.id, existingSettings[0].id));
    }

    const defaultProducts = [
      {
        code: "ENG-DES-01",
        name: "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ù…Ø®Ø·Ø·Ø§Øª Ø§Ù„Ù…Ø¹Ù…Ø§Ø±ÙŠØ© ÙˆØ§Ù„Ø¥Ù†Ø´Ø§Ø¦ÙŠØ© 2D/3D ÙˆÙ†Ù…Ø°Ø¬Ø© (BIM)",
        category: "Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ù‡Ù†Ø¯Ø³ÙŠØ©",
        unit: "Ù…Ø´Ø±ÙˆØ¹",
        salePrice: "120000",
        purchasePrice: "45000",
        currentStock: 999,
      },
      {
        code: "ENG-SUR-01",
        name: "Ø§Ù„Ø±ÙØ¹ Ø§Ù„Ù…Ø³Ø§Ø­ÙŠ Ø§Ù„Ø±Ù‚Ù…ÙŠ ÙˆØªØ«Ø¨ÙŠØª Ø­Ø¯ÙˆØ¯ Ø§Ù„Ø£Ø±Ø§Ø¶ÙŠ Ø¨Ø­Ø¶ÙˆØ± Ø§Ù„Ù…Ø³Ø§Ø­",
        category: "Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ù‡Ù†Ø¯Ø³ÙŠØ©",
        unit: "Ù‚Ø·Ø¹Ø©",
        salePrice: "35000",
        purchasePrice: "12000",
        currentStock: 999,
      },
      {
        code: "ENG-VOL-01",
        name: "Ø­Ø³Ø§Ø¨ ÙƒÙ…ÙŠØ§Øª Ø§Ù„Ø­ÙØ± ÙˆØ§Ù„Ø±Ø¯Ù… ÙˆØ§Ù„Ø±ÙØ¹ Ø§Ù„Ø·Ø¨ÙˆØºØ±Ø§ÙÙŠ Ù„Ù„Ù…ÙˆØ§Ù‚Ø¹",
        category: "Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ù‡Ù†Ø¯Ø³ÙŠØ©",
        unit: "Ù…ÙˆÙ‚Ø¹",
        salePrice: "40000",
        purchasePrice: "15000",
        currentStock: 999,
      },
      {
        code: "ENG-BOQ-01",
        name: "Ø¥Ø¹Ø¯Ø§Ø¯ Ø¬Ø¯Ø§ÙˆÙ„ Ø§Ù„ÙƒÙ…ÙŠØ§Øª (BOQ) ÙˆÙ‚ÙˆØ§Ø¦Ù… Ø­ØµØ± Ø§Ù„Ù…ÙˆØ§Ø¯ ÙˆØ§Ù„ØªØ³Ø¹ÙŠØ± Ù„Ù„Ù…Ù‚Ø§ÙˆÙ„ÙŠÙ†",
        category: "Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ù‡Ù†Ø¯Ø³ÙŠØ©",
        unit: "Ø¬Ø¯ÙˆÙ„",
        salePrice: "50000",
        purchasePrice: "18000",
        currentStock: 999,
      },
      {
        code: "ENG-SUP-01",
        name: "Ø§Ù„Ø¥Ø´Ø±Ø§Ù Ø§Ù„Ù‡Ù†Ø¯Ø³ÙŠ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ ÙˆÙØ­Øµ Ø§Ù„ØµØ¨Ø§Øª ÙˆØªØ³Ù„ÙŠÙ… Ø§Ù„Ù…Ø±Ø§Ø­Ù„",
        category: "Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ù‡Ù†Ø¯Ø³ÙŠØ©",
        unit: "Ù…Ø±Ø­Ù„Ø©",
        salePrice: "60000",
        purchasePrice: "22000",
        currentStock: 999,
      },
      {
        code: "ENG-EST-01",
        name: "Ø¯Ø±Ø§Ø³Ø§Øª ØªÙ‚ÙŠÙŠÙ… ÙˆØªØ«Ù…ÙŠÙ† Ø§Ù„Ø¹Ù‚Ø§Ø±Ø§Øª ÙˆØ§Ù„Ø£Ø±Ø§Ø¶ÙŠ ÙˆØ§Ù„ØªØ·ÙˆÙŠØ± Ø§Ù„Ø¹Ù‚Ø§Ø±ÙŠ",
        category: "Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ù‡Ù†Ø¯Ø³ÙŠØ©",
        unit: "Ø¯Ø±Ø§Ø³Ø©",
        salePrice: "80000",
        purchasePrice: "30000",
        currentStock: 999,
      },
      {
        code: "SRV-TECH-01",
        name: "Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ø§Ù„ØªØ­ÙˆÙ„ Ø§Ù„Ø±Ù‚Ù…ÙŠ ÙˆØªØ¹Ù…ÙŠØ¯ Ø§Ù„Ø£Ù†Ø¸Ù…Ø©",
        category: "Ø§Ø³ØªØ´Ø§Ø±Ø§Øª ØªÙ‚Ù†ÙŠØ©",
        unit: "Ø®Ø¯Ù…Ø©",
        salePrice: "60000",
        purchasePrice: "25000",
        currentStock: 999,
      },
      {
        code: "SRV-ADM-01",
        name: "Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù‡ÙŠÙƒÙ„Ø© Ø§Ù„Ù…Ø¤Ø³Ø³ÙŠØ© ÙˆØªØ·ÙˆÙŠØ± Ø§Ù„Ø³ÙŠØ§Ø³Ø§Øª",
        category: "Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ø¥Ø¯Ø§Ø±ÙŠØ© ÙˆÙ…Ø¤Ø³Ø³ÙŠØ©",
        unit: "Ø®Ø¯Ù…Ø©",
        salePrice: "45000",
        purchasePrice: "18000",
        currentStock: 999,
      },
      {
        code: "SRV-PRINT-01",
        name: "Ø®Ø¯Ù…Ø© Ø§Ù„Ø·Ø¨Ø§Ø¹Ø© ÙˆØ§Ù„ØªØºÙ„ÙŠÙ ÙˆØ§Ù„ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ù…ÙƒØªØ¨ÙŠ",
        category: "Ø®Ø¯Ù…Ø§Øª Ø·Ù„Ø§Ø¨ÙŠØ© ÙˆÙ…ÙƒØªØ¨ÙŠØ©",
        unit: "Ù…Ø´Ø±ÙˆØ¹",
        salePrice: "1500",
        purchasePrice: "500",
        currentStock: 999,
      },
      {
        code: "SRV-DES-01",
        name: "ØªØµÙ…ÙŠÙ… Ø§Ù„Ù‡ÙˆÙŠØ§Øª Ø§Ù„Ø¨ØµØ±ÙŠØ© ÙˆØ§Ù„Ø´Ø¹Ø§Ø±Ø§Øª ÙˆØ§Ù„Ù…Ø·Ø¨ÙˆØ¹Ø§Øª",
        category: "Ø§Ù„ØªØµØ§Ù…ÙŠÙ… ÙˆØ§Ù„Ø·Ø¨Ø§Ø¹Ø©",
        unit: "ØªØµÙ…ÙŠÙ…",
        salePrice: "25000",
        purchasePrice: "8000",
        currentStock: 999,
      },
      {
        code: "SRV-RES-01",
        name: "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø£ÙˆØ±Ø§Ù‚ Ø§Ù„Ø£ÙƒØ§Ø¯ÙŠÙ…ÙŠØ© ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠ",
        category: "Ø§Ù„Ø¨Ø­ÙˆØ« ÙˆØ§Ù„Ø¯Ø±Ø§Ø³Ø§Øª",
        unit: "Ø¨Ø­Ø«",
        salePrice: "35000",
        purchasePrice: "15000",
        currentStock: 999,
      },
      {
        code: "SRV-MOB-01",
        name: "ØµÙŠØ§Ù†Ø© Ø£Ø¬Ù‡Ø²Ø© Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„ (Ø³ÙˆÙØªÙˆÙŠØ± ÙˆØ¹ØªØ§Ø¯)",
        category: "ØµÙŠØ§Ù†Ø© Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„",
        unit: "Ø¬Ù‡Ø§Ø²",
        salePrice: "8000",
        purchasePrice: "3000",
        currentStock: 999,
      },
      {
        code: "SRV-PC-01",
        name: "ØµÙŠØ§Ù†Ø© ÙˆØªØ­Ø¯ÙŠØ« ÙˆØªØ³Ø±ÙŠØ¹ Ø£Ø¬Ù‡Ø²Ø© Ø§Ù„Ø­Ø§Ø³ÙˆØ¨ ÙˆØ§Ù„Ù„Ø§Ø¨ ØªÙˆØ¨",
        category: "ØµÙŠØ§Ù†Ø© Ø§Ù„ÙƒÙ…Ø¨ÙŠÙˆØªØ±",
        unit: "Ø¬Ù‡Ø§Ø²",
        salePrice: "12000",
        purchasePrice: "4000",
        currentStock: 999,
      },
    ];
    for (const prd of defaultProducts) {
      await db
        .insert(products)
        .values({ ...prd, tenantId })
        .onConflictDoNothing();
    }

    _seededTenants.add(tenantId);
  } catch {
    // Seed will retry next time
  }
}

// â”€â”€â”€ Auto-Posting: Double-Entry GL entries for invoices â”€â”€â”€
// Creates balanced journal entries for sales/purchase invoices.
// Cash leg â†’ 1010, Receivables â†’ 1030, Payables â†’ 2010,
// Sales revenue â†’ 4010, Purchases cost â†’ 5050.
// â”€â”€â”€ Tenant configuration (POS / sales / posting) defaults & helpers â”€â”€â”€â”€â”€
const DEFAULT_POS_CONFIG = {
  template: "standard",
  columns: 4,
  showStock: true,
  showCategories: true,
  barcodeFocus: false,
  allowServices: true,
  quickAdd: true,
  showCustomer: true,
  autoPrint: false,
};
const DEFAULT_SALES_POLICY = {
  allowMixedGoodsServices: true,
  requireCustomer: false,
  allowCredit: true,
  defaultPayment: "cash",
  allowNegativeStock: false,
  defaultWarehouseId: null as number | null,
  roundTotal: false,
};
const DEFAULT_PAYMENT_METHODS = [
  { key: "cash", label: "Ù†Ù‚Ø¯ÙŠ", enabled: true, accountCode: "1010" },
  { key: "card", label: "Ø¨Ø·Ø§Ù‚Ø©", enabled: true, accountCode: "1021" },
  { key: "transfer", label: "ØªØ­ÙˆÙŠÙ„", enabled: true, accountCode: "1022" },
  { key: "online", label: "Ø£ÙˆÙ†Ù„Ø§ÙŠÙ†", enabled: true, accountCode: "1023" },
  { key: "credit", label: "Ø¢Ø¬Ù„", enabled: true, accountCode: "1030" },
];
const DEFAULT_POSTING_RULES = {
  goodsRevenueCode: "4011",
  serviceRevenueCode: "4010",
  cogsCode: "5050",
  inventoryCode: "1060",
  discountCode: "1090",
  cashCode: "1010",
  receivablesCode: "1030",
  vatCode: "2010",
  postInventory: true,
  postCogs: true,
  vatRate: 0,
};

type AnyConfig = Record<string, any>;
function parseConfig<T>(v: any, def: T): T {
  if (v == null) return def;
  if (typeof v === "object")
    return { ...(def as AnyConfig), ...(v as AnyConfig) } as T;
  try {
    const p = JSON.parse(v);
    return { ...(def as AnyConfig), ...(p as AnyConfig) } as T;
  } catch {
    return def;
  }
}

export async function getTenantConfig(db: any, tenantId: number | null) {
  if (!tenantId || !db) {
    return {
      posConfig: DEFAULT_POS_CONFIG,
      salesPolicy: DEFAULT_SALES_POLICY,
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      postingRules: DEFAULT_POSTING_RULES,
    };
  }
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, tenantId))
    .limit(1);
  const row = rows[0];
  return {
    posConfig: parseConfig(row?.posConfig, DEFAULT_POS_CONFIG),
    salesPolicy: parseConfig(row?.salesPolicy, DEFAULT_SALES_POLICY),
    paymentMethods: Array.isArray(row?.paymentMethods)
      ? row.paymentMethods
      : row?.paymentMethods
        ? parseConfig(row.paymentMethods, DEFAULT_PAYMENT_METHODS)
        : DEFAULT_PAYMENT_METHODS,
    postingRules: parseConfig(row?.postingRules, DEFAULT_POSTING_RULES),
  };
}

function parseSettingsRow(row: any) {
  if (!row) return row;
  let zatcaConfig: any;
  try {
    zatcaConfig = row.zatcaConfig ? JSON.parse(row.zatcaConfig) : {};
  } catch {
    zatcaConfig = {};
  }
  return {
    ...row,
    country: row.country || "Ø§Ù„ÙŠÙ…Ù†",
    zatcaConfig,
    posConfig: parseConfig(row.posConfig, DEFAULT_POS_CONFIG),
    salesPolicy: parseConfig(row.salesPolicy, DEFAULT_SALES_POLICY),
    paymentMethods: Array.isArray(row.paymentMethods)
      ? row.paymentMethods
      : row.paymentMethods
        ? parseConfig(row.paymentMethods, DEFAULT_PAYMENT_METHODS)
        : DEFAULT_PAYMENT_METHODS,
    postingRules: parseConfig(row.postingRules, DEFAULT_POSTING_RULES),
    communicationConfig: parseConfig(
      row.communicationConfig,
      DEFAULT_COMMUNICATION_SETTINGS
    ),
    externalAIConfig: safeExternalAIConfig(row.externalAIConfig),
  };
}
function stringifyConfig(v: any) {
  return typeof v === "string" ? v : JSON.stringify(v ?? null);
}

async function postInvoiceGlEntries(
  tx: any,
  opts: {
    kind: "sale" | "purchase";
    invoiceId: number;
    invoiceNumber: string;
    total: number;
    paidAmount: number;
    branchId?: number | null;
    userId?: number | null;
    tenantId: number;
    exchangeRate?: number;
    taxAmount?: number;
    discount?: number;
    paymentMethod?: string;
    items?: Array<{
      productId: number;
      type: "goods" | "service";
      quantity: number;
      unitPrice: string | number;
      discount?: string | number;
      cost?: string | number;
      revenueAccountId?: number | null;
    }>;
  }
): Promise<void> {
  // Default branch dimension: if no branch is specified, fall back to the
  // tenant's main branch so every posted entry is dimensioned by location.
  const defaultBranch = async () => {
    const rows = await tx
      .select()
      .from(branches)
      .where(eq(branches.tenantId, opts.tenantId))
      .orderBy(desc(branches.isMain))
      .limit(1);
    return rows[0]?.id ?? null;
  };
  const effectiveBranchId = opts.branchId ?? (await defaultBranch());

  const findAccount = async (code: string) => {
    const rows = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.code, code), eq(accounts.tenantId, opts.tenantId)))
      .limit(1);
    return rows[0];
  };

  // IFRS: Ù…Ù†Ø¹ Ø§Ù„ØªØ±Ø­ÙŠÙ„ ÙÙŠ ÙØªØ±Ø© Ù…ØºÙ„Ù‚Ø©
  await assertPeriodOpen(
    tx,
    opts.tenantId,
    new Date(),
    `ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`
  );

  const pending: Array<Record<string, any>> = [];
  const entry = (
    accountId: number,
    type: "debit" | "credit",
    amount: number,
    narration: string
  ) =>
    pending.push({
      tenantId: opts.tenantId,
      accountId,
      branchId: effectiveBranchId,
      amount: amount.toFixed(2),
      type,
      transactionDate: new Date(),
      narration,
      lifecycleStatus: "posted",
      referenceType: opts.kind === "sale" ? "sale" : "purchase",
      referenceId: opts.invoiceId,
      sourceModule: opts.kind === "sale" ? "sales" : "purchases",
      userId: opts.userId || null,
    });

  const cfg = await getTenantConfig(tx, opts.tenantId);
  // N+1 FIX (perf audit): the per-item loop below previously issued one
  // SELECT per line (resolveAccount â†’ findAccount/findAccountById). Invoices
  // routinely carry dozens of lines on the same 3â€“5 accounts, so results are
  // memoized per (code|id) within this posting call â€” N queries collapse to
  // â‰¤ distinct-accounts queries. Cross-invoice batching is intentionally out
  // of scope (one tx per invoice).
  const accountCache = new Map<string | number, any>();
  const findAccountById = async (id: number) => {
    if (accountCache.has(id)) return accountCache.get(id);
    const rows = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, opts.tenantId)))
      .limit(1);
    accountCache.set(id, rows[0]);
    return rows[0];
  };
  const resolveAccount = async (ref?: string | number | null) => {
    if (ref == null) return undefined;
    if (accountCache.has(ref)) return accountCache.get(ref);
    let resolved: any;
    if (typeof ref === "number") resolved = await findAccountById(ref);
    else {
      const byCode = await findAccount(ref);
      if (byCode) resolved = byCode;
      else {
        const asNum = Number(ref);
        if (!isNaN(asNum)) resolved = await findAccountById(asNum);
      }
    }
    accountCache.set(ref, resolved);
    return resolved;
  };

  const tax = opts.taxAmount ?? 0;
  const discount = opts.discount ?? 0;
  const exchangeRate = opts.exchangeRate ?? 1;
  const paid = Math.min(opts.paidAmount, opts.total);
  const unpaid = Math.max(0, opts.total - opts.paidAmount);
  const pm = opts.paymentMethod || cfg.salesPolicy.defaultPayment || "cash";
  const paymentAccountCode = () => {
    if (pm === "credit") return cfg.postingRules.receivablesCode;
    const pmDef = (cfg.paymentMethods || []).find(
      (m: any) => m.key === pm && m.enabled
    );
    return pmDef?.accountCode || cfg.postingRules.cashCode;
  };

  if (opts.kind === "sale") {
    const goodsRev = await findAccount(cfg.postingRules.goodsRevenueCode);
    if (!goodsRev)
      throw new Error(
        `Ø¯Ù„ÙŠÙ„ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ØºÙŠØ± Ù…Ù‡ÙŠØ£ â€” Ø±Ù…Ø² Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯: ${cfg.postingRules.goodsRevenueCode}`
      );

    // 1) Receipt side
    if (paid > 0) {
      const paidAcc = await findAccount(paymentAccountCode());
      if (paidAcc)
        await entry(
          paidAcc.id,
          "debit",
          paid * exchangeRate,
          `ØªØ­ØµÙŠÙ„ â€” ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber} (${pm})`
        );
    }
    if (unpaid > 0) {
      const recAcc = await findAccount(cfg.postingRules.receivablesCode);
      if (recAcc)
        await entry(
          recAcc.id,
          "debit",
          unpaid * exchangeRate,
          `Ø°Ù…Ù… Ø¹Ù…Ù„Ø§Ø¡ â€” ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`
        );
    }

    // 2) Revenue (detailed by item when available â†’ mixed goods + services)
    if (opts.items && opts.items.length) {
      const byAcc: Record<number, number> = {};
      for (const it of opts.items) {
        const accRef = it.revenueAccountId
          ? it.revenueAccountId
          : it.type === "service"
            ? cfg.postingRules.serviceRevenueCode
            : cfg.postingRules.goodsRevenueCode;
        const acc = await resolveAccount(accRef);
        if (!acc) continue;
        const lineNet =
          parseFloat(String(it.unitPrice)) * it.quantity -
          (parseFloat(String(it.discount)) || 0);
        byAcc[acc.id] = (byAcc[acc.id] || 0) + lineNet;
        if (
          it.type === "goods" &&
          cfg.postingRules.postCogs &&
          cfg.postingRules.postInventory
        ) {
          const cogs = (parseFloat(String(it.cost)) || 0) * it.quantity;
          const cogsAcc = await findAccount(cfg.postingRules.cogsCode);
          const invAcc = await findAccount(cfg.postingRules.inventoryCode);
          if (cogsAcc && invAcc) {
            await entry(
              cogsAcc.id,
              "debit",
              cogs,
              `ØªÙƒÙ„ÙØ© Ù…Ø¨ÙŠØ¹Ø§Øª â€” ${opts.invoiceNumber}`
            );
            await entry(
              invAcc.id,
              "credit",
              cogs,
              `ØªØ®ÙÙŠØ¶ Ù…Ø®Ø²ÙˆÙ† â€” ${opts.invoiceNumber}`
            );
          }
        }
      }
      for (const [accId, amt] of Object.entries(byAcc)) {
        if (amt === 0) continue;
        await entry(
          Number(accId),
          "credit",
          amt * exchangeRate,
          `Ø¥ÙŠØ±Ø§Ø¯ Ù…Ø¨ÙŠØ¹Ø§Øª â€” ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`
        );
      }
    } else {
      await entry(
        goodsRev.id,
        "credit",
        (opts.total - tax) * exchangeRate,
        `Ø¥ÙŠØ±Ø§Ø¯ Ù…Ø¨ÙŠØ¹Ø§Øª â€” ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`
      );
    }

    // 3) VAT
    if (tax > 0) {
      const vatAcc = await findAccount(cfg.postingRules.vatCode);
      if (vatAcc)
        await entry(
          vatAcc.id,
          "credit",
          tax * exchangeRate,
          `Ø¶Ø±ÙŠØ¨Ø© Ù…Ø¨ÙŠØ¹Ø§Øª â€” ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`
        );
    }
  } else {
    // purchase
    const costAcc = await findAccount(cfg.postingRules.cogsCode);
    if (!costAcc)
      throw new Error(
        `Ø¯Ù„ÙŠÙ„ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ØºÙŠØ± Ù…Ù‡ÙŠØ£ â€” Ø±Ù…Ø² Ø§Ù„ØªÙƒÙ„ÙØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯: ${cfg.postingRules.cogsCode}`
      );
    await entry(
      costAcc.id,
      "debit",
      (opts.total - tax) * exchangeRate,
      `ØªÙƒÙ„ÙØ© Ù…Ø´ØªØ±ÙŠØ§Øª â€” ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`
    );
    if (tax > 0) {
      const vatAcc = await findAccount(cfg.postingRules.vatCode);
      if (vatAcc)
        await entry(
          vatAcc.id,
          "debit",
          tax * exchangeRate,
          `Ø¶Ø±ÙŠØ¨Ø© Ù…Ø¯Ø®Ù„Ø§Øª â€” ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`
        );
    }
    if (paid > 0) {
      const cashAcc = await findAccount(paymentAccountCode());
      if (cashAcc)
        await entry(
          cashAcc.id,
          "credit",
          paid * exchangeRate,
          `Ø¯ÙØ¹ â€” ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª ${opts.invoiceNumber}`
        );
    }
    if (unpaid > 0) {
      const payablesAcc = await findAccount("2010");
      if (payablesAcc)
        await entry(
          payablesAcc.id,
          "credit",
          unpaid * exchangeRate,
          `Ø°Ù…Ù… Ù…ÙˆØ±Ø¯ÙŠÙ† â€” ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª ${opts.invoiceNumber}`
        );
    }
  }

  // â”€â”€â”€ Integration backbone: group all legs under one journal entry â”€â”€â”€â”€â”€
  if (pending.length > 0) {
    validateOrThrow(
      pending.map(p => ({
        type: p.type as "debit" | "credit",
        amount: p.amount,
      })),
      `ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`
    );
    const total = pending.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const [je] = await tx
      .insert(journalEntries)
      .values({
        tenantId: opts.tenantId,
        branchId: effectiveBranchId,
        sourceModule: opts.kind === "sale" ? "sales" : "purchases",
        sourceRefType: opts.kind === "sale" ? "sale" : "purchase",
        sourceRefId: opts.invoiceId,
        referenceNo: opts.invoiceNumber,
        status: "posted",
        totalAmount: total.toFixed(2),
        createdById: opts.userId || null,
        postedAt: new Date(),
      })
      .returning();
    for (const e of pending) {
      await tx.insert(transactions).values({ ...e, journalEntryId: je.id });
    }
  }
}

/**
 * Posts the double-entry GL movement for a recorded payment/installment.
 *
 * Closes the accounting loop that `postInvoiceGlEntries` intentionally leaves
 * open: when an invoice is raised against receivables (AR) / payables (AP),
 * the cash movement that actually settles it happens later via `payments.create`.
 * That later settlement must be reflected in the ledger, otherwise AR/AP
 * balances never get relieved and cash totals stay wrong. This mirrors the
 * invoice auto-posting structure (single journal entry + transaction legs).
 *
 *  - Sales payment   â†’ Dr <payment account> / Cr <AR>
 *  - Purchase paymentâ†’ Cr <payment account> / Dr <AP>
 */
async function postPaymentGlEntries(
  tx: any,
  opts: {
    kind: "sale" | "purchase";
    invoiceId: number;
    invoiceNumber: string;
    amount: number;
    paymentMethod: string;
    tenantId: number;
    paymentDate?: Date;
    userId?: number | null;
    exchangeRate?: number;
  }
): Promise<void> {
  const findAccount = async (code: string) => {
    const rows = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.code, code), eq(accounts.tenantId, opts.tenantId)))
      .limit(1);
    return rows[0];
  };

  const cfg = await getTenantConfig(tx, opts.tenantId);
  const pm = opts.paymentMethod || cfg.salesPolicy.defaultPayment || "cash";
  const pmDef = (cfg.paymentMethods || []).find(
    (m: any) => m.key === pm && m.enabled
  );
  const paymentAccountCode =
    pmDef?.accountCode ||
    (opts.kind === "sale"
      ? cfg.postingRules.cashCode
      : cfg.postingRules.cashCode);

  const cashAcc = await findAccount(paymentAccountCode);
  if (!cashAcc) return; // chart not seeded â€” skip auto-posting

  const refCode =
    opts.kind === "sale" ? cfg.postingRules.receivablesCode : "2010";
  const refAcc = await findAccount(refCode);
  if (!refAcc) return;

  const vault = await tx
    .select()
    .from(branches)
    .where(eq(branches.tenantId, opts.tenantId))
    .orderBy(desc(branches.isMain))
    .limit(1);
  const branchId = vault[0]?.id ?? null;

  const narration =
    opts.kind === "sale"
      ? `ØªØ­ØµÙŠÙ„ Ø¯ÙØ¹Ø© â€” ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber} (${pm})`
      : `Ø³Ø¯Ø§Ø¯ Ø¯ÙØ¹Ø© â€” ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª ${opts.invoiceNumber} (${pm})`;

  const pending = [
    opts.kind === "sale"
      ? {
          tenantId: opts.tenantId,
          accountId: cashAcc.id,
          branchId,
          amount: (opts.amount * (opts.exchangeRate ?? 1)).toFixed(2),
          type: "debit",
          transactionDate: opts.paymentDate || new Date(),
          narration,
          lifecycleStatus: "posted",
          referenceType: "sale",
          referenceId: opts.invoiceId,
          sourceModule: "sales",
          userId: opts.userId || null,
        }
      : {
          tenantId: opts.tenantId,
          accountId: refAcc.id,
          branchId,
          amount: (opts.amount * (opts.exchangeRate ?? 1)).toFixed(2),
          type: "debit",
          transactionDate: opts.paymentDate || new Date(),
          narration,
          lifecycleStatus: "posted",
          referenceType: "purchase",
          referenceId: opts.invoiceId,
          sourceModule: "purchases",
          userId: opts.userId || null,
        },
    opts.kind === "sale"
      ? {
          tenantId: opts.tenantId,
          accountId: refAcc.id,
          branchId,
          amount: (opts.amount * (opts.exchangeRate ?? 1)).toFixed(2),
          type: "credit",
          transactionDate: opts.paymentDate || new Date(),
          narration,
          lifecycleStatus: "posted",
          referenceType: "sale",
          referenceId: opts.invoiceId,
          sourceModule: "sales",
          userId: opts.userId || null,
        }
      : {
          tenantId: opts.tenantId,
          accountId: cashAcc.id,
          branchId,
          amount: (opts.amount * (opts.exchangeRate ?? 1)).toFixed(2),
          type: "credit",
          transactionDate: opts.paymentDate || new Date(),
          narration,
          lifecycleStatus: "posted",
          referenceType: "purchase",
          referenceId: opts.invoiceId,
          sourceModule: "purchases",
          userId: opts.userId || null,
        },
  ];

  validateOrThrow(
    pending.map(p => ({
      type: p.type as "debit" | "credit",
      amount: p.amount,
    })),
    `Ø¯ÙØ¹Ø© ÙØ§ØªÙˆØ±Ø© ${opts.invoiceNumber}`
  );
  const total = pending.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const [je] = await tx
    .insert(journalEntries)
    .values({
      tenantId: opts.tenantId,
      branchId,
      sourceModule: opts.kind === "sale" ? "sales" : "purchases",
      sourceRefType: opts.kind === "sale" ? "sale" : "purchase",
      sourceRefId: opts.invoiceId,
      referenceNo: opts.invoiceNumber,
      status: "posted",
      totalAmount: total.toFixed(2),
      createdById: opts.userId || null,
      postedAt: new Date(),
    })
    .returning();
  for (const e of pending) {
    await tx.insert(transactions).values({ ...e, journalEntryId: je.id });
  }
}

import { statusRouter } from './routers/workflow/status';

export const appRouter = router({
  status: statusRouter,
  system: systemRouter,
  billing: billingRouter,
  erp: erpRouter,
  modules: modulesRouter,
  aliasAi: aliasAiRouter,
  backup: backupRouter,
  pharmacy: pharmacyRouter,
  quotations: quotationRouter,
  vouchers: vouchersRouter,
  healthcare: healthcareRouter,
  security: securityRouter,
  documentTemplate: documentTemplateRouter,
  communication: communicationRouter,
  debtReports: debtReportsRouter,
  invoiceEnhancements: invoiceEnhancementsRouter,
  procurementReports: procurementReportsRouter,
  salesReports: salesReportsRouter,
  purchasesReports: purchasesReportsRouter,
  distributionReports: distributionReportsRouter,
  customerServiceReports: customerServiceReportsRouter,
  inventory: inventoryRouter,
  procurement: procurementRouter,
  purchaseOrders: purchaseOrdersRouter,
  goodsReceipts: goodsReceiptsRouter,
  projects: projectsRouter,
  pos: posRouter,
  posIntelligence: posIntelligenceRouter,
  smart: smartRouter,
  audit: auditRouter,
  workflow: workflowRouter,
  partnerAccounting: partnerAccountingRouter,
  managerialAccounting: managerialAccountingRouter,
  advancedCostAccounting: advancedCostAccountingRouter,
  productionAccounting: productionAccountingRouter,
  eliasPro: eliasProRouter,
  auth: router({
    // SECURITY: strip credential material before it ever reaches the client.
    // `passwordHash` and session-tracking columns must never be serialized
    // into tRPC responses (they were previously leaked via auth.me).
    me: publicProcedure.query(opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      const { passwordHash, currentSessionId, ...safeUser } = user;
      void passwordHash;
      void currentSessionId;
      return safeUser as typeof user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Revoke current session immediately
    revokeSession: tenantProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(users)
        .set({
          passwordChangedAt: new Date(),
          currentSessionId: null,
          sessionCount: 0,
        })
        .where(eq(users.id, ctx.user.id));

      // Clear the session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

      return {
        success: true,
        message: "ØªÙ… Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­",
      };
    }),

    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => authService.requestPasswordReset(input)),
    resetPassword: publicProcedure
      .input(
        z
          .object({
            token: z.string().min(32).max(128),
            password: z.string().min(8).max(200),
            confirmPassword: z.string().min(8).max(200),
          })
          .refine(data => data.password === data.confirmPassword, {
            message: "ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚Ø©",
            path: ["confirmPassword"],
          })
      )
      .mutation(async ({ input }) => authService.resetPassword(input)),

    // Verify a user's email address with the one-time token from the link.
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string().min(32).max(128) }))
      .mutation(async ({ input }) => authService.verifyEmail(input)),

    // Resend the verification link to a user's inbox (anti-enumeration safe).
    resendVerificationEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) =>
        authService.resendVerificationEmail(input)
      ),

    // Self-contained owner login (no external OAuth provider required).
    // Issues a signed session cookie for the configured owner openId.
    ownerLogin: publicProcedure
      .input(z.object({ password: z.string().min(1).max(256) }))
      .mutation(async ({ ctx, input }) => {
        const expected = ENV.ownerPassword;
        if (!expected) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„ Ø§Ù„Ù…Ø§Ù„Ùƒ ØºÙŠØ± Ù…ÙÙ‡ÙŠØ£",
          });
        }
        const a = Buffer.from(input.password);
        const b = Buffer.from(expected);
        const valid = a.length === b.length && timingSafeEqual(a, b);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± ØµØ­ÙŠØ­Ø©",
          });
        }

        await upsertUser({
          openId: ENV.ownerOpenId,
          name: "Owner",
          loginMethod: "owner",
          lastSignedIn: new Date(),
        });

        const token = await sdk.createSessionToken(ENV.ownerOpenId, {
          name: "Owner",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_MONTH_MS,
        });

        return { success: true } as const;
      }),
    updateProfile: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email().optional().or(z.literal("")),
          themePreference: z.string(),
          emailNotifications: z.boolean(),
          whatsappNotifications: z.boolean(),
          compactMode: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db
          .update(users)
          .set({
            name: input.name,
            email: input.email ? input.email : null,
            themePreference: input.themePreference,
            emailNotifications: input.emailNotifications,
            whatsappNotifications: input.whatsappNotifications,
            compactMode: input.compactMode,
          })
          .where(eq(users.id, ctx.user.id));

        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          userName: input.name,
          action: "ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ",
          details: `ØªÙ… ØªØ­Ø¯ÙŠØ« ØªÙØ¶ÙŠÙ„Ø§Øª Ø§Ù„Ø¹Ø±Ø¶ ÙˆØ§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ Ø¨ÙˆØ§Ø³Ø·Ø© ${input.name}`,
        });

        return { success: true };
      }),

    getActivityLogs: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const tid = requireTenantId(ctx);
      const logs = await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.tenantId, tid))
        .orderBy(desc(activityLogs.createdAt))
        .limit(25);
      return logs;
    }),

    // â”€â”€ Local subscriber login (username + password) â”€â”€
    // Returns ACCOUNT_NOT_FOUND when the username is unknown (UI offers signup),
    // UNAUTHORIZED on wrong password, FORBIDDEN when locked (5 fails / 15 min).
    // Every attempt (device + geo) is persisted to login_attempts.
    login: publicProcedure
      .input(
        z.object({
          username: z.string().min(1).max(120),
          password: z.string().min(1).max(200),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…ØªØ§Ø­Ø©",
          });
        await applyAuthSchema(db);

        const ip = getClientIp(ctx.req);
        const geo = await geolocate(ip);
        const ua = ctx.req.headers["user-agent"];
        const device = parseDevice(ua);

        const recordAttempt = async (
          success: boolean,
          extra: { userId?: number | null; tenantId?: number | null }
        ) => {
          try {
            await db.insert(loginAttempts).values({
              username: input.username.trim(),
              success,
              ip: ip || null,
              userAgent: ua || null,
              device,
              country: geo.country,
              city: geo.city,
              lat: geo.lat != null ? String(geo.lat) : null,
              lng: geo.lng != null ? String(geo.lng) : null,
              userId: extra.userId ?? null,
              tenantId: extra.tenantId ?? null,
            });
          } catch (e) {
            console.warn("[login] attempt log failed", (e as any)?.message);
          }
        };

        const uname = input.username.trim();
        const user = (
          await db
            .select()
            .from(users)
            .where(eq(users.username, uname))
            .limit(1)
        )[0];

        if (!user) {
          await recordAttempt(false, {});
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ACCOUNT_NOT_FOUND",
          });
        }

        const since = new Date(Date.now() - 15 * 60 * 1000);
        const recent = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(loginAttempts)
          .where(
            and(
              eq(loginAttempts.username, uname),
              eq(loginAttempts.success, false),
              gte(loginAttempts.createdAt, since)
            )
          );
        const fails = recent[0]?.count ?? 0;
        if (fails >= 5) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `LOCKED:${Math.max(
              1,
              Math.ceil(
                (15 * 60 * 1000 -
                  (Date.now() -
                    new Date(
                      (
                        await db
                          .select({ c: loginAttempts.createdAt })
                          .from(loginAttempts)
                          .where(
                            and(
                              eq(loginAttempts.username, uname),
                              eq(loginAttempts.success, false),
                              gte(loginAttempts.createdAt, since)
                            )
                          )
                          .orderBy(loginAttempts.createdAt)
                          .limit(1)
                      )[0]?.c || new Date()
                    ).getTime())) /
                  60000
              )
            )}`,
          });
        }

        const ok = await verifyPassword(input.password, user.passwordHash);
        if (!ok) {
          await recordAttempt(false, {
            userId: user.id,
            tenantId: user.tenantId,
          });
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± ØµØ­ÙŠØ­Ø©",
          });
        }

        // OWASP A07: Ø¥Ø°Ø§ ÙƒØ§Ù† 2FA Ù…ÙØ¹Ù„ØŒ Ù„Ø§ Ù†Ù†Ø´Ø¦ Ø¬Ù„Ø³Ø© Ø­ØªÙ‰ Ø§Ù„ØªØ­Ù‚Ù‚ Ø§Ù„Ø«Ø§Ù†ÙŠ
        if ((user as any).mfaEnabled && (user as any).mfaSecret) {
          return { mfaRequired: true as const, userId: user.id };
        }

        await recordAttempt(true, {
          userId: user.id,
          tenantId: user.tenantId,
        });

        const token = await sdk.createSessionToken(user.openId, {
          name: user.name || uname,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_MONTH_MS,
        });

        return {
          ok: true as const,
          user: {
            id: user.id,
            name: user.name,
            tenantId: user.tenantId,
            role: user.role,
          },
        };
      }),

    verifyMfa: publicProcedure
      .input(
        z.object({
          username: z.string().min(1),
          token: z.string().min(6).max(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…ØªØ§Ø­Ø©",
          });
        const uname = input.username.trim();
        const user = (
          await db
            .select()
            .from(users)
            .where(eq(users.username, uname))
            .limit(1)
        )[0];
        if (!user || !(user as any).mfaSecret)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯",
          });
        const ok = verifyToken((user as any).mfaSecret, input.token);
        if (!ok)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Ø±Ù…Ø² Ø§Ù„ØªØ­Ù‚Ù‚ ØºÙŠØ± ØµØ­ÙŠØ­",
          });
        const ip = getClientIp(ctx.req);
        const geo = await geolocate(ip);
        const ua = ctx.req.headers["user-agent"];
        const device = parseDevice(ua);
        try {
          await db.insert(loginAttempts).values({
            username: uname,
            success: true,
            ip: ip || null,
            userAgent: ua || null,
            device,
            country: geo.country,
            city: geo.city,
            lat: geo.lat != null ? String(geo.lat) : null,
            lng: geo.lng != null ? String(geo.lng) : null,
            userId: user.id,
            tenantId: user.tenantId,
          });
        } catch {
          // ØªØ³Ø¬ÙŠÙ„ Ù…Ø­Ø§ÙˆÙ„Ø© Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ø®ØªÙŠØ§Ø±ÙŠ â€” ÙØ´Ù„Ù‡ Ù„Ø§ ÙŠÙ…Ù†Ø¹ Ø§Ù„Ø¯Ø®ÙˆÙ„
        }
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || uname,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_MONTH_MS,
        });
        return {
          ok: true as const,
          user: {
            id: user.id,
            name: user.name,
            tenantId: user.tenantId,
            role: user.role,
          },
        };
      }),

    setupMfa: tenantProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db || !ctx.user)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "ØºÙŠØ± Ù…ØµØ±Ø­" });
      const secret = generateSecret();
      const url = otpauthUrl(
        secret,
        ctx.user.username || ctx.user.name || "user"
      );
      // Ø§Ø­ÙØ¸ Ù…Ø¤Ù‚ØªØ§Ù‹ â€” Ù„Ù† ÙŠÙÙØ¹Ù„ Ø­ØªÙ‰ ÙŠØªØ­Ù‚Ù‚ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ø±Ù…Ø²
      await db
        .update(users)
        .set({ mfaSecret: secret } as any)
        .where(eq(users.id, ctx.user.id));
      return { secret, otpauthUrl: url };
    }),

    verifySetupMfa: tenantProcedure
      .input(z.object({ token: z.string().min(6).max(6) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.user)
          throw new TRPCError({ code: "UNAUTHORIZED", message: "ØºÙŠØ± Ù…ØµØ±Ø­" });
        const row = (
          await db
            .select()
            .from(users)
            .where(eq(users.id, ctx.user.id))
            .limit(1)
        )[0];
        const secret = (row as any)?.mfaSecret;
        if (!secret)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ù„Ù… ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø³Ø±",
          });
        const ok = verifyToken(secret, input.token);
        if (!ok)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Ø±Ù…Ø² ØºÙŠØ± ØµØ­ÙŠØ­",
          });
        await db
          .update(users)
          .set({ mfaEnabled: true } as any)
          .where(eq(users.id, ctx.user.id));
        return { ok: true as const };
      }),

    disableMfa: tenantProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db || !ctx.user)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "ØºÙŠØ± Ù…ØµØ±Ø­" });
      await db
        .update(users)
        .set({ mfaEnabled: false, mfaSecret: null } as any)
        .where(eq(users.id, ctx.user.id));
      return { ok: true as const };
    }),

    // â”€â”€ Self-serve signup: creates a new organisation + admin user â”€â”€
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(2).max(120),
          username: z
            .string()
            .min(3)
            .max(120)
            .regex(
              /^[a-zA-Z0-9_.-]+$/,
              "Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…: Ø­Ø±ÙˆÙ ÙˆØ£Ø±Ù‚Ø§Ù… Ùˆ . _ - ÙÙ‚Ø·"
            ),
          password: z.string().min(8).max(200),
          country: z.string().max(100).optional(),
          currency: z.string().max(50).optional(),
          email: z.string().email().optional().or(z.literal("")),
          acceptTerms: z.literal(true),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…ØªØ§Ø­Ø©",
          });
        await applyAuthSchema(db);

        const uname = input.username.trim();
        const clash = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, uname))
          .limit(1);
        if (clash.length)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ù…ÙØ³ØªØ®Ø¯Ù… Ù…Ø³Ø¨Ù‚Ø§Ù‹",
          });

        const passwordHash = await hashPassword(input.password);
        const code = `ORG-${Date.now().toString(36).toUpperCase()}`;
        const tid = await provisionGenericTenant(db, {
          name: input.name.trim(),
          code,
          country: input.country,
          currency: input.currency,
        });

        const [userRow] = await db
          .insert(users)
          .values({
            openId: `local:${uname}`,
            tenantId: tid,
            name: input.name.trim(),
            email: input.email ? input.email : null,
            loginMethod: "local",
            username: uname,
            passwordHash,
            role: "admin",
            lastSignedIn: new Date(),
          })
          .returning();

        await db
          .update(tenants)
          .set({ ownerUserId: userRow.id })
          .where(eq(tenants.id, tid));

        // Trial subscription provisioning (same as authService.registerUser).
        const policyRows = await db
          .select({ trialDays: subscriptionPolicies.trialDays })
          .from(subscriptionPolicies)
          .where(eq(subscriptionPolicies.code, "default"))
          .limit(1);
        const trialDays = policyRows[0]?.trialDays ?? 14;
        const trialPlan = await db
          .select({ id: subscriptionPlans.id })
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.code, "starter"))
          .limit(1);
        const trialStart = new Date();
        const trialEnd = new Date(Date.now() + trialDays * 86_400_000);
        const existingSub = await db
          .select({ id: tenantSubscriptions.id })
          .from(tenantSubscriptions)
          .where(eq(tenantSubscriptions.tenantId, tid))
          .limit(1);
        if (existingSub.length === 0) {
          await db.insert(tenantSubscriptions).values({
            tenantId: tid,
            planId: trialPlan[0]?.id ?? 1,
            status: "trial",
            billingCycle: "monthly",
            currentPeriodStart: trialStart,
            currentPeriodEnd: trialEnd,
            paymentProvider: "trial",
          });
        }
        await db
          .update(settings)
          .set({
            subscriptionStatus: "trial",
            trialEndsAt: trialEnd,
          })
          .where(eq(settings.tenantId, tid));

        const token = await sdk.createSessionToken(userRow.openId, {
          name: input.name.trim(),
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_MONTH_MS,
        });

        return { ok: true as const, tenantId: tid, userId: userRow.id };
      }),

    // Recent login attempts for the signed-in user (security / map view).
    getLoginAttempts: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [] as LoginAttempt[];
      const uid = ctx.user?.id;
      const uname = ctx.user?.username;
      if (!uid && !uname) return [] as LoginAttempt[];
      const rows = await db
        .select()
        .from(loginAttempts)
        .where(
          or(
            eq(loginAttempts.userId, uid ?? -1),
            eq(loginAttempts.username, uname ?? "")
          )
        )
        .orderBy(desc(loginAttempts.createdAt))
        .limit(50);
      return rows as LoginAttempt[];
    }),

    onboard: protectedProcedure
      .input(
        z.object({
          institutionName: z.string().min(1),
          currency: z.string().optional(),
          country: z.string().optional(),
          managerName: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check if user already has a tenant
        if (ctx.user.tenantId) {
          throw new Error("Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ù…Ø³Ø¬Ù„ Ø¨Ø§Ù„ÙØ¹Ù„ ÙÙŠ Ù…Ø¤Ø³Ø³Ø©");
        }

        // Create new tenant
        const [tenant] = await db
          .insert(tenants)
          .values({
            name: input.institutionName,
            code: `T-${Date.now()}`,
            ownerUserId: ctx.user.id,
            currency: input.currency || "YER",
            country: input.country || "Ø§Ù„ÙŠÙ…Ù†",
            subscriptionPlan: "standard",
          })
          .returning();

        // Create default branch
        const [branch] = await db
          .insert(branches)
          .values({
            tenantId: tenant.id,
            name: "Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ",
            code: "HQ-01",
            city: defaultCityForCountry(input.country),
            isMain: true,
          })
          .returning();

        // Update user with tenantId and admin role
        await db
          .update(users)
          .set({ tenantId: tenant.id, role: "admin" })
          .where(eq(users.id, ctx.user.id));

        // Seed default accounts for the new tenant (use the tenant's own identity,
        // not the platform owner's, so settings/invoices/POS carry the right name)
        await seedDefaultAccountsForTenant(tenant.id, {
          institutionName: input.institutionName,
          managerName: input.managerName,
          currency: currencyDisplayName(input.currency),
        });

        return { tenantId: tenant.id, branchId: branch.id };
      }),

    // Rotate ES256 session-signing keys (platform owner only). The previous
    // key stays active for verification so in-flight sessions survive.
    rotateSessionKeys: ownerProcedure.mutation(() => {
      const rotated = rotateKeys();
      return {
        kid: rotated.kid,
        jwks: getJwks(),
        rotatedAt: new Date().toISOString(),
      } as const;
    }),
  }),

  // Warehouses management
  warehouses: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const tid = requireTenantId(ctx);
      return await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.tenantId, tid))
        .orderBy(asc(warehouses.code));
    }),
    create: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = requireTenantId(ctx);
        const [row] = await db
          .insert(warehouses)
          .values({ ...input, tenantId: tid })
          .returning();
        return { success: true, warehouse: row };
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          location: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = requireTenantId(ctx);
        const { id, ...data } = input;
        await db
          .update(warehouses)
          .set(data)
          .where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tid)));
        return { success: true };
      }),
    remove: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = requireTenantId(ctx);
        await db
          .delete(warehouses)
          .where(
            and(eq(warehouses.id, input.id), eq(warehouses.tenantId, tid))
          );
        return { success: true };
      }),
  }),

  // Work sites (Ù…ÙˆØ§Ù‚Ø¹ Ø§Ù„Ø¹Ù…Ù„)
  workSites: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const tid = requireTenantId(ctx);
      return db
        .select()
        .from(workSites)
        .where(eq(workSites.tenantId, tid))
        .orderBy(asc(workSites.code));
    }),
    create: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          address: z.string().optional(),
          lat: z.string().optional(),
          lng: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = requireTenantId(ctx);
        const [row] = await db
          .insert(workSites)
          .values({ ...input, tenantId: tid })
          .returning();
        return { success: true, workSite: row };
      }),
    remove: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = requireTenantId(ctx);
        await db
          .delete(workSites)
          .where(and(eq(workSites.id, input.id), eq(workSites.tenantId, tid)));
        return { success: true };
      }),
  }),

  // Devices (Ø§Ù„Ø£Ø¬Ù‡Ø²Ø©: POS, scanner, scale, other)
  devices: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const tid = requireTenantId(ctx);
      return db
        .select()
        .from(devices)
        .where(eq(devices.tenantId, tid))
        .orderBy(asc(devices.code));
    }),
    create: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          type: z.string().default("pos"),
          workSiteId: z.number().optional(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = requireTenantId(ctx);
        const [row] = await db
          .insert(devices)
          .values({ ...input, tenantId: tid })
          .returning();
        return { success: true, device: row };
      }),
    remove: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = requireTenantId(ctx);
        await db
          .delete(devices)
          .where(and(eq(devices.id, input.id), eq(devices.tenantId, tid)));
        return { success: true };
      }),
  }),

  // Accounting & Settings Router
  accounting: router({
    // Get settings & subscription status
    getSettings: tenantProcedure.query(async ({ ctx }) => {
      const fallback = {
        institutionName: "Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†ÙŠØ© Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø£Ø¹Ù…Ø§Ù„",
        currency: "Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ (YER)",
        country: "Ø§Ù„ÙŠÙ…Ù†",
        accountingPeriod: "Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026",
        managerName: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¤Ø³Ø³Ø©",
        subscriptionStatus: "trial",
        posConfig: DEFAULT_POS_CONFIG,
        salesPolicy: DEFAULT_SALES_POLICY,
        paymentMethods: DEFAULT_PAYMENT_METHODS,
        postingRules: DEFAULT_POSTING_RULES,
        zatcaConfig: {},
        communicationConfig: DEFAULT_COMMUNICATION_SETTINGS,
        externalAIConfig: {
          enabled: false,
          baseUrl: "",
          model: "",
          hasApiKey: false,
        },
      };
      if (!ctx.tenantId) return fallback;
      await seedDefaultAccountsForTenant(ctx.tenantId);
      const db = await getDb();
      if (!db) return { ...fallback, subscriptionStatus: "active" };
      const res = await db
        .select()
        .from(settings)
        .where(eq(settings.tenantId, ctx.tenantId))
        .limit(1);
      if (!res[0]) return { ...fallback, subscriptionStatus: "active" };
      return parseSettingsRow(res[0]);
    }),

    // Ø³ÙŠØ§Ø³Ø© Ø§Ø´ØªØ±Ø§Ùƒ Ù…Ø±Ù†Ø© â€” Ù„Ø§ ØªÙØºÙ„Ù‚ Ø§Ù„Ù†Ø¸Ø§Ù… Ø£Ø¨Ø¯Ø§Ù‹:
    // trial â†’ active â†’ grace (Ù…Ù‡Ù„Ø© ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯Ø©) â†’ suspended ÙÙ‚Ø· Ø¹Ù†Ø¯ Ø·Ù„Ø¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…
    updateSubscription: tenantProcedure
      .input(
        z.object({
          status: z.enum(["trial", "active", "grace", "suspended"]),
          // ÙˆØ³ÙŠÙ„Ø© Ø¯ÙØ¹ Ù…Ø­Ù„ÙŠØ© Ø§Ø®ØªÙŠØ§Ø±ÙŠØ©
          paymentMethod: z.string().optional(),
          // ÙƒÙˆØ¯ ØªØ±ÙˆÙŠØ¬ÙŠ / Ø®ØµÙ… Ø§Ø®ØªÙŠØ§Ø±ÙŠ
          promoCode: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const existing = await db
          .select()
          .from(settings)
          .where(eq(settings.tenantId, ctx.tenantId))
          .limit(1);

        // Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ù…Ø±ÙˆÙ†Ø©: Ø£ÙŠ Ø­Ø§Ù„Ø© ÙŠÙ…Ø± Ø¨Ù‡Ø§ Ø§Ù„Ù†Ø¸Ø§Ù… Ù„Ø§ ØªØ¤Ø¯ÙŠ Ø¥Ù„Ù‰ Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø¹Ù…Ù„.
        // "suspended" Ù„Ø§ ØªÙØ³ØªØ®Ø¯Ù… Ø¥Ù„Ø§ Ø¥Ø°Ø§ Ø·Ù„Ø¨Ù‡Ø§ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØµØ±Ø§Ø­Ø©Ù‹ Ø¹Ø¨Ø± ÙˆØ§Ø¬Ù‡Ø©
        // Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© â€” Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ù„Ø§ ÙŠÙˆÙ‚Ù Ø§Ù„Ù†Ø¸Ø§Ù… Ø£Ø¨Ø¯Ø§Ù‹.
        const newStatus = input.status;

        if (existing.length > 0) {
          await db
            .update(settings)
            .set({
              subscriptionStatus: newStatus as any,
              ...(input.paymentMethod
                ? {
                    notes: `ÙˆØ³ÙŠÙ„Ø© Ø§Ù„Ø¯ÙØ¹: ${input.paymentMethod}${input.promoCode ? ` â€” ÙƒÙˆØ¯: ${input.promoCode}` : ""}`,
                  }
                : {}),
            })
            .where(eq(settings.id, existing[0].id));
        }

        // Ø³Ø¬Ù„ Ù†Ø´Ø§Ø·
        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          userName: ctx.user.name,
          action:
            newStatus === "grace"
              ? "Ø§Ù†ØªÙ‚Ø§Ù„ ØªÙ„Ù‚Ø§Ø¦ÙŠ Ù„ÙˆØ¶Ø¹ Ø§Ù„Ù…Ù‡Ù„Ø© Ø§Ù„Ù…Ø±Ù†Ø©"
              : `ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ø¥Ù„Ù‰: ${newStatus}`,
          details: input.paymentMethod
            ? `ØªÙ… Ø§Ù„ØªØ¬Ø¯ÙŠØ¯ Ø¹Ø¨Ø±: ${input.paymentMethod}${input.promoCode ? ` (ÙƒÙˆØ¯: ${input.promoCode})` : ""}`
            : "ØªÙ… ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ø¯ÙˆÙ† Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù†Ø¸Ø§Ù…",
        });

        return { success: true, status: newStatus };
      }),

    // Update settings (Permanent save)
    updateSettings: tenantProcedure
      .input(
        z.object({
          institutionName: z.string().min(1),
          currency: z.string().min(1),
          country: z.string().min(1).default("Ø§Ù„ÙŠÙ…Ù†"),
          accountingPeriod: z.string().min(1),
          managerName: z.string().optional(),
          taxNumber: z.string().optional(),
          notes: z.string().optional(),
          posConfig: z.any().optional(),
          salesPolicy: z.any().optional(),
          paymentMethods: z.any().optional(),
          postingRules: z.any().optional(),
          zatcaConfig: z.any().optional(),
          communicationConfig: z.any().optional(),
          externalAIConfig: z
            .object({
              enabled: z.boolean(),
              baseUrl: z.string().max(500),
              model: z.string().max(200),
              apiKey: z.string().max(4000).optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const existing = await db
          .select()
          .from(settings)
          .where(eq(settings.tenantId, ctx.tenantId))
          .limit(1);
        const payload: any = { ...input };
        if (input.posConfig !== undefined)
          payload.posConfig = stringifyConfig(input.posConfig);
        if (input.salesPolicy !== undefined)
          payload.salesPolicy = stringifyConfig(input.salesPolicy);
        if (input.paymentMethods !== undefined)
          payload.paymentMethods = stringifyConfig(input.paymentMethods);
        if (input.postingRules !== undefined)
          payload.postingRules = stringifyConfig(input.postingRules);
        if (input.zatcaConfig !== undefined)
          payload.zatcaConfig = stringifyConfig(input.zatcaConfig);
        if (input.communicationConfig !== undefined)
          payload.communicationConfig = stringifyConfig(
            input.communicationConfig
          );
        if (input.externalAIConfig !== undefined) {
          const prior = existing[0]
            ? decryptExternalAIConfig(existing[0].externalAIConfig)
            : null;
          const apiKey =
            input.externalAIConfig.apiKey?.trim() || prior?.apiKey || "";
          if (
            input.externalAIConfig.enabled &&
            (!input.externalAIConfig.baseUrl ||
              !input.externalAIConfig.model ||
              !apiKey)
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Ø£Ø¯Ø®Ù„ Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ ÙˆØ§Ù„Ù†Ù…ÙˆØ°Ø¬ ÙˆÙ…ÙØªØ§Ø­ API Ù„ØªÙØ¹ÙŠÙ„ Ø§Ù„ØªÙƒØ§Ù…Ù„",
            });
          }
          payload.externalAIConfig = encryptExternalAIConfig({
            enabled: input.externalAIConfig.enabled,
            baseUrl: input.externalAIConfig.baseUrl.trim(),
            model: input.externalAIConfig.model.trim(),
            apiKey,
          });
        }
        if (existing.length > 0) {
          await db
            .update(settings)
            .set(payload)
            .where(eq(settings.id, existing[0].id));
        } else {
          await db
            .insert(settings)
            .values({ ...payload, tenantId: ctx.tenantId });
        }
        return { success: true };
      }),

    // Get Chart of Accounts
    getAccounts: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      await seedDefaultAccountsForTenant(ctx.tenantId);
      const db = await getDb();
      if (!db) return [];
      return await db
        .select()
        .from(accounts)
        .where(eq(accounts.tenantId, ctx.tenantId!))
        .orderBy(asc(accounts.code));
    }),

    // Add custom account
    addAccount: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
          category: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.insert(accounts).values({
          ...input,
          tenantId: ctx.tenantId,
          isCustom: true,
        });
        return { success: true };
      }),

    // Update account (Name, Code, Type, Status)
    updateAccount: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1),
          code: z.string().min(1),
          type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
          isActive: z.boolean(),
          parentAccountId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db
          .update(accounts)
          .set({
            name: input.name,
            code: input.code,
            type: input.type,
            isActive: input.isActive,
            ...(input.parentAccountId !== undefined
              ? { parentAccountId: input.parentAccountId }
              : {}),
          })
          .where(
            and(eq(accounts.id, input.id), eq(accounts.tenantId, ctx.tenantId!))
          );

        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          userName: ctx.user.name,
          action: `ØªØ¹Ø¯ÙŠÙ„ Ø£Ùˆ Ø¥Ø¹Ø§Ø¯Ø© ØªØ±ØªÙŠØ¨ Ø§Ù„Ø­Ø³Ø§Ø¨: ${input.name} (${input.code})`,
          details: `ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø³Ø§Ø¨ ÙˆØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ØªØ¨Ø¹ÙŠØ© Ø§Ù„Ø´Ø¬Ø±ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­`,
        });

        return { success: true };
      }),

    // Move account in Tree (Drag and Drop / Reparenting)
    moveAccount: tenantProcedure
      .input(
        z.object({
          accountId: z.number(),
          newParentAccountId: z.number().nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input.accountId === input.newParentAccountId) {
          throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¬Ø¹Ù„ Ø§Ù„Ø­Ø³Ø§Ø¨ ØªØ§Ø¨Ø¹Ø§Ù‹ Ù„Ù†ÙØ³Ù‡");
        }

        await db
          .update(accounts)
          .set({
            parentAccountId: input.newParentAccountId,
          })
          .where(
            and(
              eq(accounts.id, input.accountId),
              eq(accounts.tenantId, ctx.tenantId!)
            )
          );

        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          userName: ctx.user.name,
          action: `Ø¥Ø¹Ø§Ø¯Ø© ØªØ±ØªÙŠØ¨ Ø§Ù„Ø¯Ù„ÙŠÙ„ (Ø³Ø­Ø¨ ÙˆØ¥ÙÙ„Ø§Øª)`,
          details: `ØªÙ… Ù†Ù‚Ù„ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø±Ù‚Ù… ${input.accountId} Ù„ÙŠÙƒÙˆÙ† ØªØ­Øª Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ Ø±Ù‚Ù… ${input.newParentAccountId || "Ø¬Ø°Ø± Ø±Ø¦ÙŠØ³ÙŠ"}`,
        });

        return { success: true };
      }),

    // Get Transactions with pagination / filters
    getTransactions: tenantProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            accountId: z.number().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            limit: z.number().min(1).max(500).default(100),
            offset: z.number().min(0).default(0),
            includeReversed: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];

        const conditions: any[] = [eq(transactions.tenantId, ctx.tenantId!)];
        if (input?.search) {
          conditions.push(
            or(
              ilike(transactions.narration, `%${input.search}%`),
              ilike(transactions.notes, `%${input.search}%`),
              ilike(accounts.name, `%${input.search}%`),
              ilike(accounts.code, `%${input.search}%`)
            )
          );
        }
        if (input?.accountId) {
          conditions.push(eq(transactions.accountId, input.accountId));
        }
        if (!input?.includeReversed) {
          conditions.push(eq(transactions.isReversed, false));
        }
        if (input?.startDate) {
          conditions.push(
            gte(transactions.transactionDate, new Date(input.startDate))
          );
        }
        if (input?.endDate) {
          conditions.push(
            lte(transactions.transactionDate, new Date(input.endDate))
          );
        }

        const whereClause =
          conditions.length > 0 ? and(...conditions) : undefined;

        const list = await db
          .select({
            id: transactions.id,
            accountId: transactions.accountId,
            accountName: accounts.name,
            accountCode: accounts.code,
            accountType: accounts.type,
            amount: transactions.amount,
            type: transactions.type,
            transactionDate: transactions.transactionDate,
            narration: transactions.narration,
            notes: transactions.notes,
            lifecycleStatus: transactions.lifecycleStatus,
            isReversed: transactions.isReversed,
            reversalReason: transactions.reversalReason,
            referenceType: transactions.referenceType,
            referenceId: transactions.referenceId,
            branchId: transactions.branchId,
            createdAt: transactions.createdAt,
          })
          .from(transactions)
          .leftJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(whereClause)
          .orderBy(desc(transactions.transactionDate), desc(transactions.id))
          .limit(input?.limit ?? 100)
          .offset(input?.offset ?? 0);

        return list;
      }),

    // Add Transaction
    addTransaction: tenantProcedure
      .input(
        z.object({
          id: z.number().optional(),
          accountId: z.number(),
          amount: z.string().refine(v => {
            const n = parseFloat(v);
            return !isNaN(n) && n > 0 && n < 1_000_000_000;
          }, "Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹ ÙˆØ£Ù‚Ù„ Ù…Ù† Ù…Ù„ÙŠØ§Ø±"),
          type: z.enum(["debit", "credit"]),
          transactionDate: z
            .string()
            .refine(v => !isNaN(Date.parse(v)), "ØªØ§Ø±ÙŠØ® ØºÙŠØ± ØµØ­ÙŠØ­"),
          narration: z.string().max(500).optional(),
          notes: z.string().optional(),
          costCenterId: z.number().optional(),
          lifecycleStatus: z
            .enum(["saved", "approved", "sent"])
            .default("saved"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verify account exists (and belongs to this tenant)
        const account = await db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.id, input.accountId),
              eq(accounts.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (account.length === 0) throw new Error("Ø§Ù„Ø­Ø³Ø§Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");

        // Verify cost center belongs to this tenant (analytical dimension)
        if (input.costCenterId != null) {
          const cc = await db
            .select({ id: costCenters.id })
            .from(costCenters)
            .where(
              and(
                eq(costCenters.id, input.costCenterId),
                eq(costCenters.tenantId, ctx.tenantId!)
              )
            )
            .limit(1);
          if (cc.length === 0) throw new Error("Ù…Ø±ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
        }

        const txDate = new Date(input.transactionDate);

        // Fiscal-period lock: no posting into a closed/closing period.
        await assertPeriodOpen(db, ctx.tenantId!, txDate, "Ø¥Ø¯Ø®Ø§Ù„ Ø­Ø±ÙƒØ© Ù…Ø§Ù„ÙŠØ©");

        const values = {
          tenantId: ctx.tenantId,
          accountId: input.accountId,
          amount: input.amount,
          type: input.type,
          transactionDate: txDate,
          narration: input.narration || null,
          notes: input.notes || null,
          costCenterId: input.costCenterId ?? null,
          lifecycleStatus: input.lifecycleStatus,
          isReversed: false,
          userId: ctx.user.id,
        };

        if (input.id != null) {
          await db
            .insert(transactions)
            .values({ ...values, id: input.id })
            .onConflictDoUpdate({
              target: transactions.id,
              set: { ...values, id: input.id },
            });
        } else {
          await db.insert(transactions).values(values);
        }

        return { success: true };
      }),

    // Batch Add Transactions with Lifecycle Status (saved, approved, sent)
    addBatchTransactions: tenantProcedure
      .input(
        z.object({
          lifecycleStatus: z
            .enum(["saved", "approved", "sent"])
            .default("saved"),
          costCenterId: z.number().optional(),
          rows: z.array(
            z.object({
              id: z.number().optional(),
              accountId: z.number(),
              amount: z.string(),
              type: z.enum(["debit", "credit"]).default("debit"),
              transactionDate: z.string(),
              narration: z.string().optional(),
              notes: z.string().optional(),
              costCenterId: z.number().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = ctx.tenantId!;

        // â”€â”€ Security & integrity pre-flight (batch-wide) â”€â”€
        // 1) Every account must exist AND belong to this tenant (prevents a
        //    cross-tenant accountId from silently corrupting the ledger).
        const requestedAccountIds = [
          ...new Set(input.rows.map(r => r.accountId)),
        ];
        const ownedAccountRows = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(
            and(
              eq(accounts.tenantId, tid),
              inArray(accounts.id, requestedAccountIds)
            )
          );
        const ownedAccountIds = new Set(ownedAccountRows.map(a => a.id));
        const foreignAccountId = requestedAccountIds.find(
          id => !ownedAccountIds.has(id)
        );
        if (foreignAccountId != null)
          throw new Error(
            `Ø§Ù„Ø­Ø³Ø§Ø¨ #${foreignAccountId} ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¤Ø³Ø³Ø© â€” ØªÙ… Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø¯ÙØ¹Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„`
          );

        // 2) Every cost center (if provided) must belong to this tenant.
        const requestedCcIds = [
          ...new Set(
            [input.costCenterId, ...input.rows.map(r => r.costCenterId)].filter(
              (v): v is number => v != null
            )
          ),
        ];
        if (requestedCcIds.length > 0) {
          const ownedCcRows = await db
            .select({ id: costCenters.id })
            .from(costCenters)
            .where(
              and(
                eq(costCenters.tenantId, tid),
                inArray(costCenters.id, requestedCcIds)
              )
            );
          const ownedCcIds = new Set(ownedCcRows.map(c => c.id));
          const foreignCcId = requestedCcIds.find(id => !ownedCcIds.has(id));
          if (foreignCcId != null)
            throw new Error(
              `Ù…Ø±ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ© #${foreignCcId} ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¤Ø³Ø³Ø©`
            );
        }

        // 3) Fiscal-period lock: reject the whole batch if any row targets a
        //    locked (closing/closed) period â€” atomicity at batch level.
        for (const item of input.rows) {
          await assertPeriodOpen(
            db,
            tid,
            new Date(item.transactionDate),
            "Ø¥Ø¯Ø®Ø§Ù„ Ø¯ÙØ¹Ø© Ø­Ø±ÙƒØ§Øª"
          );
        }

        let count = 0;
        for (const item of input.rows) {
          if (!item.amount || parseFloat(item.amount) <= 0) continue;
          const values = {
            tenantId: tid,
            accountId: item.accountId,
            amount: item.amount,
            type: item.type || "debit",
            transactionDate: new Date(item.transactionDate),
            narration: item.narration || null,
            notes: item.notes || null,
            costCenterId: item.costCenterId ?? input.costCenterId ?? null,
            lifecycleStatus: input.lifecycleStatus,
            isReversed: false,
            userId: ctx.user.id,
          };
          if (item.id != null) {
            await db
              .insert(transactions)
              .values({ ...values, id: item.id })
              .onConflictDoUpdate({
                target: transactions.id,
                set: { ...values, id: item.id },
              });
          } else {
            await db.insert(transactions).values(values);
          }
          count++;
        }

        return { success: true, count };
      }),

    // Daily Entry: recording a single daily movement (debit/credit) against an account
    dailyEntry: tenantProcedure
      .input(
        z.object({
          accountId: z.number(),
          amount: z.string().refine(v => {
            const n = parseFloat(v);
            return !isNaN(n) && n > 0 && n < 1_000_000_000;
          }, "Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹ ÙˆØ£Ù‚Ù„ Ù…Ù† Ù…Ù„ÙŠØ§Ø±"),
          type: z.enum(["debit", "credit"]),
          transactionDate: z
            .string()
            .refine(v => !isNaN(Date.parse(v)), "ØªØ§Ø±ÙŠØ® ØºÙŠØ± ØµØ­ÙŠØ­"),
          narration: z.string().max(200).optional().default("Ø­Ø±ÙƒØ© ÙŠÙˆÙ…ÙŠØ©"),
          costCenterId: z.number().optional(),
          lifecycleStatus: z.enum(["saved"]).default("saved"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verify account exists
        const account = await db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.id, input.accountId),
              eq(accounts.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (account.length === 0) throw new Error("Ø§Ù„Ø­Ø³Ø§Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");

        // Verify cost center belongs to this tenant (analytical dimension)
        if (input.costCenterId != null) {
          const cc = await db
            .select({ id: costCenters.id })
            .from(costCenters)
            .where(
              and(
                eq(costCenters.id, input.costCenterId),
                eq(costCenters.tenantId, ctx.tenantId!)
              )
            )
            .limit(1);
          if (cc.length === 0) throw new Error("Ù…Ø±ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
        }

        const txDate = new Date(input.transactionDate);
        await assertPeriodOpen(db, ctx.tenantId!, txDate, "Ø­Ø±ÙƒØ© ÙŠÙˆÙ…ÙŠØ©");

        const values = {
          tenantId: ctx.tenantId,
          accountId: input.accountId,
          amount: input.amount,
          type: input.type,
          transactionDate: txDate,
          narration: input.narration,
          notes: null,
          costCenterId: input.costCenterId ?? null,
          lifecycleStatus: input.lifecycleStatus,
          isReversed: false,
          userId: ctx.user.id,
        };

        await db.insert(transactions).values(values);
        return { success: true };
      }),

    // Update Transaction Lifecycle (Approve, Send, Post/Migrate, Reverse)
    updateTransactionLifecycle: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          lifecycleStatus: z.enum([
            "saved",
            "approved",
            "sent",
            "posted",
            "completed",
          ]),
          reversalReason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.id, input.id),
              eq(transactions.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (existing.length === 0) throw new Error("Ø§Ù„Ø­Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");

        // Posted entries are immutable: ANY in-place change to a posted leg â€”
        // including postedâ†’posted flag flips (isReversed/reversalReason) or
        // postedâ†’completed â€” is rejected. Corrections flow ONLY through a
        // real reversing journal (reverseJournal), preserving the audit trail.
        if (existing[0]?.lifecycleStatus === "posted") {
          throw new Error(
            "Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø£Ùˆ Ø¥Ù„ØºØ§Ø¡ Ø­Ø±ÙƒØ© Ù…Ø±Ø­Ù„Ø© Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹. Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ ÙŠØªÙ… Ø¹Ø¨Ø± Ù‚ÙŠØ¯ Ø¹ÙƒØ³ÙŠ Ù…Ø³ØªÙ‚Ù„."
          );
        }

        // Separation of Duties: the creator cannot approve/post their own
        // transaction unless they hold an elevated governance role (admin/owner).
        const elevating = ["approved", "sent", "posted"].includes(
          input.lifecycleStatus
        );
        if (
          elevating &&
          existing[0]?.userId === ctx.user.id &&
          !canApproveOwnTransaction(ctx.user.role)
        ) {
          throw new Error(
            "ÙØµÙ„ Ø§Ù„Ù…Ù‡Ø§Ù… (SoD): Ù„Ø§ ÙŠÙ…ÙƒÙ† Ù„Ù…Ù†Ø´Ø¦ Ø§Ù„Ø­Ø±ÙƒØ© Ø§Ø¹ØªÙ…Ø§Ø¯Ù‡Ø§ Ø£Ùˆ ØªØ±Ø­ÙŠÙ„Ù‡Ø§ Ø¨Ù†ÙØ³Ù‡ â€” ÙŠÙ„Ø²Ù… Ù…ÙˆØ§ÙÙ‚Ø© Ù…Ø³ØªØ®Ø¯Ù… Ø¢Ø®Ø±."
          );
        }

        // Fiscal-period lock: cannot elevate a transaction into a locked period.
        if (elevating) {
          await assertPeriodOpen(
            db,
            ctx.tenantId!,
            existing[0]!.transactionDate,
            `ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ø­Ø±ÙƒØ© #${input.id}`
          );
        }

        await db
          .update(transactions)
          .set({
            lifecycleStatus: input.lifecycleStatus,
            ...(input.reversalReason
              ? { reversalReason: input.reversalReason, isReversed: true }
              : {}),
          })
          .where(
            and(
              eq(transactions.id, input.id),
              eq(transactions.tenantId, ctx.tenantId!)
            )
          );

        // Log activity
        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø±ÙƒØ© #${input.id} Ø¥Ù„Ù‰: ${input.lifecycleStatus}`,
          details: input.reversalReason
            ? `Ø³Ø¨Ø¨ Ø§Ù„Ø¹ÙƒØ³: ${input.reversalReason}`
            : "ØªØºÙŠÙŠØ± Ø­Ø§Ù„Ø© Ø¯ÙˆØ±Ø© Ø§Ù„Ø­Ø±ÙƒØ© Ø§Ù„Ù…Ø§Ù„ÙŠØ©",
        });

        return { success: true };
      }),

    // Update Transaction (Only allowed if lifecycleStatus === 'saved')
    updateTransaction: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          amount: z.string(),
          narration: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.id, input.id),
              eq(transactions.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (existing.length === 0) throw new Error("Ø§Ù„Ø­Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
        if (existing[0]?.lifecycleStatus !== "saved") {
          throw new Error(
            "Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø­Ø±ÙƒØ© Ù„Ø£Ù†Ù‡Ø§ Ù…Ø¹ØªÙ…Ø¯Ø© Ø£Ùˆ Ù…Ø±Ø³Ù„Ø© ÙˆÙ…Ø¤Ù…Ù†Ø© ØªÙ…Ø§Ù…Ø§Ù‹"
          );
        }

        await db
          .update(transactions)
          .set({
            amount: input.amount,
            narration: input.narration || null,
            notes: input.notes || null,
          })
          .where(
            and(
              eq(transactions.id, input.id),
              eq(transactions.tenantId, ctx.tenantId!)
            )
          );

        return { success: true };
      }),

    // Delete Transaction (only if status is 'saved')
    deleteTransaction: tenantProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.id, input.id),
              eq(transactions.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (existing.length === 0) throw new Error("Ø§Ù„Ø­Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
        if (existing[0].lifecycleStatus !== "saved") {
          throw new Error(
            "Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø­Ø°Ù Ø­Ø±ÙƒØ© Ù…Ø¹ØªÙ…Ø¯Ø© Ø£Ùˆ Ù…Ø±Ø³Ù„Ø© â€” Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø¹ÙƒØ³ÙŠ"
          );
        }
        await db
          .delete(transactions)
          .where(
            and(
              eq(transactions.id, input.id),
              eq(transactions.tenantId, ctx.tenantId!)
            )
          );
        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `Ø­Ø°Ù Ø­Ø±ÙƒØ© Ù…Ø§Ù„ÙŠØ© #${input.id}`,
          details: `Ø§Ù„Ø­Ø³Ø§Ø¨: ${existing[0].accountId} â€” Ø§Ù„Ù…Ø¨Ù„Øº: ${existing[0].amount}`,
        });
        return { success: true };
      }),

    // Smart Suggestions Engine: recommends accounts & standard amounts based on history & operation type
    getSmartSuggestions: tenantProcedure
      .input(
        z.object({
          query: z.string().optional(),
          operationType: z.string().optional(), // e.g. "Ø¥ÙŠØ±Ø§Ø¯", "Ù…ØµØ±ÙˆÙ", "Ø³Ø¯Ø§Ø¯", "Ø¹Ù…ÙŠÙ„"
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId)
          return { suggestedAccounts: [], recentNarrations: [], insights: [] };
        const db = await getDb();
        if (!db)
          return { suggestedAccounts: [], recentNarrations: [], insights: [] };

        const allAccounts = await db
          .select()
          .from(accounts)
          .where(eq(accounts.tenantId, ctx.tenantId!));

        // Usage frequency (smart ranking): how often each account is used.
        const usageRows = await db
          .select({
            accountId: transactions.accountId,
            cnt: sql<number>`count(*)::int`,
          })
          .from(transactions)
          .where(eq(transactions.tenantId, ctx.tenantId!))
          .groupBy(transactions.accountId);
        const usage = new Map<number, number>();
        usageRows.forEach((r: any) =>
          usage.set(Number(r.accountId), Number(r.cnt))
        );
        const recentTx = await db
          .select({
            narration: transactions.narration,
            accountId: transactions.accountId,
            amount: transactions.amount,
            accountName: accounts.name,
          })
          .from(transactions)
          .leftJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(eq(transactions.tenantId, ctx.tenantId!))
          .orderBy(desc(transactions.id))
          .limit(20);

        const q = input.query?.trim().toLowerCase();
        let candidates = allAccounts;

        // 1) Text auto-complete: match by name / Arabic name / code
        if (q) {
          candidates = candidates.filter(
            (a: any) =>
              (a.name && a.name.toLowerCase().includes(q)) ||
              (a.nameAr && a.nameAr.toLowerCase().includes(q)) ||
              (a.code && a.code.toLowerCase().includes(q))
          );
        }

        // 2) Operation-type narrowing
        if (input.operationType) {
          const t = input.operationType.toLowerCase();
          const isRevenue =
            t.includes("Ø¥ÙŠØ±Ø§Ø¯") ||
            t.includes("ØªØ­ØµÙŠÙ„") ||
            t.includes("Ø¨ÙŠØ¹") ||
            t.includes("Ø¹Ù…ÙŠÙ„");
          const isExpense =
            t.includes("Ù…ØµØ±ÙˆÙ") ||
            t.includes("Ø¯ÙØ¹") ||
            t.includes("Ø³Ø¯Ø§Ø¯") ||
            t.includes("Ø´Ø±Ø§Ø¡") ||
            t.includes("Ù…ÙˆØ±Ø¯");
          if (isRevenue) {
            candidates = candidates.filter(
              (a: any) =>
                a.type === "revenue" ||
                a.type === "asset" ||
                a.type === "equity"
            );
          } else if (isExpense) {
            candidates = candidates.filter(
              (a: any) =>
                a.type === "expense" ||
                a.type === "liability" ||
                a.type === "asset"
            );
          }
        }

        // 3) Rank by historical usage (most-used first) â€” real intelligence
        candidates = [...candidates].sort(
          (a: any, b: any) => (usage.get(b.id) || 0) - (usage.get(a.id) || 0)
        );
        const matchedAccounts = candidates;

        const recentNarrations = Array.from(
          new Set(recentTx.map(t => t.narration).filter(Boolean))
        );

        // Data-driven insights (real ledger analytics, not static text)
        const [agg] = await db
          .select({
            debits: sql<number>`coalesce(sum(case when ${transactions.type} = 'debit' then ${transactions.amount}::numeric else 0 end),0)::float`,
            credits: sql<number>`coalesce(sum(case when ${transactions.type} = 'credit' then ${transactions.amount}::numeric else 0 end),0)::float`,
            count: sql<number>`count(*)::int`,
          })
          .from(transactions)
          .where(eq(transactions.tenantId, ctx.tenantId!));
        const balance = Number(agg?.credits || 0) - Number(agg?.debits || 0);
        const fmt2 = (n: number) =>
          `${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}`;
        const insights: string[] = [];
        if (Number(agg?.count || 0) > 0) {
          insights.push(
            `Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø­Ø±ÙƒØ§Øª: ${agg.count} â€” Ù…Ø¯ÙŠÙ† ${fmt2(agg.debits)} / Ø¯Ø§Ø¦Ù† ${fmt2(agg.credits)}.`
          );
          if (Math.abs(balance) > 0.01) {
            insights.push(
              `Ø§Ù„Ù‚ÙŠØ¯ Ø§Ù„Ø¹Ø§Ù… ØºÙŠØ± Ù…ØªÙˆØ§Ø²Ù† Ø¨ÙØ§Ø±Ù‚ ${fmt2(Math.abs(balance))} Ø±.ÙŠ â€” ÙŠÙÙ†ØµØ­ Ø¨Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø­Ø±ÙƒØ§Øª ØºÙŠØ± Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù‚ÙŠÙˆØ¯.`
            );
          } else {
            insights.push(
              "Ø¯ÙØªØ± Ø§Ù„Ø£Ø³ØªØ§Ø° Ù…ØªÙˆØ§Ø²Ù† (Ù…Ø¯ÙŠÙ† = Ø¯Ø§Ø¦Ù†) â€” Ø¬Ø§Ù‡Ø² Ù„Ù„Ø¥Ù‚ÙØ§Ù„ Ø§Ù„Ù…Ø§Ù„ÙŠ."
            );
          }
          if (matchedAccounts[0]) {
            insights.push(
              `Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø£ÙƒØ«Ø± Ø§Ø³ØªØ®Ø¯Ø§Ù…Ø§Ù‹: ${matchedAccounts[0].name}.`
            );
          }
        } else {
          insights.push(
            "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø±ÙƒØ§Øª Ù…Ø³Ø¬Ù„Ø© Ø¨Ø¹Ø¯ â€” Ø§Ø¨Ø¯Ø£ Ø¨Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ù„Ø¨Ù†Ø§Ø¡ Ø§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ©."
          );
        }

        return {
          suggestedAccounts: matchedAccounts.slice(0, 8),
          recentNarrations: recentNarrations.slice(0, 5),
          insights,
        };
      }),

    // â”€â”€ Manual Journal Entry (smart, balanced, backbone-integrated) â”€â”€
    createManualJournalEntry: tenantProcedure
      .input(
        z.object({
          date: z.string().optional(),
          narration: z.string().min(1),
          referenceNo: z.string().optional(),
          branchId: z.number().optional(),
          costCenterId: z.number().optional(),
          lines: z
            .array(
              z.object({
                accountId: z.number(),
                type: z.enum(["debit", "credit"]),
                amount: z
                  .string()
                  .refine(
                    v => parseFloat(v) > 0,
                    "Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø£ÙƒØ¨Ø± Ù…Ù† ØµÙØ±"
                  ),
                narration: z.string().optional(),
                costCenterId: z.number().optional(),
              })
            )
            .min(2, "Ø§Ù„Ù‚ÙŠØ¯ ÙŠØ­ØªØ§Ø¬ Ø­Ø±ÙƒØªÙŠÙ† Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tenantId = ctx.tenantId;

        const totalDebit = input.lines
          .filter(l => l.type === "debit")
          .reduce((s, l) => s + parseFloat(l.amount), 0);
        const totalCredit = input.lines
          .filter(l => l.type === "credit")
          .reduce((s, l) => s + parseFloat(l.amount), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01)
          throw new Error(
            "Ø§Ù„Ù‚ÙŠØ¯ ØºÙŠØ± Ù…ØªÙˆØ§Ø²Ù†: Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ù…Ø¯ÙŠÙ† ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ³Ø§ÙˆÙŠ Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø¯Ø§Ø¦Ù†"
          );

        const txDate = input.date ? new Date(input.date) : new Date();

        // Fiscal-period lock: no manual posting into a closed/closing period.
        await assertPeriodOpen(db, tenantId, txDate, "Ù‚ÙŠØ¯ ÙŠØ¯ÙˆÙŠ");

        // Verify all referenced accounts belong to this tenant.
        const lineAccountIds = [...new Set(input.lines.map(l => l.accountId))];
        const ownedAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(
            and(
              eq(accounts.tenantId, tenantId),
              inArray(accounts.id, lineAccountIds)
            )
          );
        if (ownedAccounts.length < lineAccountIds.length)
          throw new Error("Ø£Ø­Ø¯ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù…Ø´Ø§Ø± Ø¥Ù„ÙŠÙ‡Ø§ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¤Ø³Ø³Ø©");

        // Verify cost center (header/lines) belongs to this tenant.
        const ccIds = [
          ...new Set(
            [
              input.costCenterId,
              ...input.lines.map(l => l.costCenterId),
            ].filter((v): v is number => v != null)
          ),
        ];
        if (ccIds.length > 0) {
          const ownedCcs = await db
            .select({ id: costCenters.id })
            .from(costCenters)
            .where(
              and(
                eq(costCenters.tenantId, tenantId),
                inArray(costCenters.id, ccIds)
              )
            );
          if (ownedCcs.length < ccIds.length)
            throw new Error(
              "Ù…Ø±ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ© Ø§Ù„Ù…Ø´Ø§Ø± Ø¥Ù„ÙŠÙ‡ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¤Ø³Ø³Ø©"
            );
        }

        const ref =
          input.referenceNo || `MAN-${Date.now().toString().slice(-6)}`;
        const bRows = await db
          .select()
          .from(branches)
          .where(eq(branches.tenantId, tenantId))
          .orderBy(desc(branches.isMain))
          .limit(1);
        const effectiveBranchId = input.branchId ?? bRows[0]?.id ?? null;

        const je = await db.transaction(async (tx: any) => {
          const [entry] = await tx
            .insert(journalEntries)
            .values({
              tenantId,
              branchId: effectiveBranchId,
              sourceModule: "manual",
              sourceRefType: "manual",
              sourceRefId: null,
              referenceNo: ref,
              status: "posted",
              totalAmount: totalDebit.toFixed(2),
              createdById: ctx.user?.id ?? null,
              postedAt: new Date(),
              // Posted journals are immutable (chk_journal_immutable_posted);
              // corrections flow through reverseJournal.
              isImmutable: true,
            })
            .returning();

          for (const l of input.lines) {
            await tx.insert(transactions).values({
              tenantId,
              accountId: l.accountId,
              branchId: effectiveBranchId,
              amount: l.amount,
              type: l.type,
              transactionDate: txDate,
              narration: l.narration || input.narration,
              lifecycleStatus: "posted",
              referenceType: "manual",
              referenceId: null,
              sourceModule: "manual",
              costCenterId: l.costCenterId ?? input.costCenterId ?? null,
              userId: ctx.user?.id ?? null,
              journalEntryId: entry.id,
            });
          }
          await tx.insert(activityLogs).values({
            userId: ctx.user?.id ?? null,
            action: `Ø¥Ù†Ø´Ø§Ø¡ Ù‚ÙŠØ¯ ÙŠØ¯ÙˆÙŠ #${entry.id}`,
            details: `Ø§Ù„Ù…Ø±Ø¬Ø¹: ${ref} â€” Ø§Ù„Ù…Ø¨Ù„Øº: ${totalDebit.toFixed(2)}`,
          });
          return entry;
        });
        return je;
      }),

    // â”€â”€ Scheduled / recurring journal entries (automation) â”€â”€
    scheduled: router({
      list: tenantProcedure.query(async ({ ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(scheduledJournalEntries)
          .where(eq(scheduledJournalEntries.tenantId, ctx.tenantId))
          .orderBy(desc(scheduledJournalEntries.nextRunAt));
      }),
      create: adminProcedure
        .input(
          z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            branchId: z.number().optional(),
            frequency: z
              .enum(["once", "daily", "weekly", "monthly"])
              .default("monthly"),
            nextRunAt: z.string(),
            legs: z
              .array(
                z.object({
                  accountId: z.number(),
                  debit: z.string().default("0"),
                  credit: z.string().default("0"),
                  description: z.string().optional(),
                })
              )
              .min(1),
          })
        )
        .mutation(async ({ input, ctx }) => {
          if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          const [row] = await db
            .insert(scheduledJournalEntries)
            .values({
              tenantId: ctx.tenantId,
              name: input.name,
              description: input.description ?? null,
              branchId: input.branchId ?? null,
              frequency: input.frequency,
              nextRunAt: new Date(input.nextRunAt),
              isActive: true,
              legs: input.legs,
            })
            .returning();
          return row;
        }),
      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().optional(),
            description: z.string().optional(),
            branchId: z.number().optional(),
            frequency: z
              .enum(["once", "daily", "weekly", "monthly"])
              .optional(),
            nextRunAt: z.string().optional(),
            isActive: z.boolean().optional(),
            legs: z
              .array(
                z.object({
                  accountId: z.number(),
                  debit: z.string().default("0"),
                  credit: z.string().default("0"),
                  description: z.string().optional(),
                })
              )
              .optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          const { id, ...rest } = input;
          const set: any = { ...rest };
          if (rest.nextRunAt) set.nextRunAt = new Date(rest.nextRunAt);
          await db
            .update(scheduledJournalEntries)
            .set(set)
            .where(
              and(
                eq(scheduledJournalEntries.tenantId, ctx.tenantId!),
                eq(scheduledJournalEntries.id, id)
              )
            );
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          await db
            .delete(scheduledJournalEntries)
            .where(
              and(
                eq(scheduledJournalEntries.tenantId, ctx.tenantId!),
                eq(scheduledJournalEntries.id, input.id)
              )
            );
          return { success: true };
        }),
      processDue: adminProcedure.mutation(async ({ ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        // Delegates to the shared automation engine (server/automation.ts) so
        // the same logic also runs from the Vercel cron trigger.
        return runScheduledJournalEntries(ctx.tenantId, ctx.user?.id ?? null);
      }),
    }),

    // â”€â”€â”€ Recurring / Scheduled Expenses (Intelligent Automation) â”€â”€â”€â”€â”€â”€â”€â”€
    recurringExpenses: router({
      list: tenantProcedure
        .input(
          z
            .object({
              status: z.string().optional(),
              categoryId: z.number().optional(),
              vendorId: z.number().optional(),
              limit: z.number().default(100).optional(),
              offset: z.number().default(0).optional(),
            })
            .optional()
        )
        .query(async ({ ctx, input }) => {
          if (!ctx.tenantId) return [];
          const db = await getDb();
          if (!db) return [];
          const where = [
            eq(recurringExpenses.tenantId, ctx.tenantId),
            input?.status
              ? eq(recurringExpenses.status, input.status as any)
              : undefined,
            input?.categoryId
              ? eq(recurringExpenses.categoryId, input.categoryId)
              : undefined,
            input?.vendorId
              ? eq(recurringExpenses.vendorId, input.vendorId)
              : undefined,
          ].filter(Boolean) as any[];
          return db
            .select()
            .from(recurringExpenses)
            .where(and(...where))
            .orderBy(desc(recurringExpenses.nextRunAt))
            .limit(input?.limit ?? 100)
            .offset(input?.offset ?? 0);
        }),

      get: tenantProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          const [row] = await db
            .select()
            .from(recurringExpenses)
            .where(
              and(
                eq(recurringExpenses.id, input.id),
                eq(recurringExpenses.tenantId, ctx.tenantId)
              )
            )
            .limit(1);
          if (!row) throw new Error("Ø§Ù„Ù…ØµØ±ÙˆÙ Ø§Ù„Ø¯ÙˆØ±ÙŠ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
          // Fetch recent runs
          const runs = await db
            .select()
            .from(recurringExpenseRuns)
            .where(eq(recurringExpenseRuns.recurringExpenseId, input.id))
            .orderBy(desc(recurringExpenseRuns.runNumber))
            .limit(20);
          return { ...row, runs };
        }),

      create: adminProcedure
        .input(
          z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            categoryId: z.number().optional(),
            vendorId: z.number().optional(),
            accountId: z.number(),
            branchId: z.number().optional(),
            amount: z.string(),
            currency: z.string().default("YER"),
            exchangeRate: z.string().default("1"),
            taxRate: z.string().default("0"),
            taxAccountId: z.number().optional(),
            frequency: z
              .enum([
                "daily",
                "weekly",
                "biweekly",
                "monthly",
                "quarterly",
                "semiannual",
                "annual",
                "custom",
              ])
              .default("monthly"),
            customCron: z.string().optional(),
            dayOfMonth: z.number().min(1).max(31).optional(),
            dayOfWeek: z.number().min(0).max(6).optional(),
            weekOfMonth: z.number().min(1).max(5).optional(),
            startDate: z.string(),
            endDate: z.string().optional(),
            maxOccurrences: z.number().optional(),
            basis: z.enum(["accrual", "cash"]).default("accrual"),
            status: z
              .enum(["draft", "active", "paused", "completed", "cancelled"])
              .default("draft"),
            approvalStatus: z
              .enum(["pending", "approved", "rejected", "auto_approved"])
              .default("pending"),
            approverId: z.number().optional(),
            paymentMethod: z.string().optional(),
            paymentAccountId: z.number().optional(),
            autoPay: z.boolean().default(false),
            budgetId: z.number().optional(),
            departmentId: z.number().optional(),
            projectId: z.number().optional(),
            tags: z.array(z.string()).optional(),
            metadata: z.record(z.string(), z.any()).optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
          const db = await getDb();
          if (!db) throw new Error("Database not available");

          // Calculate nextRunAt based on frequency and startDate
          const startDate = new Date(input.startDate);
          const nextRunAt = new Date(startDate);

          // Validate account exists and is expense type
          const [account] = await db
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.id, input.accountId),
                eq(accounts.tenantId, ctx.tenantId)
              )
            )
            .limit(1);
          if (!account) throw new Error("Ø§Ù„Ø­Ø³Ø§Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
          if (account.type !== "expense")
            throw new Error("Ø§Ù„Ø­Ø³Ø§Ø¨ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ù…Ù† Ù†ÙˆØ¹ Ù…ØµØ±ÙˆÙ");

          const [row] = await db
            .insert(recurringExpenses)
            .values({
              tenantId: ctx.tenantId,
              name: input.name,
              description: input.description ?? null,
              categoryId: input.categoryId ?? null,
              vendorId: input.vendorId ?? null,
              accountId: input.accountId,
              branchId: input.branchId ?? null,
              amount: input.amount,
              currency: input.currency,
              exchangeRate: input.exchangeRate,
              taxRate: input.taxRate,
              taxAccountId: input.taxAccountId ?? null,
              frequency: input.frequency,
              customCron: input.customCron ?? null,
              dayOfMonth: input.dayOfMonth ?? null,
              dayOfWeek: input.dayOfWeek ?? null,
              weekOfMonth: input.weekOfMonth ?? null,
              startDate,
              endDate: input.endDate ? new Date(input.endDate) : null,
              maxOccurrences: input.maxOccurrences ?? null,
              occurrencesCount: 0,
              basis: input.basis,
              status: input.status,
              approvalStatus: input.approvalStatus,
              approverId: input.approverId ?? null,
              paymentMethod: input.paymentMethod ?? null,
              paymentAccountId: input.paymentAccountId ?? null,
              autoPay: input.autoPay,
              nextRunAt,
              tags: input.tags ? input.tags : null,
              metadata: input.metadata ? input.metadata : null,
              createdById: ctx.user.id,
            })
            .returning();

          // If approved and active, schedule first run
          if (row.approvalStatus === "approved" && row.status === "active") {
            await scheduleNextRun(db, row.id, ctx.tenantId);
          }

          return row;
        }),

      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().optional(),
            description: z.string().optional(),
            categoryId: z.number().nullish(),
            vendorId: z.number().nullish(),
            accountId: z.number().optional(),
            branchId: z.number().nullish(),
            amount: z.string().optional(),
            currency: z.string().optional(),
            exchangeRate: z.string().optional(),
            taxRate: z.string().optional(),
            taxAccountId: z.number().nullish(),
            frequency: z
              .enum([
                "daily",
                "weekly",
                "biweekly",
                "monthly",
                "quarterly",
                "semiannual",
                "annual",
                "custom",
              ])
              .optional(),
            customCron: z.string().optional(),
            dayOfMonth: z.number().min(1).max(31).optional(),
            dayOfWeek: z.number().min(0).max(6).optional(),
            weekOfMonth: z.number().min(1).max(5).optional(),
            startDate: z.string().optional(),
            endDate: z.string().nullish(),
            maxOccurrences: z.number().nullish(),
            basis: z.enum(["accrual", "cash"]).optional(),
            status: z
              .enum(["draft", "active", "paused", "completed", "cancelled"])
              .optional(),
            approvalStatus: z
              .enum(["pending", "approved", "rejected", "auto_approved"])
              .optional(),
            approverId: z.number().nullish(),
            paymentMethod: z.string().optional(),
            paymentAccountId: z.number().nullish(),
            autoPay: z.boolean().optional(),
            budgetId: z.number().nullish(),
            departmentId: z.number().nullish(),
            projectId: z.number().nullish(),
            tags: z.array(z.string()).optional(),
            metadata: z.record(z.string(), z.any()).optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          const { id, ...rest } = input;
          const set: any = { ...rest };
          if (rest.startDate) set.startDate = new Date(rest.startDate);
          if (rest.endDate !== undefined)
            set.endDate = rest.endDate ? new Date(rest.endDate) : null;
          if (rest.tags) set.tags = rest.tags;
          if (rest.metadata) set.metadata = rest.metadata;

          // If status changed to active and approved, schedule next run
          const [current] = await db
            .select()
            .from(recurringExpenses)
            .where(
              and(
                eq(recurringExpenses.id, id),
                eq(recurringExpenses.tenantId, ctx.tenantId!)
              )
            )
            .limit(1);

          await db
            .update(recurringExpenses)
            .set(set)
            .where(
              and(
                eq(recurringExpenses.id, id),
                eq(recurringExpenses.tenantId, ctx.tenantId!)
              )
            );

          // Recalculate nextRunAt if frequency or dates changed
          if (
            current &&
            (rest.frequency ||
              rest.startDate ||
              rest.dayOfMonth ||
              rest.dayOfWeek ||
              rest.weekOfMonth)
          ) {
            const updated = await db
              .select()
              .from(recurringExpenses)
              .where(eq(recurringExpenses.id, id))
              .limit(1);
            if (
              updated[0]?.status === "active" &&
              updated[0]?.approvalStatus === "approved"
            ) {
              await scheduleNextRun(db, id, ctx.tenantId!);
            }
          }

          return { success: true };
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          // Delete associated runs first
          await db
            .delete(recurringExpenseRuns)
            .where(eq(recurringExpenseRuns.recurringExpenseId, input.id));
          await db
            .delete(recurringExpenses)
            .where(
              and(
                eq(recurringExpenses.id, input.id),
                eq(recurringExpenses.tenantId, ctx.tenantId!)
              )
            );
          return { success: true };
        }),

      approve: adminProcedure
        .input(
          z.object({
            id: z.number(),
            decision: z.enum(["approved", "rejected"]),
            note: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          const [rec] = await db
            .select()
            .from(recurringExpenses)
            .where(
              and(
                eq(recurringExpenses.id, input.id),
                eq(recurringExpenses.tenantId, ctx.tenantId!)
              )
            )
            .limit(1);
          if (!rec) throw new Error("Ø§Ù„Ù…ØµØ±ÙˆÙ Ø§Ù„Ø¯ÙˆØ±ÙŠ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
          if (rec.approvalStatus === "approved")
            throw new Error("ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯Ù‡ Ù…Ø³Ø¨Ù‚Ø§Ù‹");

          await db
            .update(recurringExpenses)
            .set({
              approvalStatus: input.decision,
              approvedAt: new Date(),
              approvedById: ctx.user.id,
            })
            .where(eq(recurringExpenses.id, input.id));

          if (input.decision === "approved" && rec.status === "active") {
            await scheduleNextRun(db, input.id, ctx.tenantId!);
          }

          return { success: true };
        }),

      processDue: adminProcedure.mutation(async ({ ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        return runRecurringExpenses(ctx.tenantId, ctx.user?.id ?? null);
      }),

      getRuns: tenantProcedure
        .input(
          z.object({
            recurringExpenseId: z.number().optional(),
            status: z.string().optional(),
            from: z.string().optional(),
            to: z.string().optional(),
            limit: z.number().default(100).optional(),
            offset: z.number().default(0).optional(),
          })
        )
        .query(async ({ ctx, input }) => {
          if (!ctx.tenantId) return [];
          const db = await getDb();
          if (!db) return [];
          const where = [
            eq(recurringExpenseRuns.tenantId, ctx.tenantId),
            input?.recurringExpenseId
              ? eq(
                  recurringExpenseRuns.recurringExpenseId,
                  input.recurringExpenseId
                )
              : undefined,
            input?.status
              ? eq(recurringExpenseRuns.status, input.status as any)
              : undefined,
            input?.from
              ? gte(recurringExpenseRuns.scheduledDate, new Date(input.from))
              : undefined,
            input?.to
              ? lte(recurringExpenseRuns.scheduledDate, new Date(input.to))
              : undefined,
          ].filter(Boolean) as any[];
          return db
            .select()
            .from(recurringExpenseRuns)
            .where(and(...where))
            .orderBy(desc(recurringExpenseRuns.scheduledDate))
            .limit(input?.limit ?? 100)
            .offset(input?.offset ?? 0);
        }),

      retryRun: adminProcedure
        .input(z.object({ runId: z.number() }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          const [run] = await db
            .select()
            .from(recurringExpenseRuns)
            .where(
              and(
                eq(recurringExpenseRuns.id, input.runId),
                eq(recurringExpenseRuns.tenantId, ctx.tenantId!)
              )
            )
            .limit(1);
          if (!run) throw new Error("ØªØ´ØºÙŠÙ„ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
          if (run.status === "completed")
            throw new Error("ØªÙ… ØªÙ†ÙÙŠØ° Ù‡Ø°Ø§ Ø§Ù„ØªØ´ØºÙŠÙ„ Ù…Ø³Ø¨Ù‚Ø§Ù‹");

          await db
            .update(recurringExpenseRuns)
            .set({ status: "pending", errorMessage: null })
            .where(eq(recurringExpenseRuns.id, input.runId));

          // Trigger processing
          await processRecurringExpenseRun(db, run, ctx.user?.id ?? null);

          return { success: true };
        }),

      getUpcoming: tenantProcedure
        .input(z.object({ days: z.number().default(30) }))
        .query(async ({ ctx, input }) => {
          if (!ctx.tenantId) return [];
          const db = await getDb();
          if (!db) return [];
          const until = new Date(
            Date.now() + (input.days || 30) * 24 * 60 * 60 * 1000
          );
          return db
            .select()
            .from(recurringExpenses)
            .where(
              and(
                eq(recurringExpenses.tenantId, ctx.tenantId),
                eq(recurringExpenses.status, "active"),
                eq(recurringExpenses.approvalStatus, "approved"),
                lte(recurringExpenses.nextRunAt, until)
              )
            )
            .orderBy(asc(recurringExpenses.nextRunAt));
        }),

      getStats: tenantProcedure.query(async ({ ctx }) => {
        if (!ctx.tenantId)
          return {
            total: 0,
            active: 0,
            pending: 0,
            overdue: 0,
            totalMonthly: 0,
          };
        const db = await getDb();
        if (!db)
          return {
            total: 0,
            active: 0,
            pending: 0,
            overdue: 0,
            totalMonthly: 0,
          };

        const [total] = await db
          .select({ c: sql`count(*)` })
          .from(recurringExpenses)
          .where(eq(recurringExpenses.tenantId, ctx.tenantId));
        const [active] = await db
          .select({ c: sql`count(*)` })
          .from(recurringExpenses)
          .where(
            and(
              eq(recurringExpenses.tenantId, ctx.tenantId),
              eq(recurringExpenses.status, "active")
            )
          );
        const [pending] = await db
          .select({ c: sql`count(*)` })
          .from(recurringExpenses)
          .where(
            and(
              eq(recurringExpenses.tenantId, ctx.tenantId),
              eq(recurringExpenses.approvalStatus, "pending")
            )
          );
        const [overdue] = await db
          .select({ c: sql`count(*)` })
          .from(recurringExpenses)
          .where(
            and(
              eq(recurringExpenses.tenantId, ctx.tenantId),
              eq(recurringExpenses.status, "active"),
              eq(recurringExpenses.approvalStatus, "approved"),
              sql`${recurringExpenses.nextRunAt} < now()`
            )
          );

        // Calculate estimated monthly total
        const activeExpenses = await db
          .select({
            amount: recurringExpenses.amount,
            frequency: recurringExpenses.frequency,
          })
          .from(recurringExpenses)
          .where(
            and(
              eq(recurringExpenses.tenantId, ctx.tenantId),
              eq(recurringExpenses.status, "active"),
              eq(recurringExpenses.approvalStatus, "approved")
            )
          );

        let totalMonthly = 0;
        for (const exp of activeExpenses) {
          const amt = parseFloat(exp.amount);
          const monthlyFactor = getMonthlyFactor(exp.frequency);
          totalMonthly += amt * monthlyFactor;
        }

        return {
          total: Number(total?.c ?? 0),
          active: Number(active?.c ?? 0),
          pending: Number(pending?.c ?? 0),
          overdue: Number(overdue?.c ?? 0),
          totalMonthly: Math.round(totalMonthly * 100) / 100,
        };
      }),

      // Cash flow preview for recurring expenses
      getPreview: tenantProcedure
        .input(z.object({ months: z.number().default(12).optional() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.tenantId) return [];
          return generateUpcomingRuns(ctx.tenantId, input.months ?? 12);
        }),
    }),

    // Budgets & Targets
    getBudgets: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return await db
        .select()
        .from(budgets)
        .where(eq(budgets.tenantId, ctx.tenantId!))
        .orderBy(desc(budgets.id));
    }),

    saveBudget: tenantProcedure
      .input(
        z.object({
          id: z.number().optional(),
          periodName: z.string(),
          targetRevenue: z.string(),
          targetExpense: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const values = {
          tenantId: ctx.tenantId,
          periodName: input.periodName,
          targetRevenue: input.targetRevenue,
          targetExpense: input.targetExpense,
          notes: input.notes || null,
        };
        if (input.id != null) {
          await db
            .insert(budgets)
            .values({ ...values, id: input.id })
            .onConflictDoUpdate({
              target: budgets.id,
              set: { ...values, id: input.id },
            });
        } else {
          await db.insert(budgets).values(values);
        }
        return { success: true };
      }),

    // Financial Summary & Dashboard Stats
    getDashboardSummary: tenantProcedure.query(async ({ ctx }) => {
      const empty = {
        totalRevenue: 0,
        totalExpense: 0,
        totalAssets: 0,
        netIncome: 0,
        recentTransactions: [] as unknown[],
      };
      if (!ctx.tenantId) return empty;
      const db = await getDb();
      if (!db) return empty;
      const tenantId = ctx.tenantId;

      return cachedForTenant(
        tenantId,
        "dashboardSummary",
        undefined,
        async () => {
          // ØªØ¬Ù…ÙŠØ¹ Ø¯Ø§Ø®Ù„ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ø¯Ù„ ØªØ­Ù…ÙŠÙ„ ÙƒÙ„ Ø§Ù„Ø­Ø±ÙƒØ§Øª ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø©.
          // Ø§Ù„Ø­Ø±ÙƒØ§Øª Ù‚Ø¯ ØªØ¨Ù„Øº Ù…Ø¦Ø§Øª Ø§Ù„Ø¢Ù„Ø§Ù â€” Ø§Ù„ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙƒØ§Ù…Ù„ ÙƒØ§Ù† Ø£Ø¨Ø·Ø£ Ø¨Ù…Ø±Ø§Øª.
          const [totals, recentTransactions] = await Promise.all([
            db
              .select({
                totalRevenue: sql<string>`coalesce(sum(case when ${accounts.type} = 'revenue' then ${transactions.amount} else 0 end), 0)`,
                totalExpense: sql<string>`coalesce(sum(case when ${accounts.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
                totalAssets: sql<string>`coalesce(sum(case when ${accounts.type} = 'asset' then case when ${transactions.type} = 'debit' then ${transactions.amount} else -${transactions.amount} end else 0 end), 0)`,
              })
              .from(transactions)
              .leftJoin(accounts, eq(transactions.accountId, accounts.id))
              .where(
                and(
                  eq(transactions.tenantId, tenantId),
                  eq(transactions.isReversed, false)
                )
              ),
            db
              .select({
                id: transactions.id,
                amount: transactions.amount,
                type: transactions.type,
                accountType: accounts.type,
                accountName: accounts.name,
                transactionDate: transactions.transactionDate,
                narration: transactions.narration,
                lifecycleStatus: transactions.lifecycleStatus,
                isReversed: transactions.isReversed,
              })
              .from(transactions)
              .leftJoin(accounts, eq(transactions.accountId, accounts.id))
              .where(
                and(
                  eq(transactions.tenantId, tenantId),
                  eq(transactions.isReversed, false)
                )
              )
              .orderBy(
                desc(transactions.transactionDate),
                desc(transactions.id)
              )
              .limit(10),
          ]);

          const row = totals[0];
          const totalRevenue = parseFloat(row?.totalRevenue ?? "0") || 0;
          const totalExpense = parseFloat(row?.totalExpense ?? "0") || 0;
          const totalAssets = parseFloat(row?.totalAssets ?? "0") || 0;

          return {
            totalRevenue,
            totalExpense,
            totalAssets,
            netIncome: totalRevenue - totalExpense,
            recentTransactions,
          };
        },
        TENANT_CACHE_TTL.dashboard
      );
    }),

    getMonthlyAnalytics: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId)
        return {
          dailyData: [],
          summary: {
            currentMonthRevenues: 0,
            currentMonthExpenses: 0,
            peakDay: "-",
          },
        };
      const db = await getDb();
      if (!db)
        return {
          dailyData: [],
          summary: {
            currentMonthRevenues: 0,
            currentMonthExpenses: 0,
            peakDay: "-",
          },
        };

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();
      const endOfMonth = new Date(
        currentYear,
        currentMonth + 1,
        0,
        23,
        59,
        59
      ).getTime();

      const allTx = await db
        .select({
          amount: transactions.amount,
          transactionDate: transactions.transactionDate,
          accountType: accounts.type,
          lifecycleStatus: transactions.lifecycleStatus,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(transactions.tenantId, ctx.tenantId!),
            eq(transactions.isReversed, false)
          )
        );

      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const dailyMap: Record<
        number,
        { day: number; dateStr: string; revenues: number; expenses: number }
      > = {};

      for (let d = 1; d <= daysInMonth; d++) {
        const dObj = new Date(currentYear, currentMonth, d);
        dailyMap[d] = {
          day: d,
          dateStr: dObj.toLocaleDateString("en-GB"),
          revenues: 0,
          expenses: 0,
        };
      }

      let currentMonthRevenues = 0;
      let currentMonthExpenses = 0;
      let maxDayVal = -1;
      let peakDay = "-";

      for (const tx of allTx) {
        if (
          tx.lifecycleStatus !== "approved" &&
          tx.lifecycleStatus !== "sent" &&
          tx.lifecycleStatus !== "posted"
        )
          continue;
        if (!tx.transactionDate) continue;
        const txTime = new Date(tx.transactionDate).getTime();
        if (txTime >= startOfMonth && txTime <= endOfMonth) {
          const dNum = new Date(tx.transactionDate).getDate();
          const val = parseFloat(tx.amount || "0");
          if (dailyMap[dNum]) {
            if (tx.accountType === "revenue") {
              dailyMap[dNum].revenues += val;
              currentMonthRevenues += val;
            } else if (tx.accountType === "expense") {
              dailyMap[dNum].expenses += val;
              currentMonthExpenses += val;
            }
          }
        }
      }

      const dailyData = Object.values(dailyMap);
      for (const item of dailyData) {
        const net = item.revenues - item.expenses;
        if (net > maxDayVal) {
          maxDayVal = net;
          peakDay = item.dateStr;
        }
      }

      return {
        dailyData,
        summary: {
          currentMonthRevenues,
          currentMonthExpenses,
          netIncome: currentMonthRevenues - currentMonthExpenses,
          peakDay,
        },
      };
    }),

    // Opening Balances management for new periods
    getOpeningBalances: tenantProcedure
      .input(
        z.object({
          periodName: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        const period = input.periodName || "Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026";
        return await db
          .select()
          .from(openingBalances)
          .where(
            and(
              eq(openingBalances.tenantId, ctx.tenantId!),
              eq(openingBalances.periodName, period)
            )
          );
      }),

    saveOpeningBalances: tenantProcedure
      .input(
        z.object({
          periodName: z.string(),
          balances: z.array(
            z.object({
              accountId: z.number(),
              amount: z.string(),
              type: z.enum(["debit", "credit"]),
              notes: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        for (const item of input.balances) {
          // Upsert by accountId + periodName
          const existing = await db
            .select()
            .from(openingBalances)
            .where(
              and(
                eq(openingBalances.tenantId, ctx.tenantId),
                eq(openingBalances.accountId, item.accountId),
                eq(openingBalances.periodName, input.periodName)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(openingBalances)
              .set({
                amount: item.amount,
                type: item.type,
                notes: item.notes || null,
              })
              .where(eq(openingBalances.id, existing[0].id));
          } else {
            await db.insert(openingBalances).values({
              tenantId: ctx.tenantId,
              accountId: item.accountId,
              periodName: input.periodName,
              amount: item.amount,
              type: item.type,
              notes: item.notes || null,
            });
          }
        }

        await db.insert(activityLogs).values({
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          action: `ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠØ© Ù„Ù„ÙØªØ±Ø©: ${input.periodName}`,
          details: `ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠØ© Ù„Ø¹Ø¯Ø¯ ${input.balances.length} Ø­Ø³Ø§Ø¨`,
        });

        return { success: true };
      }),

    // Period Closing (Ø¥Ù‚ÙØ§Ù„ Ø§Ù„Ø¯ÙˆØ±Ø©) â€” preview balances then post closing entries
    closing: router({
      preview: tenantProcedure
        .input(
          z.object({
            periodName: z.string().default("Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026"),
            asOfDate: z.string().optional(),
          })
        )
        .query(async ({ input, ctx }) => {
          // Public enumeration surface: per-IP burst cap against scrapers.
          // The global trpcLimiter (600/15min in server/_core/app.ts) stays
          // the outer bound; this adds per-minute burst protection.
          const catalogIp = ctx.req.ip || "unknown";
          const catalogRl = checkRateLimit(
            `catalog:${catalogIp}`,
            120,
            60 * 1000
          );
          if (!catalogRl.ok) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: `Ø¹Ø¯Ø¯ ÙƒØ¨ÙŠØ± Ù…Ù† Ø§Ù„Ø·Ù„Ø¨Ø§Øª â€” Ø£Ø¹Ø¯ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ø¨Ø¹Ø¯ ${catalogRl.retryAfterSec} Ø«Ø§Ù†ÙŠØ©.`,
            });
          }
          const db = await getDb();
          if (!db)
            return { rows: [], revenueTotal: 0, expenseTotal: 0, netProfit: 0 };
          const tid = requireTenantId(ctx);
          const asOf = input.asOfDate ? new Date(input.asOfDate) : new Date();

          const allAccounts = await db
            .select()
            .from(accounts)
            .where(
              and(eq(accounts.tenantId, tid), eq(accounts.isActive, true))
            );
          const opening = await db
            .select()
            .from(openingBalances)
            .where(
              and(
                eq(openingBalances.tenantId, tid),
                eq(openingBalances.periodName, input.periodName),
                lte(openingBalances.createdAt, asOf)
              )
            );
          const txns = await db
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.tenantId, tid),
                lte(transactions.transactionDate, asOf),
                eq(transactions.isReversed, false),
                or(
                  isNull(transactions.referenceType),
                  ne(transactions.referenceType, "closing")
                )!
              )
            );

          const balanceOf = new Map<number, number>(); // net = debit - credit
          for (const ob of opening) {
            const cur = balanceOf.get(ob.accountId) ?? 0;
            balanceOf.set(
              ob.accountId,
              cur +
                (ob.type === "debit"
                  ? parseFloat(ob.amount)
                  : -parseFloat(ob.amount))
            );
          }
          for (const t of txns) {
            const v = parseFloat(t.amount || "0");
            const cur = balanceOf.get(t.accountId) ?? 0;
            balanceOf.set(t.accountId, cur + (t.type === "debit" ? v : -v));
          }

          const rows = allAccounts
            .filter(a => Math.abs(balanceOf.get(a.id) ?? 0) > 0.009)
            .map(a => ({
              accountId: a.id,
              code: a.code,
              name: a.name,
              type: a.type,
              balance: Math.abs(balanceOf.get(a.id)!),
              side: (balanceOf.get(a.id)! > 0 ? "debit" : "credit") as
                | "debit"
                | "credit",
            }))
            .sort((x, y) => x.code.localeCompare(y.code));

          const revenueTotal = rows
            .filter(r => r.type === "revenue")
            .reduce((s, r) => s + r.balance, 0);
          const expenseTotal = rows
            .filter(r => r.type === "expense")
            .reduce((s, r) => s + r.balance, 0);
          return {
            rows,
            revenueTotal,
            expenseTotal,
            netProfit: revenueTotal - expenseTotal,
          };
        }),

      execute: tenantProcedure
        .input(
          z.object({
            periodName: z.string().default("Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© 2026"),
            asOfDate: z.string().optional(),
            retainedAccountId: z.number().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          const asOf = input.asOfDate ? new Date(input.asOfDate) : new Date();
          const tid = requireTenantId(ctx);
          await assertPeriodOpen(db, tid, asOf, input.periodName);

          const already = await db
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.tenantId, tid),
                eq(transactions.referenceType, "closing"),
                ilike(transactions.narration, `%${input.periodName}%`)
              )
            )
            .limit(1);
          if (already.length > 0)
            throw new Error(
              `ØªÙ… Ø¥Ù‚ÙØ§Ù„ Ø§Ù„Ø¯ÙˆØ±Ø© "${input.periodName}" Ù…Ø³Ø¨Ù‚Ø§Ù‹ â€” Ø§Ù„Ù‚ÙŠÙˆØ¯ Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªÙƒØ±Ø§Ø±Ù‡Ø§`
            );

          let retainedId = input.retainedAccountId;
          if (!retainedId) {
            const eq3010 = await db
              .select()
              .from(accounts)
              .where(
                and(
                  eq(accounts.tenantId, tid),
                  eq(accounts.code, "3010"),
                  eq(accounts.type, "equity")
                )
              )
              .limit(1);
            const fallback =
              eq3010.length > 0
                ? eq3010[0].id
                : (
                    await db
                      .select()
                      .from(accounts)
                      .where(
                        and(
                          eq(accounts.tenantId, tid),
                          eq(accounts.type, "equity")
                        )
                      )
                      .limit(1)
                  )[0]?.id;
            if (!fallback)
              throw new Error(
                "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø­Ø³Ø§Ø¨ Ø±Ø£Ø³ Ù…Ø§Ù„/Ù†ØªØ§Ø¦Ø¬ â€” Ø£Ù†Ø´Ø¦ Ø­Ø³Ø§Ø¨Ø§Ù‹ Ù…Ù† Ù†ÙˆØ¹ Ø±Ø£Ø³ Ø§Ù„Ù…Ø§Ù„ Ø£ÙˆÙ„Ø§Ù‹"
              );
            retainedId = fallback;
          }

          const allAccounts = await db
            .select()
            .from(accounts)
            .where(eq(accounts.tenantId, tid));
          const opening = await db
            .select()
            .from(openingBalances)
            .where(
              and(
                eq(openingBalances.tenantId, tid),
                eq(openingBalances.periodName, input.periodName),
                lte(openingBalances.createdAt, asOf)
              )
            );
          const txns = await db
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.tenantId, tid),
                lte(transactions.transactionDate, asOf),
                eq(transactions.isReversed, false)
              )
            );

          const balanceOf = new Map<number, number>();
          for (const ob of opening) {
            balanceOf.set(
              ob.accountId,
              (balanceOf.get(ob.accountId) ?? 0) +
                (ob.type === "debit"
                  ? parseFloat(ob.amount)
                  : -parseFloat(ob.amount))
            );
          }
          for (const t of txns) {
            if (t.referenceType === "closing") continue;
            const v = parseFloat(t.amount || "0");
            balanceOf.set(
              t.accountId,
              (balanceOf.get(t.accountId) ?? 0) + (t.type === "debit" ? v : -v)
            );
          }

          const closingRows = allAccounts
            .filter(
              a =>
                (a.type === "revenue" || a.type === "expense") &&
                Math.abs(balanceOf.get(a.id) ?? 0) > 0.009
            )
            .map(a => ({
              account: a,
              balance: Math.abs(balanceOf.get(a.id)!),
              side: (balanceOf.get(a.id)! > 0 ? "debit" : "credit") as
                | "debit"
                | "credit",
            }));

          if (closingRows.length === 0)
            throw new Error(
              "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ø±ØµØ¯Ø© Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø£Ùˆ Ù…ØµØ±ÙˆÙØ§Øª Ù„Ø¥Ù‚ÙØ§Ù„Ù‡Ø§ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ø¯ÙˆØ±Ø©"
            );

          let debitTotal = 0;
          let creditTotal = 0;
          const entries: {
            accountId: number;
            amount: string;
            type: "debit" | "credit";
            narration: string;
          }[] = [];

          for (const row of closingRows) {
            if (row.side === "credit") {
              // Ù…ØµØ±ÙˆÙ Ù„Ù‡ Ø±ØµÙŠØ¯ Ø¯Ø§Ø¦Ù†ØŸ Ø¹ÙƒØ³Ù‡ Ù†Ø¸Ø±ÙŠØ§Ù‹ â€” Ù†Ø¹Ø§Ù…Ù„ Ø­Ø³Ø¨ Ø·Ø¨ÙŠØ¹Ø© Ø§Ù„Ø­Ø³Ø§Ø¨
              if (row.account.type === "expense") continue;
              entries.push({
                accountId: row.account.id,
                amount: row.balance.toFixed(2),
                type: "debit",
                narration: `Ø¥Ù‚ÙØ§Ù„ ${row.account.name}`,
              });
              entries.push({
                accountId: retainedId,
                amount: row.balance.toFixed(2),
                type: "credit",
                narration: `Ø¥Ù‚ÙØ§Ù„ ${row.account.name}`,
              });
              debitTotal += row.balance;
              creditTotal += row.balance;
            } else {
              if (row.account.type === "revenue") continue;
              entries.push({
                accountId: row.account.id,
                amount: row.balance.toFixed(2),
                type: "credit",
                narration: `Ø¥Ù‚ÙØ§Ù„ ${row.account.name}`,
              });
              entries.push({
                accountId: retainedId,
                amount: row.balance.toFixed(2),
                type: "debit",
                narration: `Ø¥Ù‚ÙØ§Ù„ ${row.account.name}`,
              });
              debitTotal += row.balance;
              creditTotal += row.balance;
            }
          }

          if (Math.abs(debitTotal - creditTotal) > 0.01)
            throw new Error("Ø¹Ø¯Ù… ØªÙˆØ§Ø²Ù† Ø§Ù„Ù‚ÙŠÙˆØ¯ â€” Ø±Ø§Ø¬Ø¹ Ø§Ù„Ø£Ø±ØµØ¯Ø© Ù‚Ø¨Ù„ Ø§Ù„Ø¥Ù‚ÙØ§Ù„");

          const narration = `Ø¥Ù‚ÙØ§Ù„ Ø§Ù„Ø¯ÙˆØ±Ø©: ${input.periodName}`;
          const result = await (db as any).transaction(async (tx: any) => {
            for (const e of entries) {
              await tx.insert(transactions).values({
                tenantId: tid,
                accountId: e.accountId,
                amount: e.amount,
                type: e.type,
                transactionDate: asOf,
                narration: `${narration} â€” ${e.narration}`,
                referenceType: "closing",
                lifecycleStatus: "approved",
              });
            }
            await tx.insert(activityLogs).values({
              tenantId: tid,
              userId: ctx.user.id,
              action: `${narration} (${entries.length / 2} Ø­Ø³Ø§Ø¨Ø§Ù‹ØŒ Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ ${debitTotal.toFixed(2)})`,
            });
            return {
              entries: entries.length / 2,
              total: debitTotal,
              retainedAccountId: retainedId,
            };
          });

          // Link the closure to a matching fiscal period and lock it (additive:
          // if no fiscal_period exists for this tenant, nothing changes).
          const matchingPeriods = await db
            .select()
            .from(fiscalPeriods)
            .where(
              and(
                eq(fiscalPeriods.tenantId, tid),
                eq(fiscalPeriods.name, input.periodName)
              )
            )
            .limit(1);
          if (matchingPeriods.length > 0) {
            const p = matchingPeriods[0];
            if (p.status !== "closed") {
              await db
                .update(fiscalPeriods)
                .set({
                  status: "closed",
                  closedAt: new Date(),
                  closedById: ctx.user.id,
                  closingEntryId: p.closingEntryId ?? null,
                })
                .where(eq(fiscalPeriods.id, p.id));
            }
          }

          return result;
        }),
    }),
    runAuditorReview: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        return { status: "OK", score: 100, warnings: [], recommendations: [] };
      const tid = requireTenantId(ctx);

      const allAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.tenantId, tid));
      const allTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tid),
            inArray(transactions.lifecycleStatus, ["approved", "posted"])
          )
        );

      let totalDebits = 0;
      let totalCredits = 0;
      let assetTotal = 0;
      let liabilityTotal = 0;
      let equityTotal = 0;

      const acctMap = new Map(allAccounts.map(a => [a.id, a]));

      for (const tx of allTransactions) {
        const val = parseFloat(tx.amount || "0");
        const acc = acctMap.get(tx.accountId);
        if (!acc) continue;
        if (tx.type === "debit") totalDebits += val;
        else totalCredits += val;

        if (acc.type === "asset")
          assetTotal += tx.type === "debit" ? val : -val;
        if (acc.type === "liability")
          liabilityTotal += tx.type === "credit" ? val : -val;
        if (acc.type === "equity")
          equityTotal += tx.type === "credit" ? val : -val;
      }

      const warnings: string[] = [];
      const recommendations: string[] = [];
      let score = 95;

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        warnings.push(
          "ØªØ­Ø°ÙŠØ± Ù…Ø­Ø§Ø³Ø¨ÙŠ: Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø·Ø±Ø§Ù Ø§Ù„Ù…Ø¯ÙŠÙ† ÙˆØ§Ù„Ø¯Ø§Ø¦Ù† ÙÙŠ Ø§Ù„Ø­Ø±ÙƒØ§Øª Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø© ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚ ØªÙ…Ø§Ù…Ø§Ù‹."
        );
        score -= 20;
      } else {
        recommendations.push(
          "ØªÙˆØ§Ø²Ù† Ø§Ù„Ù‚ÙŠÙˆØ¯ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠØ© Ø³Ù„ÙŠÙ… ÙˆÙ…Ø¹ØªÙ…Ø¯ ÙˆÙÙ‚ Ø§Ù„Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„Ù…Ø²Ø¯ÙˆØ¬Ø©."
        );
      }

      if (assetTotal < liabilityTotal) {
        warnings.push(
          "ØªÙ†Ø¨ÙŠÙ‡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ: Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø®ØµÙˆÙ… ÙŠØªØ¬Ø§ÙˆØ² Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£ØµÙˆÙ„ØŒ Ù…Ù…Ø§ ÙŠØ´ÙŠØ± Ù„Ù…Ø®Ø§Ø·Ø± Ø±Ø£Ø³ Ù…Ø§Ù„ Ø¹Ø§Ù…Ù„."
        );
        score -= 15;
      } else {
        recommendations.push(
          "Ù†Ø³Ø¨Ø© Ø§Ù„Ø£ØµÙˆÙ„ Ø¥Ù„Ù‰ Ø§Ù„Ø®ØµÙˆÙ… Ø¶Ù…Ù† Ø§Ù„Ø­Ø¯ÙˆØ¯ Ø§Ù„Ø¢Ù…Ù†Ø© Ù„ØªØºØ·ÙŠØ© Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…Ø§Øª."
        );
      }

      recommendations.push(
        "ÙŠÙˆØµÙ‰ Ø¨Ø¥Ø¬Ø±Ø§Ø¡ Ù…Ø·Ø§Ø¨Ù‚Ø© Ø´Ù‡Ø±ÙŠØ© Ù„Ù„Ø®Ø²ÙŠÙ†Ø© ÙˆØ§Ù„Ø¨Ù†Ùƒ Ù„Ø¶Ù…Ø§Ù† Ø¹Ø¯Ù… ÙˆØ¬ÙˆØ¯ ÙØ±ÙˆÙ‚Ø§Øª Ù†Ù‚Ø¯ÙŠØ©."
      );
      recommendations.push(
        "ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ Ø¨Ù†Ø¬Ø§Ø­ ÙˆØªØ£Ù…ÙŠÙ† Ø§Ù„Ø­Ø±ÙƒØ§Øª Ø¶Ø¯ Ø£ÙŠ ØªØ¹Ø¯ÙŠÙ„ ØºÙŠØ± Ù…Ø¨Ø±Ø±."
      );

      return {
        status: warnings.length > 0 ? "ØªØªØ·Ù„Ø¨ Ù…Ø±Ø§Ø¬Ø¹Ø©" : "Ù…Ø³ØªÙˆÙÙŠØ© ÙˆÙ…Ø¹ÙŠØ§Ø±ÙŠØ©",
        score,
        warnings,
        recommendations,
        totals: {
          debits: totalDebits,
          credits: totalCredits,
          assets: assetTotal,
          liabilities: liabilityTotal,
        },
      };
    }),

    // Smart Document & Image Parser with AI for Merchant Auditing
    smartParseDocumentOrImage: tenantProcedure
      .input(
        z.object({
          fileUrl: z.string().optional(),
          rawText: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const allAccounts =
          (await (await getDb())?.select().from(accounts)) || [];
        const prompt = `Ø£Ù†Øª Ù…Ø­Ø§Ø³Ø¨ Ù‚Ø§Ù†ÙˆÙ†ÙŠ ÙˆÙ…Ø±Ø§Ø¬Ø¹ Ù…Ø§Ù„ÙŠ Ø®Ø¨ÙŠØ±. Ù‚Ù… Ø¨ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù†Øµ Ø£Ùˆ Ø§Ù„Ù…Ø³ØªÙ†Ø¯ Ø§Ù„Ù…Ø±ÙÙ‚ Ø¨Ø¯Ù‚Ø© Ù…ØªÙ†Ø§Ù‡ÙŠØ© ÙˆØ§Ø³ØªØ®Ø±Ø¬ Ø§Ù„Ø­Ø±ÙƒØ§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ© Ø£Ùˆ Ø§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠØ© Ø¨Ø¯Ù‚Ø© Ø¹Ø§Ù„ÙŠØ©. 
Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø© ÙÙŠ Ø§Ù„Ù†Ø¸Ø§Ù… Ø­Ø§Ù„ÙŠØ§Ù‹ Ù‡ÙŠ:
${allAccounts.map((a: any) => `- ÙƒÙˆØ¯ ${a.code}: ${a.name} (Ù†ÙˆØ¹ ${a.type})`).join("\n")}

Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù…Ø¯Ø®Ù„ Ø£Ùˆ Ø§Ù„Ù…Ø³ØªØ®Ø±Ø¬:
${input.rawText || input.fileUrl || "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù†Øµ"}

Ù‚Ù… Ø¨Ø¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ù†ØªÙŠØ¬Ø© Ø¨ØµÙŠØºØ© JSON Ø­ØµØ±Ø§Ù‹ ØªØªØ¶Ù…Ù† Ù…ØµÙÙˆÙØ© items ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰:
- accountCode (ÙƒÙˆØ¯ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚ Ø¨Ø¯Ù‚Ø©)
- amount (Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø±Ù‚Ù…ÙŠØ©)
- type (debit Ø£Ùˆ credit)
- narration (ÙˆØµÙ Ø§Ù„Ø­Ø±ÙƒØ© Ø£Ùˆ Ø¨ÙŠØ§Ù†Ù‡Ø§)`;

        try {
          const response = await invokeTenantLLM(Number(ctx.tenantId), {
            messages: [{ role: "user", content: prompt }],
            outputSchema: {
              name: "parsed_financial_entries",
              schema: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        accountCode: { type: "string" },
                        amount: { type: "string" },
                        type: { type: "string" },
                        narration: { type: "string" },
                      },
                      required: ["accountCode", "amount", "type"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          });

          const contentVal = response.choices[0]?.message?.content;
          const contentStr =
            typeof contentVal === "string"
              ? contentVal
              : JSON.stringify(contentVal || {});
          const parsed = JSON.parse(contentStr);
          const items = Array.isArray(parsed?.items) ? parsed.items : [];
          if (items.length === 0) {
            return {
              success: false,
              message: "ØªØ¹Ø°Ø± Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø¨Ù†ÙˆØ¯ Ù…Ø§Ù„ÙŠØ© Ù…Ù† Ø§Ù„Ù…Ø³ØªÙ†Ø¯",
              items: [],
            };
          }
          return { success: true, items };
        } catch (e) {
          // Never invent financial data â€” surface the failure for manual review
          console.warn("[smartParse] Parsing failed:", e);
          return {
            success: false,
            message: "ØªØ¹Ø°Ø± ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…Ø³ØªÙ†Ø¯ â€” ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙŠØ¯ÙˆÙŠØ§Ù‹",
            items: [],
          };
        }
      }),

    // AuraLedger Multi-Tenant & Branch Management
    getTenantsAndBranches: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { tenants: [], branches: [] };
      if (!ctx.tenantId) return { tenants: [], branches: [] };
      const userTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId))
        .limit(1);
      if (userTenant.length === 0) {
        return { tenants: [], branches: [] };
      }
      return {
        tenants: userTenant,
        branches: await db
          .select()
          .from(branches)
          .where(eq(branches.tenantId, ctx.tenantId)),
      };
    }),

    createBranch: tenantProcedure
      .input(
        z.object({
          tenantId: z.number(),
          name: z.string(),
          code: z.string(),
          city: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        // Tenant isolation: a branch can only be created under the caller's
        // own tenant â€” never trust a client-supplied tenantId for a write.
        if (input.tenantId !== ctx.tenantId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ù†Ø´Ø§Ø¡ ÙØ±Ø¹ Ø®Ø§Ø±Ø¬ Ù…Ø¤Ø³Ø³ØªÙƒ",
          });
        }
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.insert(branches).values({
          tenantId: ctx.tenantId,
          name: input.name,
          code: input.code,
          city: input.city || null,
          isMain: false,
        });
        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `Ø¥Ø¶Ø§ÙØ© ÙØ±Ø¹ Ø¬Ø¯ÙŠØ¯: ${input.name} (${input.code})`,
          details: `ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙØ±Ø¹ ØªØ­Øª Ø§Ù„Ù…Ø¤Ø³Ø³Ø© Ø±Ù‚Ù… ${ctx.tenantId}`,
        });
        return { success: true };
      }),

    // Custom role & branch permissions management
    getUserPermissions: tenantProcedure
      .input(
        z.object({
          userId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return await db
          .select()
          .from(userBranchPermissions)
          .where(eq(userBranchPermissions.userId, input.userId));
      }),

    saveUserPermission: tenantProcedure
      .input(
        z.object({
          userId: z.number(),
          branchId: z.number(),
          canView: z.boolean(),
          canInsert: z.boolean(),
          canApprove: z.boolean(),
          canPost: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db
          .select()
          .from(userBranchPermissions)
          .where(
            and(
              eq(userBranchPermissions.userId, input.userId),
              eq(userBranchPermissions.branchId, input.branchId)
            )
          );

        if (existing.length > 0) {
          await db
            .update(userBranchPermissions)
            .set({
              canView: input.canView,
              canInsert: input.canInsert,
              canApprove: input.canApprove,
              canPost: input.canPost,
            })
            .where(eq(userBranchPermissions.id, existing[0].id));
        } else {
          await db.insert(userBranchPermissions).values({
            tenantId: ctx.tenantId!,
            userId: input.userId,
            branchId: input.branchId,
            canView: input.canView,
            canInsert: input.canInsert,
            canApprove: input.canApprove,
            canPost: input.canPost,
          });
        }

        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `ØªØ­Ø¯ÙŠØ« ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø±Ù‚Ù… ${input.userId} Ù„Ù„ÙØ±Ø¹ ${input.branchId}`,
          details: `Ø¹Ø±Ø¶: ${input.canView}, Ø¥Ø¯Ø®Ø§Ù„: ${input.canInsert}, Ø§Ø¹ØªÙ…Ø§Ø¯: ${input.canApprove}, ØªØ±Ø­ÙŠÙ„: ${input.canPost}`,
        });

        return { success: true };
      }),

    // Branch Performance Comparison Analytics
    getBranchPerformanceComparison: tenantProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { comparison: [] };
      const allBranches = await db.select().from(branches);
      if (allBranches.length === 0) return { comparison: [] };
      const mainBranchId =
        allBranches.find(b => b.isMain)?.id || allBranches[0].id;

      // Fetch transactions with account type info (single join, no N+1)
      const txRows = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          type: transactions.type,
          branchId: transactions.branchId,
          accountType: accounts.type,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(inArray(transactions.lifecycleStatus, ["approved", "posted"]));

      const branchStats = new Map<
        number,
        { revenue: number; expenses: number; count: number }
      >();
      for (const b of allBranches) {
        branchStats.set(b.id, { revenue: 0, expenses: 0, count: 0 });
      }

      for (const tx of txRows) {
        const amt = parseFloat(tx.amount || "0");
        // Legacy transactions without a branch are attributed to the main branch
        const bid = tx.branchId ?? mainBranchId;
        const stats = branchStats.get(bid);
        if (!stats) continue;
        stats.count++;
        if (tx.accountType === "revenue") {
          stats.revenue += tx.type === "credit" ? amt : -amt;
        } else if (tx.accountType === "expense") {
          stats.expenses += tx.type === "debit" ? amt : -amt;
        }
      }

      const comparison = allBranches.map(b => {
        const stats = branchStats.get(b.id) || {
          revenue: 0,
          expenses: 0,
          count: 0,
        };
        return {
          id: b.id,
          name: b.name,
          code: b.code,
          city: b.city || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯",
          isMain: b.isMain,
          revenue: stats.revenue,
          expenses: stats.expenses,
          netProfit: stats.revenue - stats.expenses,
          transactionsCount: stats.count,
          complianceScore: 90,
        };
      });

      return { comparison };
    }),

    // AI Financial Advisor & Deep Recommendations
    getAiFinancialAdvisorAnalysis: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        return {
          analysis: "Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…ØªÙˆÙØ±Ø© Ø­Ø§Ù„ÙŠØ§Ù‹",
          status: "Ø®Ø·Ø£",
          timestamp: new Date().toISOString(),
        };

      const allTx = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          type: transactions.type,
          accountId: transactions.accountId,
          accountType: accounts.type,
          accountName: accounts.name,
          transactionDate: transactions.transactionDate,
          narration: transactions.narration,
          lifecycleStatus: transactions.lifecycleStatus,
          isReversed: transactions.isReversed,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(eq(transactions.isReversed, false))
        .orderBy(desc(transactions.transactionDate), desc(transactions.id));

      const allAccts = await db.select().from(accounts);
      const allBudgets = await db
        .select()
        .from(budgets)
        .orderBy(desc(budgets.id));

      // â”€â”€ Local statistical analysis (LLM-free, always available) â”€â”€
      const approved = allTx.filter(
        t => t.lifecycleStatus === "approved" || t.lifecycleStatus === "posted"
      );
      let totalRevenue = 0;
      let totalExpense = 0;
      const byAccount: Record<
        number,
        { name: string; code: string; revenue: number; expense: number }
      > = {};
      const accountMeta = new Map<number, { name: string; code: string }>();

      for (const a of allAccts) {
        accountMeta.set(a.id, { name: a.name, code: a.code });
        byAccount[a.id] = {
          name: a.name,
          code: a.code,
          revenue: 0,
          expense: 0,
        };
      }

      for (const tx of approved) {
        const amt = parseFloat(tx.amount || "0");
        const key = tx.accountId ?? -1;
        if (!byAccount[key])
          byAccount[key] = {
            name: tx.accountName || "Ø­Ø³Ø§Ø¨ ØºÙŠØ± Ù…Ø­Ø¯Ø¯",
            code: "",
            revenue: 0,
            expense: 0,
          };
        if (tx.accountType === "revenue") {
          totalRevenue += amt;
          byAccount[key].revenue += amt;
        } else if (tx.accountType === "expense") {
          totalExpense += amt;
          byAccount[key].expense += amt;
        }
      }

      const netIncome = totalRevenue - totalExpense;
      const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
      const expenseRatio =
        totalRevenue > 0 ? (totalExpense / totalRevenue) * 100 : 0;

      const topRevenue = Object.values(byAccount)
        .filter(a => a.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);
      const topExpense = Object.values(byAccount)
        .filter(a => a.expense > 0)
        .sort((a, b) => b.expense - a.expense)
        .slice(0, 3);

      const cashAccounts = allAccts.filter(
        a =>
          a.type === "asset" && (a.code === "1010" || a.code.startsWith("1020"))
      );
      let cashBalance = 0;
      for (const tx of approved) {
        if (!tx.accountId || !tx.accountType || tx.accountType !== "asset")
          continue;
        if (!cashAccounts.some(c => c.id === tx.accountId)) continue;
        const amt = parseFloat(tx.amount || "0");
        cashBalance += tx.type === "debit" ? amt : -amt;
      }

      let budgetLine =
        "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø®Ø·Ø· Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ù…Ø¶Ø§ÙØ© Ø¨Ø¹Ø¯ â€” Ø£Ø¶Ù Ø®Ø·Ø© Ù…Ù† ØªØ¨ÙˆÙŠØ¨ Ø§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª Ù„Ù…Ø±Ø§Ù‚Ø¨Ø© Ø§Ù„Ø£Ø¯Ø§Ø¡ Ù…Ù‚Ø§Ø¨Ù„ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù.";
      if (allBudgets.length > 0) {
        const latest = allBudgets[0];
        const revTarget = parseFloat(String(latest.targetRevenue || "0"));
        const expTarget = parseFloat(String(latest.targetExpense || "0"));
        const revPct =
          revTarget > 0 ? Math.round((totalRevenue / revTarget) * 100) : 0;
        const expPct =
          expTarget > 0 ? Math.round((totalExpense / expTarget) * 100) : 0;
        budgetLine = `Ø®Ø·Ø© Â«${latest.periodName}Â»: ØªØ­Ù‚Ù‚ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ${revPct}% Ù…Ù† Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØŒ ÙˆØ§Ù„Ù…ØµØ±ÙˆÙØ§Øª ${expPct}% Ù…Ù† Ø§Ù„Ø³Ù‚Ù Ø§Ù„Ù…Ø®ØµØµ.`;
      }

      const fmt = (n: number) => n.toLocaleString("en-US");
      const topRevenueLine = topRevenue.length
        ? topRevenue
            .map(a => `â€¢ ${a.code} ${a.name}: ${fmt(a.revenue)}`)
            .join("\n")
        : "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ù…Ø¹ØªÙ…Ø¯Ø© Ù…Ø³Ø¬Ù„Ø© Ø¨Ø¹Ø¯.";
      const topExpenseLine = topExpense.length
        ? topExpense
            .map(a => `â€¢ ${a.code} ${a.name}: ${fmt(a.expense)}`)
            .join("\n")
        : "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ØµØ±ÙˆÙØ§Øª Ù…Ø¹ØªÙ…Ø¯Ø© Ù…Ø³Ø¬Ù„Ø© Ø¨Ø¹Ø¯.";

      const recommendations: string[] = [];
      if (totalRevenue === 0 && totalExpense === 0) {
        recommendations.push(
          "Ø§Ø¨Ø¯Ø£ Ø¨ØªØ³Ø¬ÙŠÙ„ Ø£ÙˆÙ„ Ø­Ø±ÙƒØ© Ù…Ø§Ù„ÙŠØ© Ù…Ø¹ØªÙ…Ø¯Ø© (Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø£Ùˆ Ù…ØµØ±ÙˆÙØ§Øª) Ø¹Ø¨Ø± Ø£Ø¯Ø§Ø© Ø§Ù„Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ø³Ø±ÙŠØ¹ â€” Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ÙƒØ§Ù…Ù„ ÙŠØ¨Ø¯Ø£ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¹Ù†Ø¯ ØªÙˆÙØ± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª."
        );
      } else {
        if (cashBalance < totalExpense * 0.15 && totalExpense > 0) {
          recommendations.push(
            `Ø§Ù„Ø³ÙŠÙˆÙ„Ø© Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© (${fmt(cashBalance)}) Ø£Ù‚Ù„ Ù…Ù† 15% Ù…Ù† Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª â€” Ø¹Ø¬Ù‘Ù„ ØªØ­ØµÙŠÙ„ Ø§Ù„Ø°Ù…Ù… ÙˆØ­Ø¯Ù‘ Ù…Ù† Ø§Ù„Ø³Ø­ÙˆØ¨Ø§Øª ØºÙŠØ± Ø§Ù„Ù…Ø®Ø·Ø· Ù„Ù‡Ø§ Ù„ØªØºØ·ÙŠØ© Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…Ø§Øª Ø§Ù„Ù‚Ø§Ø¯Ù…Ø©.`
          );
        } else if (totalExpense > 0) {
          recommendations.push(
            `Ø§Ù„Ø³ÙŠÙˆÙ„Ø© Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ© (${fmt(cashBalance)}) ØªØºØ·ÙŠ Ø§Ù„ØªØ²Ø§Ù…Ø§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ â€” Ø­Ø§ÙØ¸ Ø¹Ù„Ù‰ Ù‡Ø§Ù…Ø´ Ø§Ø­ØªÙŠØ§Ø·ÙŠ Ù„Ø§ ÙŠÙ‚Ù„ Ø¹Ù† Ø´Ù‡Ø± Ù…ØµØ±ÙˆÙØ§Øª.`
          );
        }
        if (expenseRatio > 70) {
          recommendations.push(
            `Ù†Ø³Ø¨Ø© Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø¥Ù„Ù‰ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ${expenseRatio.toFixed(0)}% ØªØªØ¬Ø§ÙˆØ² Ø§Ù„Ø­Ø¯ Ø§Ù„ØµØ­ÙŠ (70%) â€” Ø±Ø§Ø¬Ø¹ Ø¨Ù†ÙˆØ¯ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ÙƒØ¨Ø±Ù‰ Ø§Ù„ØªØ§Ù„ÙŠØ© Ù„Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªÙØ§ÙˆØ¶ Ø£Ùˆ Ø§Ù„ØªØ±Ø´ÙŠØ¯: ${topExpense.map(a => a.name).join("ØŒ ")}.`
          );
        } else if (margin > 15) {
          recommendations.push(
            `Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­ Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠ ${margin.toFixed(1)}% Ù‚ÙˆÙŠ â€” ÙˆØ¬Ù‘Ù‡ Ø§Ù„ÙØ§Ø¦Ø¶ Ù†Ø­Ùˆ Ø­Ø³Ø§Ø¨ Ù†Ù‚Ø¯ÙŠ/Ø§Ø³ØªØ«Ù…Ø§Ø±ÙŠ Ù…Ù†ÙØµÙ„ Ø£Ùˆ ØªØ®ÙÙŠØ¶ ØªÙƒÙ„ÙØ© Ø§Ù„ØªÙ…ÙˆÙŠÙ„ Ø¥Ø°Ø§ ÙˆÙØ¬Ø¯ Ù‚Ø±Ø¶.`
          );
        } else {
          recommendations.push(
            `Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­ ${margin.toFixed(1)}% Ù…Ù‚Ø¨ÙˆÙ„ â€” Ø±ÙƒÙ‘Ø² Ø¹Ù„Ù‰ Ù†Ù…Ùˆ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø¹Ø¨Ø± Ø£ÙƒØ¨Ø± 3 Ù…ØµØ§Ø¯Ø± Ø­Ø§Ù„ÙŠØ§Ù‹ Ø«Ù… Ø¹Ù„Ù‰ ØªØ«Ø¨ÙŠØª ØªÙƒÙ„ÙØ© Ø§Ù„ØªØ´ØºÙŠÙ„ Ø¹Ù†Ø¯ Ù…Ø³ØªÙˆØ§Ù‡Ø§ Ø§Ù„Ø­Ø§Ù„ÙŠ.`
          );
        }
        if (topExpense.length > 0) {
          recommendations.push(
            `ØªØ§Ø¨Ø¹ Ø´Ù‡Ø±ÙŠØ§Ù‹ Ø§Ù„Ø¨Ù†ÙˆØ¯ Ø§Ù„Ø«Ù„Ø§Ø«Ø© Ø§Ù„Ø£ÙƒØ¨Ø± (${topExpense.map(a => a.name).join("ØŒ ")}) â€” Ø®ÙØ¶ 5% Ù…Ù†Ù‡Ø§ ÙŠÙˆÙÙ‘Ø± ${fmt(totalExpense * 0.05)} Ø³Ù†ÙˆÙŠØ§Ù‹ ØªÙ‚Ø±ÙŠØ¨Ø§Ù‹.`
          );
        }
      }

      const analysisText = [
        "â”â”â”€ Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ø§Ù„ØªÙ†ÙÙŠØ°ÙŠ â”€â”â”",
        totalRevenue === 0 && totalExpense === 0
          ? "Ø§Ù„Ù…Ù†ØµØ© Ø¬Ø§Ù‡Ø²Ø© ÙˆØ§Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø§Ù„ÙŠ Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø£ÙˆÙ„ Ø­Ø±ÙƒØ© Ù…Ø¹ØªÙ…Ø¯Ø©."
          : `Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©: ${fmt(totalRevenue)}\nØ¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©: ${fmt(totalExpense)}\nØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„ Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠ: ${fmt(netIncome)} (Ù‡Ø§Ù…Ø´ ${margin.toFixed(1)}%)\nÙ†Ø³Ø¨Ø© Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø¥Ù„Ù‰ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª: ${expenseRatio.toFixed(0)}%`,
        "",
        "â”â”â”€ Ù…ØµØ§Ø¯Ø± Ø§Ù„ØªØ¯ÙÙ‚ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© â”€â”â”",
        topRevenueLine,
        "",
        "â”â”â”€ Ø£ÙƒØ¨Ø± Ø¨Ù†ÙˆØ¯ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª â”€â”â”",
        topExpenseLine,
        "",
        "â”â”â”€ Ø§Ù„Ø³ÙŠÙˆÙ„Ø© ÙˆØ§Ù„ÙƒÙØ§Ø¡Ø© â”€â”â”",
        `Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ù†Ù‚Ø¯ÙŠ (Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ + Ø§Ù„Ø¨Ù†ÙˆÙƒ): ${fmt(cashBalance)}`,
        budgetLine,
        "",
        "â”â”â”€ Ø§Ù„ØªÙˆØµÙŠØ§Øª Ø§Ù„Ø°ÙƒÙŠØ© (3) â”€â”â”",
        recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n"),
      ].join("\n");

      // â”€â”€ LLM enhancement (only when Forge/OpenAI key is configured) â”€â”€
      const tenantAIProvider = ctx.tenantId
        ? await getTenantAIProvider(Number(ctx.tenantId))
        : null;
      if (tenantAIProvider || ENV.forgeApiKey) {
        try {
          const response = await invokeTenantLLM(Number(ctx.tenantId), {
            messages: [
              {
                role: "user",
                content: `Ø£Ù†Øª Â«Ø£Ù„ÙŠØ§Ø³Â» (ALIAS AI)ØŒ Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ø°ÙƒÙŠ Ø§Ù„Ø±Ø³Ù…ÙŠ Ù„Ù†Ø¸Ø§Ù… ALHUSAINIA Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠ. Ø¥Ù„ÙŠÙƒ Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø§Ù„ÙŠØ© Ù…Ø­Ø³ÙˆØ¨Ø© Ø¨Ø¯Ù‚Ø© ØªØ´ØºÙŠÙ„ÙŠØ©ØŒ ÙÙ‚Ø¯Ù… ØªØ­Ù„ÙŠÙ„Ø§Ù‹ Ø£Ø¹Ù…Ù‚ Ù…Ø¨Ù†ÙŠØ§Ù‹ Ø¹Ù„ÙŠÙ‡Ø§ Ø­ØµØ±Ø§Ù‹ (Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©ØŒ Ø£Ø³Ù„ÙˆØ¨ Ù…Ù‡Ù†ÙŠ):
${analysisText}
Ù…Ù„Ø§Ø­Ø¸Ø©: Ù„Ø§ ØªØ®ØªÙ„Ù‚ Ø£Ø±Ù‚Ø§Ù…Ø§Ù‹Ø› Ø§Ø¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ù…Ø§ ÙˆØ±Ø¯ ÙÙ‚Ø·.`,
              },
            ],
          });
          const content = response.choices[0]?.message?.content;
          if (typeof content === "string" && content.trim().length > 20) {
            return {
              analysis: content,
              status: "ØªØ­Ù„ÙŠÙ„ Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ (Forge LLM)",
              timestamp: new Date().toISOString(),
            };
          }
        } catch {
          // fall through to the local statistical analysis
        }
      }

      return {
        analysis: analysisText,
        status:
          tenantAIProvider || ENV.forgeApiKey
            ? "ØªØ­Ù„ÙŠÙ„ Ø¥Ø­ØµØ§Ø¦ÙŠ Ù…Ø­Ù„ÙŠ (ØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù€ LLM)"
            : "ØªØ­Ù„ÙŠÙ„ Ø¥Ø­ØµØ§Ø¦ÙŠ Ù…Ø­Ù„ÙŠ Ù…Ø¹ØªÙ…Ø¯",
        timestamp: new Date().toISOString(),
      };
    }),
  }),

  // â”€â”€â”€ Offline-First Sync Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sync: router({
    // Get all data for offline cache (full snapshot)
    getFullSnapshot: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId)
        return {
          accounts: [],
          transactions: [],
          settings: null,
          budgets: [],
          openingBalances: [],
          branches: [],
          tenants: [],
          products: [],
          warehouses: [],
          inventoryMovements: [],
          customers: [],
          suppliers: [],
          salesInvoices: [],
          salesInvoiceItems: [],
          purchaseInvoices: [],
          purchaseInvoiceItems: [],
          orders: [],
          orderItems: [],
          payments: [],
          activityLogs: [],
        };

      const tid = ctx.tenantId!;
      // Subqueries selecting only THIS tenant's parent document ids so that
      // child line-item tables (which have no tenantId column of their own)
      // are still strictly scoped.
      const tenantSalesIds = db
        .select({ id: salesInvoices.id })
        .from(salesInvoices)
        .where(eq(salesInvoices.tenantId, tid));
      const tenantPurchaseIds = db
        .select({ id: purchaseInvoices.id })
        .from(purchaseInvoices)
        .where(eq(purchaseInvoices.tenantId, tid));
      const tenantOrderIds = db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.tenantId, tid));

      const [
        allAccounts,
        allTransactions,
        settingsData,
        allBudgets,
        allOpeningBalances,
        allBranches,
        allTenants,
        allProducts,
        allWarehouses,
        allInventoryMovements,
        allCustomers,
        allSuppliers,
        allSalesInvoices,
        allSalesItems,
        allPurchaseInvoices,
        allPurchaseItems,
        allOrders,
        allOrderItems,
        allPayments,
        allActivityLogs,
      ] = await Promise.all([
        db
          .select()
          .from(accounts)
          .where(eq(accounts.tenantId, tid))
          .orderBy(asc(accounts.code)),
        db
          .select()
          .from(transactions)
          .where(eq(transactions.tenantId, tid))
          .orderBy(desc(transactions.id))
          .limit(500),
        db.select().from(settings).where(eq(settings.tenantId, tid)).limit(1),
        db
          .select()
          .from(budgets)
          .where(eq(budgets.tenantId, tid))
          .orderBy(desc(budgets.id)),
        db
          .select()
          .from(openingBalances)
          .where(eq(openingBalances.tenantId, tid)),
        db.select().from(branches).where(eq(branches.tenantId, tid)),
        db.select().from(tenants).where(eq(tenants.id, tid)),
        db
          .select()
          .from(products)
          .where(and(eq(products.tenantId, tid), isNull(products.deletedAt)))
          .orderBy(asc(products.code)),
        db.select().from(warehouses).where(eq(warehouses.tenantId, tid)),
        db
          .select()
          .from(inventoryMovements)
          .where(eq(inventoryMovements.tenantId, tid))
          .orderBy(desc(inventoryMovements.createdAt))
          .limit(500),
        db
          .select()
          .from(customers)
          .where(and(eq(customers.tenantId, tid), isNull(customers.deletedAt)))
          .orderBy(asc(customers.code)),
        db
          .select()
          .from(suppliers)
          .where(and(eq(suppliers.tenantId, tid), isNull(suppliers.deletedAt)))
          .orderBy(asc(suppliers.code)),
        db
          .select()
          .from(salesInvoices)
          .where(eq(salesInvoices.tenantId, tid))
          .orderBy(desc(salesInvoices.createdAt))
          .limit(200),
        db
          .select()
          .from(salesInvoiceItems)
          .where(inArray(salesInvoiceItems.invoiceId, tenantSalesIds)),
        db
          .select()
          .from(purchaseInvoices)
          .where(eq(purchaseInvoices.tenantId, tid))
          .orderBy(desc(purchaseInvoices.createdAt))
          .limit(200),
        db
          .select()
          .from(purchaseInvoiceItems)
          .where(inArray(purchaseInvoiceItems.invoiceId, tenantPurchaseIds)),
        db
          .select()
          .from(orders)
          .where(eq(orders.tenantId, tid))
          .orderBy(desc(orders.createdAt))
          .limit(200),
        db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, tenantOrderIds)),
        db
          .select()
          .from(payments)
          .where(eq(payments.tenantId, tid))
          .orderBy(desc(payments.createdAt))
          .limit(500),
        db
          .select()
          .from(activityLogs)
          .where(eq(activityLogs.tenantId, tid))
          .orderBy(desc(activityLogs.createdAt))
          .limit(200),
      ]);

      return {
        accounts: allAccounts,
        transactions: allTransactions,
        settings: settingsData[0] || null,
        budgets: allBudgets,
        openingBalances: allOpeningBalances,
        branches: allBranches,
        tenants: allTenants,
        products: allProducts,
        warehouses: allWarehouses,
        inventoryMovements: allInventoryMovements,
        customers: allCustomers,
        suppliers: allSuppliers,
        salesInvoices: allSalesInvoices,
        salesInvoiceItems: allSalesItems,
        purchaseInvoices: allPurchaseInvoices,
        purchaseInvoiceItems: allPurchaseItems,
        orders: allOrders,
        orderItems: allOrderItems,
        payments: allPayments,
        activityLogs: allActivityLogs,
        serverTime: new Date().toISOString(),
      };
    }),

    // Push batch of offline mutations (for bulk sync)
    pushMutations: tenantProcedure
      .input(
        z.object({
          mutations: z.array(
            z.object({
              table: z.string(),
              operation: z.enum(["create", "update", "delete"]),
              recordId: z.string(),
              payload: z.any(),
              timestamp: z.number(),
              deviceId: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const results: {
          recordId: string;
          status: string;
          serverId?: number;
          error?: string;
        }[] = [];

        for (const mutation of input.mutations) {
          try {
            if (mutation.table === "accounts") {
              if (mutation.operation === "create") {
                const inserted = await db
                  .insert(accounts)
                  .values({
                    ...mutation.payload,
                    tenantId: ctx.tenantId,
                    isCustom: true,
                  })
                  .returning();
                results.push({
                  recordId: mutation.recordId,
                  status: "ok",
                  serverId: inserted[0]?.id,
                });
              } else if (
                mutation.operation === "update" &&
                mutation.payload.id
              ) {
                await db
                  .update(accounts)
                  .set({
                    name: mutation.payload.name,
                    code: mutation.payload.code,
                    type: mutation.payload.type,
                    isActive: mutation.payload.isActive,
                    parentAccountId: mutation.payload.parentAccountId,
                  })
                  .where(
                    and(
                      eq(accounts.id, mutation.payload.id),
                      eq(accounts.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              } else if (
                mutation.operation === "delete" &&
                mutation.payload.id
              ) {
                await db
                  .delete(accounts)
                  .where(
                    and(
                      eq(accounts.id, mutation.payload.id),
                      eq(accounts.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "transactions") {
              if (mutation.operation === "create") {
                const inserted = await db
                  .insert(transactions)
                  .values({
                    tenantId: ctx.tenantId,
                    accountId: mutation.payload.accountId,
                    amount: mutation.payload.amount,
                    type: mutation.payload.type,
                    transactionDate: new Date(mutation.payload.transactionDate),
                    narration: mutation.payload.narration,
                    notes: mutation.payload.notes,
                    lifecycleStatus:
                      mutation.payload.lifecycleStatus || "saved",
                    isReversed: false,
                    userId: ctx.user.id,
                  })
                  .returning();
                results.push({
                  recordId: mutation.recordId,
                  status: "ok",
                  serverId: inserted[0]?.id,
                });
              } else if (
                mutation.operation === "update" &&
                mutation.payload.id
              ) {
                await db
                  .update(transactions)
                  .set({
                    amount: mutation.payload.amount,
                    narration: mutation.payload.narration,
                    notes: mutation.payload.notes,
                    lifecycleStatus: mutation.payload.lifecycleStatus,
                  })
                  .where(
                    and(
                      eq(transactions.id, mutation.payload.id),
                      eq(transactions.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              } else if (
                mutation.operation === "delete" &&
                mutation.payload.id
              ) {
                await db
                  .delete(transactions)
                  .where(
                    and(
                      eq(transactions.id, mutation.payload.id),
                      eq(transactions.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "settings") {
              const existing = await db
                .select()
                .from(settings)
                .where(eq(settings.tenantId, ctx.tenantId!))
                .limit(1);
              if (existing.length > 0) {
                await db
                  .update(settings)
                  .set({ ...mutation.payload, tenantId: ctx.tenantId })
                  .where(
                    and(
                      eq(settings.id, existing[0].id),
                      eq(settings.tenantId, ctx.tenantId!)
                    )
                  );
              } else {
                await db
                  .insert(settings)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId });
              }
              results.push({ recordId: mutation.recordId, status: "ok" });
            } else if (mutation.table === "budgets") {
              if (mutation.operation === "create") {
                await db
                  .insert(budgets)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId });
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "openingBalances") {
              if (
                mutation.operation === "create" ||
                mutation.operation === "update"
              ) {
                const existing = await db
                  .select()
                  .from(openingBalances)
                  .where(
                    and(
                      eq(openingBalances.tenantId, ctx.tenantId!),
                      eq(openingBalances.accountId, mutation.payload.accountId),
                      eq(
                        openingBalances.periodName,
                        mutation.payload.periodName
                      )
                    )
                  )
                  .limit(1);
                if (existing.length > 0) {
                  await db
                    .update(openingBalances)
                    .set({
                      amount: mutation.payload.amount,
                      type: mutation.payload.type,
                      notes: mutation.payload.notes,
                    })
                    .where(
                      and(
                        eq(openingBalances.id, existing[0].id),
                        eq(openingBalances.tenantId, ctx.tenantId!)
                      )
                    );
                } else {
                  await db
                    .insert(openingBalances)
                    .values({ ...mutation.payload, tenantId: ctx.tenantId });
                }
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "products") {
              if (mutation.operation === "create") {
                await db.insert(products).values({
                  ...mutation.payload,
                  tenantId: ctx.tenantId,
                  currentStock: mutation.payload.currentStock ?? 0,
                });
                results.push({ recordId: mutation.recordId, status: "ok" });
              } else if (
                mutation.operation === "update" &&
                mutation.payload.id
              ) {
                await db
                  .update(products)
                  .set(mutation.payload)
                  .where(
                    and(
                      eq(products.id, mutation.payload.id),
                      eq(products.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              } else if (
                mutation.operation === "delete" &&
                mutation.payload.id
              ) {
                await db
                  .update(products)
                  .set({ deletedAt: new Date() })
                  .where(
                    and(
                      eq(products.id, mutation.payload.id),
                      eq(products.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "customers") {
              if (mutation.operation === "create") {
                await db.insert(customers).values({
                  ...mutation.payload,
                  tenantId: ctx.tenantId,
                  balance: mutation.payload.balance ?? "0",
                });
                results.push({ recordId: mutation.recordId, status: "ok" });
              } else if (
                mutation.operation === "update" &&
                mutation.payload.id
              ) {
                await db
                  .update(customers)
                  .set(mutation.payload)
                  .where(
                    and(
                      eq(customers.id, mutation.payload.id),
                      eq(customers.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              } else if (
                mutation.operation === "delete" &&
                mutation.payload.id
              ) {
                await db
                  .update(customers)
                  .set({ deletedAt: new Date() })
                  .where(
                    and(
                      eq(customers.id, mutation.payload.id),
                      eq(customers.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "suppliers") {
              if (mutation.operation === "create") {
                await db.insert(suppliers).values({
                  ...mutation.payload,
                  tenantId: ctx.tenantId,
                  balance: mutation.payload.balance ?? "0",
                });
                results.push({ recordId: mutation.recordId, status: "ok" });
              } else if (
                mutation.operation === "update" &&
                mutation.payload.id
              ) {
                await db
                  .update(suppliers)
                  .set(mutation.payload)
                  .where(
                    and(
                      eq(suppliers.id, mutation.payload.id),
                      eq(suppliers.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              } else if (
                mutation.operation === "delete" &&
                mutation.payload.id
              ) {
                await db
                  .update(suppliers)
                  .set({ deletedAt: new Date() })
                  .where(
                    and(
                      eq(suppliers.id, mutation.payload.id),
                      eq(suppliers.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "warehouses") {
              if (mutation.operation === "create") {
                await db
                  .insert(warehouses)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId });
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "inventoryMovements") {
              if (mutation.operation === "create") {
                await db
                  .insert(inventoryMovements)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId });
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "salesInvoices") {
              if (mutation.operation === "create") {
                const inserted = await db
                  .insert(salesInvoices)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId })
                  .returning();
                results.push({
                  recordId: mutation.recordId,
                  status: "ok",
                  serverId: inserted[0]?.id,
                });
              } else if (
                mutation.operation === "update" &&
                mutation.payload.id
              ) {
                await db
                  .update(salesInvoices)
                  .set(mutation.payload)
                  .where(
                    and(
                      eq(salesInvoices.id, mutation.payload.id),
                      eq(salesInvoices.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "salesInvoiceItems") {
              if (mutation.operation === "create") {
                await db
                  .insert(salesInvoiceItems)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId });
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "purchaseInvoices") {
              if (mutation.operation === "create") {
                const inserted = await db
                  .insert(purchaseInvoices)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId })
                  .returning();
                results.push({
                  recordId: mutation.recordId,
                  status: "ok",
                  serverId: inserted[0]?.id,
                });
              } else if (
                mutation.operation === "update" &&
                mutation.payload.id
              ) {
                await db
                  .update(purchaseInvoices)
                  .set(mutation.payload)
                  .where(
                    and(
                      eq(purchaseInvoices.id, mutation.payload.id),
                      eq(purchaseInvoices.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "purchaseInvoiceItems") {
              if (mutation.operation === "create") {
                await db
                  .insert(purchaseInvoiceItems)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId });
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "orders") {
              if (mutation.operation === "create") {
                if (mutation.payload.idempotencyKey) {
                  const existing = await db
                    .select()
                    .from(orders)
                    .where(
                      eq(orders.idempotencyKey, mutation.payload.idempotencyKey)
                    )
                    .limit(1);
                  if (existing.length > 0) {
                    results.push({
                      recordId: mutation.recordId,
                      status: "ok",
                      serverId: existing[0].id,
                    });
                    continue;
                  }
                }
                const inserted = await db
                  .insert(orders)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId })
                  .returning();
                results.push({
                  recordId: mutation.recordId,
                  status: "ok",
                  serverId: inserted[0]?.id,
                });
              } else if (
                mutation.operation === "update" &&
                mutation.payload.id
              ) {
                await db
                  .update(orders)
                  .set(mutation.payload)
                  .where(
                    and(
                      eq(orders.id, mutation.payload.id),
                      eq(orders.tenantId, ctx.tenantId!)
                    )
                  );
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "orderItems") {
              if (mutation.operation === "create") {
                await db
                  .insert(orderItems)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId });
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "payments") {
              if (mutation.operation === "create") {
                if (mutation.payload.idempotencyKey) {
                  const existing = await db
                    .select()
                    .from(payments)
                    .where(
                      eq(
                        payments.idempotencyKey,
                        mutation.payload.idempotencyKey
                      )
                    )
                    .limit(1);
                  if (existing.length > 0) {
                    results.push({
                      recordId: mutation.recordId,
                      status: "ok",
                      serverId: existing[0].id,
                    });
                    continue;
                  }
                }
                await db
                  .insert(payments)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId });
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            } else if (mutation.table === "branches") {
              if (mutation.operation === "create") {
                await db
                  .insert(branches)
                  .values({ ...mutation.payload, tenantId: ctx.tenantId });
                results.push({ recordId: mutation.recordId, status: "ok" });
              }
            }

            // Log activity
            await db.insert(activityLogs).values({
              userId: ctx.user.id,
              userName: ctx.user.name,
              action: `Ù…Ø²Ø§Ù…Ù†Ø© (${mutation.operation}) - ${mutation.table}`,
              details: `Device: ${mutation.deviceId} | Record: ${mutation.recordId}`,
            });
          } catch (error: any) {
            results.push({
              recordId: mutation.recordId,
              status: "error",
              error: error.message || "Unknown error",
            });
          }
        }

        return {
          results,
          serverTime: new Date().toISOString(),
          accepted: results.filter(r => r.status === "ok").length,
          rejected: results.filter(r => r.status === "error").length,
        };
      }),

    // Get changes since a timestamp (incremental sync)
    getChangesSince: tenantProcedure
      .input(
        z.object({
          since: z.string().datetime(),
          tables: z.array(z.string()).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return { changes: {}, serverTime: new Date().toISOString() };
        if (!ctx.tenantId)
          return { changes: {}, serverTime: new Date().toISOString() };

        const sinceDate = new Date(input.since);
        const tablesToSync = input.tables || [
          "accounts",
          "transactions",
          "settings",
          "budgets",
          "openingBalances",
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
          "activityLogs",
          "branches",
          "tenants",
          "warehouseStock",
          "inventoryBatches",
          "stockReservations",
          "cycleCounts",
          "cycleCountLines",
          "inventoryValuationLayers",
        ];
        const changes: Record<string, any[]> = {};

        const tid = ctx.tenantId!;
        const tenantSalesIds = db
          .select({ id: salesInvoices.id })
          .from(salesInvoices)
          .where(eq(salesInvoices.tenantId, tid));
        const tenantPurchaseIds = db
          .select({ id: purchaseInvoices.id })
          .from(purchaseInvoices)
          .where(eq(purchaseInvoices.tenantId, tid));
        const tenantOrderIds = db
          .select({ id: orders.id })
          .from(orders)
          .where(eq(orders.tenantId, tid));

        for (const table of tablesToSync) {
          switch (table) {
            case "accounts":
              changes.accounts = await db
                .select()
                .from(accounts)
                .where(
                  and(
                    eq(accounts.tenantId, tid),
                    gte(accounts.updatedAt, sinceDate)
                  )
                );
              break;
            case "transactions":
              changes.transactions = await db
                .select()
                .from(transactions)
                .where(
                  and(
                    eq(transactions.tenantId, tid),
                    gte(transactions.updatedAt, sinceDate)
                  )
                );
              break;
            case "settings":
              changes.settings = await db
                .select()
                .from(settings)
                .where(eq(settings.tenantId, tid));
              break;
            case "budgets":
              changes.budgets = await db
                .select()
                .from(budgets)
                .where(
                  and(
                    eq(budgets.tenantId, tid),
                    gte(budgets.createdAt, sinceDate)
                  )
                );
              break;
            case "openingBalances":
              changes.openingBalances = await db
                .select()
                .from(openingBalances)
                .where(
                  and(
                    eq(openingBalances.tenantId, tid),
                    gte(openingBalances.createdAt, sinceDate)
                  )
                );
              break;
            case "products":
              changes.products = await db
                .select()
                .from(products)
                .where(
                  and(
                    eq(products.tenantId, tid),
                    gte(products.updatedAt, sinceDate),
                    isNull(products.deletedAt)
                  )
                );
              break;
            case "warehouses":
              changes.warehouses = await db
                .select()
                .from(warehouses)
                .where(
                  and(
                    eq(warehouses.tenantId, tid),
                    gte(warehouses.createdAt, sinceDate)
                  )
                );
              break;
            case "inventoryMovements":
              changes.inventoryMovements = await db
                .select()
                .from(inventoryMovements)
                .where(
                  and(
                    eq(inventoryMovements.tenantId, tid),
                    gte(inventoryMovements.createdAt, sinceDate)
                  )
                );
              break;
            case "customers":
              changes.customers = await db
                .select()
                .from(customers)
                .where(
                  and(
                    eq(customers.tenantId, tid),
                    gte(customers.updatedAt, sinceDate),
                    isNull(customers.deletedAt)
                  )
                );
              break;
            case "suppliers":
              changes.suppliers = await db
                .select()
                .from(suppliers)
                .where(
                  and(
                    eq(suppliers.tenantId, tid),
                    gte(suppliers.updatedAt, sinceDate),
                    isNull(suppliers.deletedAt)
                  )
                );
              break;
            case "salesInvoices":
              changes.salesInvoices = await db
                .select()
                .from(salesInvoices)
                .where(
                  and(
                    eq(salesInvoices.tenantId, tid),
                    gte(salesInvoices.updatedAt, sinceDate)
                  )
                );
              break;
            case "salesInvoiceItems":
              changes.salesInvoiceItems = await db
                .select()
                .from(salesInvoiceItems)
                .where(
                  and(
                    inArray(salesInvoiceItems.invoiceId, tenantSalesIds),
                    gte(salesInvoiceItems.createdAt, sinceDate)
                  )
                );
              break;
            case "purchaseInvoices":
              changes.purchaseInvoices = await db
                .select()
                .from(purchaseInvoices)
                .where(
                  and(
                    eq(purchaseInvoices.tenantId, tid),
                    gte(purchaseInvoices.updatedAt, sinceDate)
                  )
                );
              break;
            case "purchaseInvoiceItems":
              changes.purchaseInvoiceItems = await db
                .select()
                .from(purchaseInvoiceItems)
                .where(
                  and(
                    inArray(purchaseInvoiceItems.invoiceId, tenantPurchaseIds),
                    gte(purchaseInvoiceItems.createdAt, sinceDate)
                  )
                );
              break;
            case "orders":
              changes.orders = await db
                .select()
                .from(orders)
                .where(
                  and(
                    eq(orders.tenantId, tid),
                    gte(orders.updatedAt, sinceDate)
                  )
                );
              break;
            case "orderItems":
              changes.orderItems = await db
                .select()
                .from(orderItems)
                .where(
                  and(
                    inArray(orderItems.orderId, tenantOrderIds),
                    gte(orderItems.createdAt, sinceDate)
                  )
                );
              break;
            case "payments":
              changes.payments = await db
                .select()
                .from(payments)
                .where(
                  and(
                    eq(payments.tenantId, tid),
                    gte(payments.createdAt, sinceDate)
                  )
                );
              break;
            case "activityLogs":
              changes.activityLogs = await db
                .select()
                .from(activityLogs)
                .where(
                  and(
                    eq(activityLogs.tenantId, tid),
                    gte(activityLogs.createdAt, sinceDate)
                  )
                );
              break;
            case "branches":
              changes.branches = await db
                .select()
                .from(branches)
                .where(
                  and(
                    eq(branches.tenantId, tid),
                    gte(branches.createdAt, sinceDate)
                  )
                );
              break;
            case "tenants":
              changes.tenants = await db
                .select()
                .from(tenants)
                .where(eq(tenants.id, tid));
              break;
            case "warehouseStock":
              changes.warehouseStock = await db
                .select()
                .from(warehouseStock)
                .where(
                  and(
                    eq(warehouseStock.tenantId, tid),
                    gte(warehouseStock.updatedAt, sinceDate)
                  )
                );
              break;
            case "inventoryBatches":
              changes.inventoryBatches = await db
                .select()
                .from(inventoryBatches)
                .where(
                  and(
                    eq(inventoryBatches.tenantId, tid),
                    gte(inventoryBatches.updatedAt, sinceDate)
                  )
                );
              break;
            case "stockReservations":
              changes.stockReservations = await db
                .select()
                .from(stockReservations)
                .where(
                  and(
                    eq(stockReservations.tenantId, tid),
                    gte(stockReservations.updatedAt, sinceDate)
                  )
                );
              break;
            case "cycleCounts":
              changes.cycleCounts = await db
                .select()
                .from(cycleCounts)
                .where(
                  and(
                    eq(cycleCounts.tenantId, tid),
                    gte(cycleCounts.updatedAt, sinceDate)
                  )
                );
              break;
            case "cycleCountLines":
              changes.cycleCountLines = await db
                .select()
                .from(cycleCountLines)
                .where(
                  and(
                    eq(cycleCountLines.tenantId, tid),
                    gte(cycleCountLines.updatedAt, sinceDate)
                  )
                );
              break;
            case "inventoryValuationLayers":
              changes.inventoryValuationLayers = await db
                .select()
                .from(inventoryValuationLayers)
                .where(
                  and(
                    eq(inventoryValuationLayers.tenantId, tid),
                    gte(inventoryValuationLayers.updatedAt, sinceDate)
                  )
                );
              break;
          }
        }

        return {
          changes,
          serverTime: new Date().toISOString(),
        };
      }),

    // Heartbeat: check server status and exchange device clocks
    heartbeat: tenantProcedure
      .input(
        z.object({
          deviceId: z.string(),
          lastSyncAt: z.number().optional(),
          pendingCount: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        const dbAvailable = !!db;
        let serverTxnCount = 0;
        if (db) {
          try {
            const [r] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(transactions)
              .limit(1);
            serverTxnCount = r?.count ?? 0;
          } catch {
            // count unavailable â€” treat as 0
          }
        }
        return {
          serverTime: new Date().toISOString(),
          serverVersion: ENV.appVersion,
          deviceId: input.deviceId,
          dbAvailable,
          serverTxnCount,
          syncRecommended: dbAvailable && (input.pendingCount ?? 0) > 0,
        };
      }),
  }),

  // â”€â”€â”€ Products & Inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  products: router({
    resolveInvoiceImport: tenantProcedure
      .input(
        z.object({
          lines: z
            .array(
              z.object({
                code: z.string().max(100).optional(),
                name: z.string().min(1).max(255),
                quantity: z.number().finite().positive().max(1_000_000),
                unitPrice: z.string().max(32),
                discount: z.string().max(32),
              })
            )
            .min(1)
            .max(500),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…ØªØ§Ø­Ø©");
        const codes = [
          ...new Set(
            input.lines
              .map(line => line.code?.trim())
              .filter((v): v is string => Boolean(v))
          ),
        ];
        const names = [...new Set(input.lines.map(line => line.name.trim()))];
        const predicates = [
          codes.length ? inArray(products.code, codes) : undefined,
          codes.length ? inArray(products.barcode, codes) : undefined,
          names.length ? inArray(products.name, names) : undefined,
        ].filter(Boolean) as any[];
        const matches = await db
          .select({
            id: products.id,
            code: products.code,
            barcode: products.barcode,
            name: products.name,
            type: products.type,
            salePrice: products.salePrice,
            currentStock: products.currentStock,
          })
          .from(products)
          .where(
            and(
              eq(products.tenantId, ctx.tenantId),
              eq(products.isActive, true),
              isNull(products.deletedAt),
              or(...predicates)!
            )
          )
          .limit(1000);
        const normalize = (value: string) => value.trim().toLocaleLowerCase();
        return input.lines.map(line => {
          const product =
            (line.code &&
              matches.find(
                p => p.code === line.code || p.barcode === line.code
              )) ??
            matches.find(p => normalize(p.name) === normalize(line.name));
          return { ...line, product: product ?? null };
        });
      }),
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            search: z.string().optional(),
            category: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        const tenantId = ctx.tenantId;
        const conditions = [
          eq(products.isActive, true),
          eq(products.tenantId, tenantId),
          isNull(products.deletedAt),
        ];
        if (input?.search) {
          conditions.push(
            or(
              ilike(products.name, `%${input.search}%`),
              ilike(products.code, `%${input.search}%`),
              ilike(products.barcode, `%${input.search}%`)
            )!
          );
        }
        if (input?.category)
          conditions.push(eq(products.category, input.category));
        const where = and(...conditions)!;

        return cachedForTenant(
          tenantId,
          "products",
          {
            limit,
            offset,
            search: input?.search ?? null,
            category: input?.category ?? null,
          },
          async () => {
            const [countResult] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(products)
              .where(where);
            const items = await db
              .select()
              .from(products)
              .where(where)
              .orderBy(asc(products.code))
              .limit(limit)
              .offset(offset);
            return { items, total: countResult?.count ?? 0 };
          },
          TENANT_CACHE_TTL.products
        );
      }),

    create: tenantProcedure
      .input(
        z.object({
          code: z
            .string()
            .min(1)
            .transform(v => v.trim()),
          name: z
            .string()
            .min(1)
            .transform(v => v.trim()),
          nameAr: z.string().optional(),
          type: z.enum(["goods", "service"]).default("goods"),
          category: z
            .string()
            .optional()
            .transform(v => v?.trim() || undefined),
          unit: z.string().default("Ù‚Ø·Ø¹Ø©"),
          purchasePrice: z
            .string()
            .default("0")
            .refine(v => {
              const n = parseFloat(v);
              return !isNaN(n) && isFinite(n) && n >= 0;
            }, "Ø³Ø¹Ø± Ø§Ù„Ø´Ø±Ø§Ø¡ ØºÙŠØ± ØµØ­ÙŠØ­"),
          salePrice: z
            .string()
            .default("0")
            .refine(v => {
              const n = parseFloat(v);
              return !isNaN(n) && isFinite(n) && n >= 0;
            }, "Ø³Ø¹Ø± Ø§Ù„Ø¨ÙŠØ¹ ØºÙŠØ± ØµØ­ÙŠØ­"),
          minStock: z.number().int().min(0).default(0),
          barcode: z.string().optional(),
          description: z.string().optional(),
          // â”€â”€â”€ Inventory / unit flexibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          unitOfMeasure: z.string().default("Ù‚Ø·Ø¹Ø©"),
          secondaryUnit: z.string().optional(),
          conversionFactor: z.string().default("1"),
          // â”€â”€â”€ Composite / bundled â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          isComposite: z.boolean().default(false),
          bom: z.string().optional(),
          alternativeIds: z.string().optional(),
          attachmentUrl: z.string().optional(),
          // â”€â”€â”€ Service costing & pricing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          costMethod: z.string().default("average"),
          directCost: z.string().default("0"),
          indirectCost: z.string().default("0"),
          productionMinutes: z.number().int().optional(),
          priceMode: z.enum(["direct", "costPlus"]).default("direct"),
          marginPct: z.string().default("0"),
          salesAccountId: z.number().int().optional(),
          cogsAccountId: z.number().int().optional(),
          inventoryAccountId: z.number().int().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await (db as any).transaction(async (tx: any) => {
          await tx
            .insert(products)
            .values({ ...input, tenantId: ctx.tenantId, currentStock: 0 });
          await tx.insert(activityLogs).values({
            tenantId: ctx.tenantId,
            userId: ctx.user.id,
            action: `Ø¥Ø¶Ø§ÙØ© Ù…Ù†ØªØ¬ Ø¬Ø¯ÙŠØ¯: ${input.name} (${input.code})`,
          });
        });
        return { success: true };
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z
            .string()
            .optional()
            .transform(v => v?.trim()),
          salePrice: z
            .string()
            .optional()
            .refine(
              v =>
                v === undefined ||
                (!isNaN(parseFloat(v)) &&
                  isFinite(parseFloat(v)) &&
                  parseFloat(v) >= 0),
              "Ø³Ø¹Ø± Ø§Ù„Ø¨ÙŠØ¹ ØºÙŠØ± ØµØ­ÙŠØ­"
            ),
          purchasePrice: z
            .string()
            .optional()
            .refine(
              v =>
                v === undefined ||
                (!isNaN(parseFloat(v)) &&
                  isFinite(parseFloat(v)) &&
                  parseFloat(v) >= 0),
              "Ø³Ø¹Ø± Ø§Ù„Ø´Ø±Ø§Ø¡ ØºÙŠØ± ØµØ­ÙŠØ­"
            ),
          minStock: z.number().int().min(0).optional(),
          barcode: z.string().optional(),
          // â”€â”€â”€ Inventory / unit flexibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          unitOfMeasure: z.string().optional(),
          secondaryUnit: z.string().optional(),
          conversionFactor: z.string().optional(),
          // â”€â”€â”€ Composite / bundled â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          isComposite: z.boolean().optional(),
          bom: z.string().optional(),
          alternativeIds: z.string().optional(),
          attachmentUrl: z.string().optional(),
          // â”€â”€â”€ Service costing & pricing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          costMethod: z.string().optional(),
          directCost: z.string().optional(),
          indirectCost: z.string().optional(),
          productionMinutes: z.number().int().optional(),
          priceMode: z.enum(["direct", "costPlus"]).optional(),
          marginPct: z.string().optional(),
          salesAccountId: z.number().int().optional(),
          cogsAccountId: z.number().int().optional(),
          inventoryAccountId: z.number().int().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db
          .update(products)
          .set(data)
          .where(
            and(eq(products.id, id), eq(products.tenantId, ctx.tenantId!))
          );
        return { success: true };
      }),

    /**
     * @deprecated â€” LEGACY PATH. Use `inventory.adjustStock` /
     * `inventory.physicalCount` (central stock guard + idempotency +
     * INVENTORY_ADJUST permission). This stub is kept for backward compat
     * and now delegates scoping correctly (tenant-guarded writes).
     */
    adjustStock: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          quantity: z.number().int().min(1, "Ø§Ù„ÙƒÙ…ÙŠØ© ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ 1"),
          type: z.enum(["in", "out", "adjustment"]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const product = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.id, input.productId),
              eq(products.tenantId, ctx.tenantId)
            )
          )
          .limit(1);
        if (product.length === 0) throw new Error("Ø§Ù„Ù…Ù†ØªØ¬ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");

        const currentStock = product[0].currentStock || 0;
        let newStock = currentStock;
        if (input.type === "in") {
          newStock = currentStock + input.quantity;
        } else if (input.type === "out") {
          if (currentStock < input.quantity) {
            throw new Error(
              `Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ØºÙŠØ± ÙƒØ§ÙÙ â€” Ø§Ù„Ù…ØªÙˆÙØ±: ${currentStock}, Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: ${input.quantity}`
            );
          }
          newStock = currentStock - input.quantity;
        } else {
          newStock = input.quantity;
        }

        await (db as any).transaction(async (tx: any) => {
          // Atomic update - global product stock (tenant-scoped: prevents
          // cross-tenant balance corruption â€” legacy path missed tenantId).
          if (input.type === "in") {
            await tx
              .update(products)
              .set({
                currentStock: sql`${products.currentStock} + ${input.quantity}`,
              })
              .where(
                and(
                  eq(products.id, input.productId),
                  eq(products.tenantId, ctx.tenantId!)
                )
              );
          } else if (input.type === "out") {
            const done = await tx
              .update(products)
              .set({
                currentStock: sql`${products.currentStock} - ${input.quantity}`,
              })
              .where(
                and(
                  eq(products.id, input.productId),
                  eq(products.tenantId, ctx.tenantId!),
                  gte(products.currentStock, input.quantity)
                )
              )
              .returning({ id: products.id });
            if (done.length === 0)
              throw new Error(
                `Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ØºÙŠØ± ÙƒØ§ÙÙ â€” Ø§Ù„Ù…ØªÙˆÙØ± Ø§Ù„Ø­Ø§Ù„ÙŠ Ø£Ù‚Ù„ Ù…Ù† ${input.quantity}`
              );
          } else {
            await tx
              .update(products)
              .set({ currentStock: input.quantity })
              .where(
                and(
                  eq(products.id, input.productId),
                  eq(products.tenantId, ctx.tenantId!)
                )
              );
          }

          // Update warehouse stock (default to first warehouse if not specified)
          const defaultWarehouse = await tx
            .select({ id: warehouses.id })
            .from(warehouses)
            .where(
              and(
                eq(warehouses.tenantId, ctx.tenantId!),
                eq(warehouses.isActive, true)
              )
            )
            .orderBy(asc(warehouses.code))
            .limit(1);

          const warehouseId = defaultWarehouse[0]?.id;

          if (warehouseId) {
            if (input.type === "in") {
              await tx
                .insert(warehouseStock)
                .values({
                  tenantId: ctx.tenantId,
                  productId: input.productId,
                  warehouseId,
                  quantity: input.quantity,
                  reservedQty: 0,
                  availableQty: input.quantity,
                  lastMovementAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: [
                    warehouseStock.productId,
                    warehouseStock.warehouseId,
                    warehouseStock.tenantId,
                  ],
                  set: {
                    quantity: sql`${warehouseStock.quantity} + ${input.quantity}`,
                    availableQty: sql`${warehouseStock.availableQty} + ${input.quantity}`,
                    lastMovementAt: new Date(),
                    updatedAt: new Date(),
                  },
                });
            } else if (input.type === "out") {
              const deducted = await inventoryService.deductWarehouseStock(tx, {
                tenantId: ctx.tenantId!,
                productId: input.productId,
                warehouseId,
                quantity: input.quantity,
              });
              if (!deducted.success)
                throw new Error(
                  `Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ØºÙŠØ± ÙƒØ§ÙÙ ÙÙŠ Ø§Ù„Ù…Ø®Ø²Ù† â€” Ø§Ù„Ù…ØªÙˆÙØ± Ø£Ù‚Ù„ Ù…Ù† ${input.quantity}`
                );
            } else {
              await tx
                .insert(warehouseStock)
                .values({
                  tenantId: ctx.tenantId,
                  productId: input.productId,
                  warehouseId,
                  quantity: input.quantity,
                  reservedQty: 0,
                  availableQty: input.quantity,
                  lastMovementAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: [
                    warehouseStock.productId,
                    warehouseStock.warehouseId,
                    warehouseStock.tenantId,
                  ],
                  set: {
                    quantity: input.quantity,
                    availableQty: input.quantity,
                    lastMovementAt: new Date(),
                    updatedAt: new Date(),
                  },
                });
            }
          }

          // Create valuation layer for "in" movements
          if (input.type === "in" && warehouseId) {
            const unitCost = parseFloat(product[0].purchasePrice || "0");
            await tx.insert(inventoryValuationLayers).values({
              tenantId: ctx.tenantId,
              productId: input.productId,
              warehouseId,
              layerDate: new Date(),
              quantity: input.quantity,
              remainingQty: input.quantity,
              unitCost: unitCost.toFixed(4),
              totalCost: (unitCost * input.quantity).toFixed(2),
              sourceType: "adjustment",
              sourceId: null,
              referenceType: "stock_adjustment",
              referenceId: null,
            });
          }

          await tx.insert(inventoryMovements).values({
            tenantId: ctx.tenantId,
            productId: input.productId,
            warehouseId: warehouseId || null,
            type: input.type,
            quantity: input.quantity,
            notes: input.notes || null,
          });
          await tx.insert(stockAdjustments).values({
            tenantId: ctx.tenantId,
            productId: input.productId,
            warehouseId: warehouseId || null,
            previousQty: currentStock,
            newQty: newStock,
            reason:
              input.type === "adjustment"
                ? "ØªØ³ÙˆÙŠØ©"
                : input.type === "in"
                  ? "Ø¥Ø¯Ø®Ø§Ù„"
                  : "Ø¥Ø®Ø±Ø§Ø¬",
            notes: input.notes || null,
            userId: ctx.user.id,
          });
          await tx.insert(activityLogs).values({
            tenantId: ctx.tenantId,
            userId: ctx.user.id,
            action: `ØªØ¹Ø¯ÙŠÙ„ Ù…Ø®Ø²ÙˆÙ†: ${product[0].name} (${input.type === "in" ? "Ø¥Ø¯Ø®Ø§Ù„" : input.type === "out" ? "Ø¥Ø®Ø±Ø§Ø¬" : "ØªØ³ÙˆÙŠØ©"}: ${input.quantity})`,
            details: `Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø³Ø§Ø¨Ù‚: ${currentStock} â€” Ø§Ù„Ø¬Ø¯ÙŠØ¯: ${newStock}`,
          });
        });
        return { success: true, previousStock: currentStock, newStock };
      }),

    // Set an explicit opening/physical stock count
    setOpeningStock: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          quantity: z.number().int().min(0),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const prod = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.id, input.productId),
              eq(products.tenantId, ctx.tenantId)
            )
          )
          .limit(1);
        if (!prod.length) throw new Error("Ø§Ù„Ù…Ù†ØªØ¬ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
        const previous = prod[0].currentStock || 0;

        // Get default warehouse
        const defaultWarehouse = await db
          .select({ id: warehouses.id })
          .from(warehouses)
          .where(
            and(
              eq(warehouses.tenantId, ctx.tenantId!),
              eq(warehouses.isActive, true)
            )
          )
          .orderBy(asc(warehouses.code))
          .limit(1);

        const warehouseId = defaultWarehouse[0]?.id;

        await (db as any).transaction(async (tx: any) => {
          await tx
            .update(products)
            .set({ currentStock: input.quantity })
            .where(eq(products.id, input.productId));

          if (warehouseId) {
            await tx
              .insert(warehouseStock)
              .values({
                tenantId: ctx.tenantId,
                productId: input.productId,
                warehouseId,
                quantity: input.quantity,
                reservedQty: 0,
                availableQty: input.quantity,
                lastMovementAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [
                  warehouseStock.productId,
                  warehouseStock.warehouseId,
                  warehouseStock.tenantId,
                ],
                set: {
                  quantity: input.quantity,
                  availableQty: input.quantity,
                  lastMovementAt: new Date(),
                  updatedAt: new Date(),
                },
              });
          }

          if (input.quantity > previous && warehouseId) {
            const unitCost = parseFloat(prod[0].purchasePrice || "0");
            await tx.insert(inventoryValuationLayers).values({
              tenantId: ctx.tenantId,
              productId: input.productId,
              warehouseId,
              layerDate: new Date(),
              quantity: input.quantity - previous,
              remainingQty: input.quantity - previous,
              unitCost: unitCost.toFixed(4),
              totalCost: (unitCost * (input.quantity - previous)).toFixed(2),
              sourceType: "opening_balance",
              sourceId: null,
              referenceType: "stock_adjustment",
              referenceId: null,
            });
          }

          await tx.insert(stockAdjustments).values({
            tenantId: ctx.tenantId,
            productId: input.productId,
            warehouseId: warehouseId || null,
            previousQty: previous,
            newQty: input.quantity,
            reason: "Ø¬Ø±Ø¯ Ø§ÙØªØªØ§Ø­ÙŠ/ÙØ¹Ù„ÙŠ",
            notes: input.notes || null,
            userId: ctx.user.id,
          });
          await tx.insert(inventoryMovements).values({
            tenantId: ctx.tenantId,
            productId: input.productId,
            warehouseId: warehouseId || null,
            type: "adjustment",
            quantity: input.quantity,
            notes: `Ø¬Ø±Ø¯ Ø§ÙØªØªØ§Ø­ÙŠ: ${previous} â† ${input.quantity}`,
          });
        });
        return {
          success: true,
          previousStock: previous,
          newStock: input.quantity,
        };
      }),

    // Transfer stock between warehouses (logged; global on-hand unchanged)
    transferStock: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          fromWarehouseId: z.number(),
          toWarehouseId: z.number(),
          quantity: z.number().int().min(1),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (input.fromWarehouseId === input.toWarehouseId)
          throw new Error("ÙŠØ¬Ø¨ Ø§Ø®ØªÙŠØ§Ø± Ù…Ø®Ø²Ù†ÙŠÙ† Ù…Ø®ØªÙ„ÙÙŠÙ†");

        await (db as any).transaction(async (tx: any) => {
          await tx.insert(warehouseTransfers).values({
            tenantId: ctx.tenantId,
            productId: input.productId,
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            quantity: input.quantity,
            notes: input.notes || null,
            userId: ctx.user.id,
          });

          // Deduct from source warehouse (atomic guarded decrement)
          const deducted = await inventoryService.deductWarehouseStock(tx, {
            tenantId: ctx.tenantId!,
            productId: input.productId,
            warehouseId: input.fromWarehouseId,
            quantity: input.quantity,
          });
          if (!deducted.success)
            throw new Error(
              `Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ù…ØªØ§Ø­ ÙÙŠ Ø§Ù„Ù…Ø®Ø²Ù† Ø§Ù„Ù…ØµØ¯Ø± ØºÙŠØ± ÙƒØ§ÙÙ â€” Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: ${input.quantity}`
            );

          // Add to destination warehouse (atomic upsert)
          await inventoryService.addWarehouseStock(tx, {
            tenantId: ctx.tenantId!,
            productId: input.productId,
            warehouseId: input.toWarehouseId,
            quantity: input.quantity,
          });

          await tx.insert(inventoryMovements).values([
            {
              tenantId: ctx.tenantId,
              productId: input.productId,
              warehouseId: input.fromWarehouseId,
              type: "transfer",
              quantity: -input.quantity,
              referenceType: "transfer-out",
              notes: `ØªØ­ÙˆÙŠÙ„ Ù…Ù† Ø§Ù„Ù…Ø®Ø²Ù† ${input.fromWarehouseId}`,
            },
            {
              tenantId: ctx.tenantId,
              productId: input.productId,
              warehouseId: input.toWarehouseId,
              type: "transfer",
              quantity: input.quantity,
              referenceType: "transfer-in",
              notes: `ØªØ­ÙˆÙŠÙ„ Ø¥Ù„Ù‰ Ø§Ù„Ù…Ø®Ø²Ù† ${input.toWarehouseId}`,
            },
          ]);
        });
        return { success: true };
      }),

    // â”€â”€â”€ Analytical / detailed / aggregate / evaluative reports â”€â”€â”€â”€â”€â”€
    stockCard: tenantProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return { product: null, movements: [] };
        const tid = requireTenantId(ctx);
        const [product] = await db
          .select()
          .from(products)
          .where(
            and(eq(products.id, input.productId), eq(products.tenantId, tid))
          )
          .limit(1);
        const movements = await db
          .select()
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.tenantId, tid),
              eq(inventoryMovements.productId, input.productId)
            )
          )
          .orderBy(inventoryMovements.createdAt);
        // compute running balance
        let bal = 0;
        const card = movements.map(m => {
          if (m.type === "in" || m.type === "transfer") bal += m.quantity;
          else bal -= m.quantity;
          return { ...m, balanceAfter: bal };
        });
        return { product, movements: card };
      }),

    lowStock: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const tid = requireTenantId(ctx);
      return await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, tid),
            eq(products.isActive, true),
            isNull(products.deletedAt),
            // currentStock <= minStock
            sql`${products.currentStock} <= ${products.minStock}`
          )
        )
        .orderBy(asc(products.code));
    }),

    valuation: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { items: [], totalValue: 0, totalRetail: 0 };
      const tid = requireTenantId(ctx);
      const rows = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, tid),
            eq(products.isActive, true),
            isNull(products.deletedAt)
          )
        );
      const items = rows.map(p => {
        const qty = p.currentStock || 0;
        const cost = parseFloat(p.purchasePrice || "0");
        const price = parseFloat(p.salePrice || "0");
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          type: p.type,
          qty,
          cost,
          price,
          stockValue: qty * cost,
          retailValue: qty * price,
          minStock: p.minStock,
        };
      });
      const totalValue = items.reduce((s, i) => s + i.stockValue, 0);
      const totalRetail = items.reduce((s, i) => s + i.retailValue, 0);
      return { items, totalValue, totalRetail };
    }),

    inventorySummary: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        return {
          totalProducts: 0,
          totalGoods: 0,
          totalServices: 0,
          totalStockValue: 0,
          totalRetailValue: 0,
          lowStockCount: 0,
          byCategory: [],
        };
      const tid = requireTenantId(ctx);
      const rows = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, tid),
            eq(products.isActive, true),
            isNull(products.deletedAt)
          )
        );
      const byCat: Record<string, { qty: number; value: number }> = {};
      let totalGoods = 0;
      let totalServices = 0;
      let totalStockValue = 0;
      let totalRetailValue = 0;
      let lowStockCount = 0;
      for (const p of rows) {
        const qty = p.currentStock || 0;
        const cost = parseFloat(p.purchasePrice || "0");
        const price = parseFloat(p.salePrice || "0");
        totalStockValue += qty * cost;
        totalRetailValue += qty * price;
        if (p.type === "goods") totalGoods++;
        else totalServices++;
        if (qty <= (p.minStock || 0)) lowStockCount++;
        const cat = p.category || "Ø¨Ø¯ÙˆÙ† ØªØµÙ†ÙŠÙ";
        byCat[cat] = byCat[cat] || { qty: 0, value: 0 };
        byCat[cat].qty += qty;
        byCat[cat].value += qty * cost;
      }
      return {
        totalProducts: rows.length,
        totalGoods,
        totalServices,
        totalStockValue,
        totalRetailValue,
        lowStockCount,
        byCategory: Object.entries(byCat).map(([category, v]) => ({
          category,
          ...v,
        })),
      };
    }),

    movements: tenantProcedure
      .input(
        z
          .object({
            productId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return [];
        const tid = requireTenantId(ctx);
        if (input?.productId) {
          return await db
            .select()
            .from(inventoryMovements)
            .where(
              and(
                eq(inventoryMovements.tenantId, tid),
                eq(inventoryMovements.productId, input.productId)
              )
            )
            .orderBy(desc(inventoryMovements.createdAt));
        }
        return await db
          .select()
          .from(inventoryMovements)
          .where(eq(inventoryMovements.tenantId, tid))
          .orderBy(desc(inventoryMovements.createdAt));
      }),

    movementDashboard: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) {
        return { currentMonth: 0, previousMonth: 0, topMoving: [] };
      }
      const db = await getDb();
      if (!db) return { currentMonth: 0, previousMonth: 0, topMoving: [] };

      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      const [activity] = await db
        .select({
          currentMonth: sql<number>`count(*) filter (where ${inventoryMovements.createdAt} >= ${currentMonthStart})::int`,
          previousMonth: sql<number>`count(*) filter (where ${inventoryMovements.createdAt} >= ${previousMonthStart} and ${inventoryMovements.createdAt} < ${currentMonthStart})::int`,
        })
        .from(inventoryMovements)
        .where(eq(inventoryMovements.tenantId, ctx.tenantId));

      const dailyActivity = await db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${inventoryMovements.createdAt}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.tenantId, ctx.tenantId),
            gte(
              inventoryMovements.createdAt,
              new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
            )
          )
        )
        .groupBy(sql`date_trunc('day', ${inventoryMovements.createdAt})`);

      const topMoving = await db
        .select({
          productId: inventoryMovements.productId,
          code: products.code,
          name: products.name,
          inbound: sql<number>`coalesce(sum(case when ${inventoryMovements.type} = 'in' then abs(${inventoryMovements.quantity}) else 0 end), 0)`,
          outbound: sql<number>`coalesce(sum(case when ${inventoryMovements.type} = 'out' then abs(${inventoryMovements.quantity}) else 0 end), 0)`,
          transfers: sql<number>`coalesce(sum(case when ${inventoryMovements.type} = 'transfer' then abs(${inventoryMovements.quantity}) else 0 end), 0)`,
          total: sql<number>`coalesce(sum(abs(${inventoryMovements.quantity})), 0)`,
        })
        .from(inventoryMovements)
        .innerJoin(
          products,
          and(
            eq(products.id, inventoryMovements.productId),
            eq(products.tenantId, inventoryMovements.tenantId)
          )
        )
        .where(eq(inventoryMovements.tenantId, ctx.tenantId))
        .groupBy(inventoryMovements.productId, products.code, products.name)
        .orderBy(desc(sql`sum(abs(${inventoryMovements.quantity}))`))
        .limit(10);

      return {
        currentMonth: Number(activity?.currentMonth ?? 0),
        previousMonth: Number(activity?.previousMonth ?? 0),
        dailyActivity: dailyActivity.map(row => ({
          day: row.day,
          count: Number(row.count),
        })),
        topMoving: topMoving.map(row => ({
          id: row.productId,
          code: row.code,
          name: row.name,
          in: Number(row.inbound),
          out: Number(row.outbound),
          transfers: Number(row.transfers),
          total: Number(row.total),
        })),
      };
    }),

    // â”€â”€â”€ Warehouse Stock (Per-location inventory) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    warehouseStockList: tenantProcedure
      .input(
        z
          .object({
            warehouseId: z.number().optional(),
            productId: z.number().optional(),
            lowStockOnly: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return [];
        const tid = requireTenantId(ctx);
        const conditions = [eq(warehouseStock.tenantId, tid)];
        if (input?.warehouseId)
          conditions.push(eq(warehouseStock.warehouseId, input.warehouseId));
        if (input?.productId)
          conditions.push(eq(warehouseStock.productId, input.productId));
        if (input?.lowStockOnly) {
          conditions.push(
            sql`${warehouseStock.availableQty} <= (SELECT minStock FROM products WHERE products.id = ${warehouseStock.productId})`
          );
        }
        return await db
          .select({
            id: warehouseStock.id,
            productId: warehouseStock.productId,
            warehouseId: warehouseStock.warehouseId,
            quantity: warehouseStock.quantity,
            reservedQty: warehouseStock.reservedQty,
            availableQty: warehouseStock.availableQty,
            lastMovementAt: warehouseStock.lastMovementAt,
            productCode: products.code,
            productName: products.name,
            productType: products.type,
            minStock: products.minStock,
            warehouseCode: warehouses.code,
            warehouseName: warehouses.name,
          })
          .from(warehouseStock)
          .leftJoin(products, eq(warehouseStock.productId, products.id))
          .leftJoin(warehouses, eq(warehouseStock.warehouseId, warehouses.id))
          .where(and(...conditions))
          .orderBy(asc(warehouses.code), asc(products.code));
      }),

    warehouseStockGet: tenantProcedure
      .input(z.object({ productId: z.number(), warehouseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return null;
        const tid = requireTenantId(ctx);
        const [row] = await db
          .select()
          .from(warehouseStock)
          .where(
            and(
              eq(warehouseStock.tenantId, tid),
              eq(warehouseStock.productId, input.productId),
              eq(warehouseStock.warehouseId, input.warehouseId)
            )
          )
          .limit(1);
        return row || { quantity: 0, reservedQty: 0, availableQty: 0 };
      }),

    // â”€â”€â”€ Inventory Batches (Traceability) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    batchList: tenantProcedure
      .input(
        z
          .object({
            productId: z.number().optional(),
            warehouseId: z.number().optional(),
            expiringSoon: z.boolean().optional(),
            daysAhead: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return [];
        const tid = requireTenantId(ctx);
        const conditions = [
          eq(inventoryBatches.tenantId, tid),
          eq(inventoryBatches.isActive, true),
        ];
        if (input?.productId)
          conditions.push(eq(inventoryBatches.productId, input.productId));
        if (input?.warehouseId)
          conditions.push(eq(inventoryBatches.warehouseId, input.warehouseId));
        if (input?.expiringSoon) {
          const days = input.daysAhead || 30;
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + days);
          conditions.push(lte(inventoryBatches.expiryDate, futureDate));
          conditions.push(gte(inventoryBatches.expiryDate, new Date()));
        }
        return await db
          .select({
            id: inventoryBatches.id,
            productId: inventoryBatches.productId,
            warehouseId: inventoryBatches.warehouseId,
            batchNumber: inventoryBatches.batchNumber,
            lotNumber: inventoryBatches.lotNumber,
            serialNumber: inventoryBatches.serialNumber,
            manufacturingDate: inventoryBatches.manufacturingDate,
            expiryDate: inventoryBatches.expiryDate,
            quantity: inventoryBatches.quantity,
            reservedQty: inventoryBatches.reservedQty,
            availableQty: sql`${inventoryBatches.quantity} - ${inventoryBatches.reservedQty}`,
            unitCost: inventoryBatches.unitCost,
            purchaseInvoiceId: inventoryBatches.purchaseInvoiceId,
            productCode: products.code,
            productName: products.name,
            warehouseCode: warehouses.code,
            warehouseName: warehouses.name,
          })
          .from(inventoryBatches)
          .leftJoin(products, eq(inventoryBatches.productId, products.id))
          .leftJoin(warehouses, eq(inventoryBatches.warehouseId, warehouses.id))
          .where(and(...conditions))
          .orderBy(
            asc(inventoryBatches.expiryDate),
            asc(inventoryBatches.batchNumber)
          );
      }),

    batchCreate: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          warehouseId: z.number(),
          batchNumber: z.string().min(1),
          lotNumber: z.string().optional(),
          serialNumber: z.string().optional(),
          manufacturingDate: z.string().optional(),
          expiryDate: z.string().optional(),
          quantity: z.number().int().min(1),
          unitCost: z.string().optional(),
          purchaseInvoiceId: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const existing = await db
          .select()
          .from(inventoryBatches)
          .where(
            and(
              eq(inventoryBatches.tenantId, ctx.tenantId!),
              eq(inventoryBatches.productId, input.productId),
              eq(inventoryBatches.warehouseId, input.warehouseId),
              eq(inventoryBatches.batchNumber, input.batchNumber)
            )
          )
          .limit(1);
        if (existing.length > 0)
          throw new Error("Ø±Ù‚Ù… Ø§Ù„Ø¯ÙØ¹Ø© Ù…ÙˆØ¬ÙˆØ¯ Ù…Ø³Ø¨Ù‚Ø§Ù‹ Ù„Ù‡Ø°Ø§ Ø§Ù„ØµÙ†Ù ÙˆØ§Ù„Ù…Ø®Ø²Ù†");
        const [row] = await db
          .insert(inventoryBatches)
          .values({
            tenantId: ctx.tenantId,
            productId: input.productId,
            warehouseId: input.warehouseId,
            batchNumber: input.batchNumber,
            lotNumber: input.lotNumber || null,
            serialNumber: input.serialNumber || null,
            manufacturingDate: input.manufacturingDate
              ? new Date(input.manufacturingDate)
              : null,
            expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
            quantity: input.quantity,
            reservedQty: 0,
            unitCost: input.unitCost || "0",
            purchaseInvoiceId: input.purchaseInvoiceId || null,
            notes: input.notes || null,
          })
          .returning();
        return row;
      }),

    // â”€â”€â”€ Stock Reservations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    reservationList: tenantProcedure
      .input(
        z
          .object({
            productId: z.number().optional(),
            warehouseId: z.number().optional(),
            status: z.string().optional(),
            source: z.string().optional(),
            sourceId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return [];
        const tid = requireTenantId(ctx);
        const conditions = [eq(stockReservations.tenantId, tid)];
        if (input?.productId)
          conditions.push(eq(stockReservations.productId, input.productId));
        if (input?.warehouseId)
          conditions.push(eq(stockReservations.warehouseId, input.warehouseId));
        if (input?.status)
          conditions.push(eq(stockReservations.status, input.status as any));
        if (input?.source)
          conditions.push(eq(stockReservations.source, input.source as any));
        if (input?.sourceId)
          conditions.push(eq(stockReservations.sourceId, input.sourceId));
        return await db
          .select({
            id: stockReservations.id,
            productId: stockReservations.productId,
            warehouseId: stockReservations.warehouseId,
            batchId: stockReservations.batchId,
            quantity: stockReservations.quantity,
            status: stockReservations.status,
            source: stockReservations.source,
            sourceId: stockReservations.sourceId,
            sourceType: stockReservations.sourceType,
            customerId: stockReservations.customerId,
            expiresAt: stockReservations.expiresAt,
            notes: stockReservations.notes,
            createdAt: stockReservations.createdAt,
            productCode: products.code,
            productName: products.name,
            warehouseCode: warehouses.code,
            warehouseName: warehouses.name,
            batchNumber: inventoryBatches.batchNumber,
          })
          .from(stockReservations)
          .leftJoin(products, eq(stockReservations.productId, products.id))
          .leftJoin(
            warehouses,
            eq(stockReservations.warehouseId, warehouses.id)
          )
          .leftJoin(
            inventoryBatches,
            eq(stockReservations.batchId, inventoryBatches.id)
          )
          .where(and(...conditions))
          .orderBy(desc(stockReservations.createdAt));
      }),

    reservationCreate: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          warehouseId: z.number().optional(),
          batchId: z.number().optional(),
          quantity: z.number().int().min(1),
          source: z.string().default("manual"),
          sourceId: z.number().optional(),
          sourceType: z.string().optional(),
          customerId: z.number().optional(),
          expiresAt: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = ctx.tenantId;

        // Atomic reservation: move from available â†’ reserved under a single
        // guarded UPDATE that prevents oversell under concurrency.
        const reservationId = await (db as any).transaction(async (tx: any) => {
          const reserved = await inventoryService.reserveStock(tx, {
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.warehouseId || 0,
            quantity: input.quantity,
            batchId: input.batchId,
          });
          if (!reserved.success)
            throw new Error(
              `Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ù…ØªØ§Ø­ ØºÙŠØ± ÙƒØ§ÙÙ â€” Ù…Ø·Ù„ÙˆØ¨: ${input.quantity}`
            );

          const [inserted] = await tx.insert(stockReservations).values({
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.warehouseId || null,
            batchId: input.batchId || null,
            quantity: input.quantity,
            status: "active",
            source: input.source as any,
            sourceId: input.sourceId || null,
            sourceType: input.sourceType || null,
            customerId: input.customerId || null,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            notes: input.notes || null,
          });
        });

        return { success: true };
      }),

    reservationRelease: tenantProcedure
      .input(z.object({ id: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = ctx.tenantId;

        const [res] = await db
          .select()
          .from(stockReservations)
          .where(
            and(
              eq(stockReservations.id, input.id),
              eq(stockReservations.tenantId, tid)
            )
          )
          .limit(1);
        if (!res) throw new Error("Ø§Ù„Ø­Ø¬Ø² ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
        if (res.status !== "active") throw new Error("Ø§Ù„Ø­Ø¬Ø² ØºÙŠØ± Ù†Ø´Ø·");

        await (db as any).transaction(async (tx: any) => {
          if (res.batchId) {
            await tx
              .update(inventoryBatches)
              .set({
                reservedQty: sql`${inventoryBatches.reservedQty} - ${res.quantity}`,
              })
              .where(eq(inventoryBatches.id, res.batchId));
          } else if (res.warehouseId) {
            await tx
              .update(warehouseStock)
              .set({
                reservedQty: sql`${warehouseStock.reservedQty} - ${res.quantity}`,
                availableQty: sql`${warehouseStock.availableQty} + ${res.quantity}`,
              })
              .where(
                and(
                  eq(warehouseStock.tenantId, tid),
                  eq(warehouseStock.productId, res.productId),
                  eq(warehouseStock.warehouseId, res.warehouseId)
                )
              );
          }

          await tx
            .update(stockReservations)
            .set({
              status: "released",
              releasedAt: new Date(),
              notes: input.reason || null,
            })
            .where(eq(stockReservations.id, input.id));
        });

        return { success: true };
      }),

    reservationFulfill: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = ctx.tenantId;

        const [res] = await db
          .select()
          .from(stockReservations)
          .where(
            and(
              eq(stockReservations.id, input.id),
              eq(stockReservations.tenantId, tid)
            )
          )
          .limit(1);
        if (!res) throw new Error("Ø§Ù„Ø­Ø¬Ø² ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
        if (res.status !== "active") throw new Error("Ø§Ù„Ø­Ø¬Ø² ØºÙŠØ± Ù†Ø´Ø·");

        await (db as any).transaction(async (tx: any) => {
          if (res.batchId) {
            await tx
              .update(inventoryBatches)
              .set({
                quantity: sql`${inventoryBatches.quantity} - ${res.quantity}`,
                reservedQty: sql`${inventoryBatches.reservedQty} - ${res.quantity}`,
              })
              .where(eq(inventoryBatches.id, res.batchId));
          } else if (res.warehouseId) {
            await tx
              .update(warehouseStock)
              .set({
                quantity: sql`${warehouseStock.quantity} - ${res.quantity}`,
                reservedQty: sql`${warehouseStock.reservedQty} - ${res.quantity}`,
              })
              .where(
                and(
                  eq(warehouseStock.tenantId, tid),
                  eq(warehouseStock.productId, res.productId),
                  eq(warehouseStock.warehouseId, res.warehouseId)
                )
              );
          }

          await tx
            .update(stockReservations)
            .set({ status: "fulfilled", fulfilledAt: new Date() })
            .where(eq(stockReservations.id, input.id));
        });

        return { success: true };
      }),

    // â”€â”€â”€ Cycle Counting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cycleCountList: tenantProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            warehouseId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return [];
        const tid = requireTenantId(ctx);
        const conditions = [eq(cycleCounts.tenantId, tid)];
        if (input?.status)
          conditions.push(eq(cycleCounts.status, input.status as any));
        if (input?.warehouseId)
          conditions.push(eq(cycleCounts.warehouseId, input.warehouseId));
        return await db
          .select({
            id: cycleCounts.id,
            countNumber: cycleCounts.countNumber,
            warehouseId: cycleCounts.warehouseId,
            status: cycleCounts.status,
            plannedDate: cycleCounts.plannedDate,
            startedAt: cycleCounts.startedAt,
            completedAt: cycleCounts.completedAt,
            approvedAt: cycleCounts.approvedAt,
            assignedToId: cycleCounts.assignedToId,
            varianceThreshold: cycleCounts.varianceThreshold,
            warehouseCode: warehouses.code,
            warehouseName: warehouses.name,
          })
          .from(cycleCounts)
          .leftJoin(warehouses, eq(cycleCounts.warehouseId, warehouses.id))
          .where(and(...conditions))
          .orderBy(desc(cycleCounts.plannedDate));
      }),

    cycleCountCreate: tenantProcedure
      .input(
        z.object({
          warehouseId: z.number(),
          plannedDate: z.string(),
          assignedToId: z.number().optional(),
          varianceThreshold: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const seq = await db
          .select({ c: sql`count(*)` })
          .from(cycleCounts)
          .where(eq(cycleCounts.tenantId, ctx.tenantId!));
        const countNumber = `CC-${ctx.tenantId}-${Number(seq[0]?.c || 0) + 1}`;
        const [row] = await db
          .insert(cycleCounts)
          .values({
            tenantId: ctx.tenantId,
            countNumber,
            warehouseId: input.warehouseId,
            plannedDate: new Date(input.plannedDate),
            assignedToId: input.assignedToId || null,
            varianceThreshold: input.varianceThreshold || "5",
            notes: input.notes || null,
          })
          .returning();
        return row;
      }),

    cycleCountStart: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = ctx.tenantId;

        const [cc] = await db
          .select()
          .from(cycleCounts)
          .where(
            and(eq(cycleCounts.id, input.id), eq(cycleCounts.tenantId, tid))
          )
          .limit(1);
        if (!cc) throw new Error("Ø§Ù„Ø¬Ø±Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
        if (cc.status !== "planned") throw new Error("Ø§Ù„Ø¬Ø±Ø¯ Ù„ÙŠØ³ ÙÙŠ Ø­Ø§Ù„Ø© Ù…Ø®Ø·Ø·");

        // Generate lines from current warehouse stock
        const stockRows = await db
          .select({
            productId: warehouseStock.productId,
            warehouseId: warehouseStock.warehouseId,
            systemQty: warehouseStock.quantity,
            unitCost: products.purchasePrice,
          })
          .from(warehouseStock)
          .leftJoin(products, eq(warehouseStock.productId, products.id))
          .where(
            and(
              eq(warehouseStock.tenantId, tid),
              eq(warehouseStock.warehouseId, cc.warehouseId)
            )
          );

        await (db as any).transaction(async (tx: any) => {
          await tx
            .update(cycleCounts)
            .set({ status: "in_progress", startedAt: new Date() })
            .where(eq(cycleCounts.id, input.id));

          if (stockRows.length > 0) {
            await tx.insert(cycleCountLines).values(
              stockRows.map(s => ({
                tenantId: tid,
                cycleCountId: input.id,
                productId: s.productId,
                warehouseId: s.warehouseId,
                systemQty: s.systemQty || 0,
                unitCost: s.unitCost || "0",
                status: "pending",
              }))
            );
          }
        });

        return { success: true };
      }),

    cycleCountRecord: tenantProcedure
      .input(
        z.object({
          cycleCountId: z.number(),
          productId: z.number(),
          warehouseId: z.number(),
          batchId: z.number().optional(),
          countedQty: z.number().int().min(0),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = ctx.tenantId;

        const [line] = await db
          .select()
          .from(cycleCountLines)
          .where(
            and(
              eq(cycleCountLines.cycleCountId, input.cycleCountId),
              eq(cycleCountLines.productId, input.productId),
              eq(cycleCountLines.warehouseId, input.warehouseId),
              eq(cycleCountLines.batchId, input.batchId || 0)
            )
          )
          .limit(1);
        if (!line) throw new Error("Ø³Ø·Ø± Ø§Ù„Ø¬Ø±Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");

        // Get cycle count for variance threshold
        const [cc] = await db
          .select()
          .from(cycleCounts)
          .where(
            and(
              eq(cycleCounts.id, input.cycleCountId),
              eq(cycleCounts.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);

        const varianceQty = input.countedQty - (line.systemQty || 0);
        const variancePct = line.systemQty
          ? ((varianceQty / line.systemQty) * 100).toFixed(2)
          : "0";
        const unitCost = parseFloat(String(line.unitCost || "0"));
        const varianceValue = varianceQty * unitCost;
        const status =
          Math.abs(parseFloat(variancePct)) >
          parseFloat(String(cc?.varianceThreshold || "5"))
            ? "variance"
            : "ok";

        await db
          .update(cycleCountLines)
          .set({
            countedQty: input.countedQty,
            varianceQty,
            variancePct,
            varianceValue: varianceValue.toFixed(2),
            status,
            countedById: ctx.user.id,
            countedAt: new Date(),
            notes: input.notes || null,
          })
          .where(eq(cycleCountLines.id, line.id));

        return { success: true, varianceQty, variancePct, varianceValue };
      }),

    cycleCountLines: tenantProcedure
      .input(
        z.object({
          cycleCountId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = ctx.tenantId;

        return await db
          .select({
            id: cycleCountLines.id,
            productId: cycleCountLines.productId,
            warehouseId: cycleCountLines.warehouseId,
            batchId: cycleCountLines.batchId,
            systemQty: cycleCountLines.systemQty,
            countedQty: cycleCountLines.countedQty,
            varianceQty: cycleCountLines.varianceQty,
            variancePct: cycleCountLines.variancePct,
            varianceValue: cycleCountLines.varianceValue,
            unitCost: cycleCountLines.unitCost,
            status: cycleCountLines.status,
            productCode: products.code,
            productName: products.name,
            warehouseCode: warehouses.code,
            warehouseName: warehouses.name,
            batchNumber: inventoryBatches.batchNumber,
          })
          .from(cycleCountLines)
          .leftJoin(products, eq(cycleCountLines.productId, products.id))
          .leftJoin(warehouses, eq(cycleCountLines.warehouseId, warehouses.id))
          .leftJoin(
            inventoryBatches,
            eq(cycleCountLines.batchId, inventoryBatches.id)
          )
          .where(
            and(
              eq(cycleCountLines.cycleCountId, input.cycleCountId),
              eq(cycleCountLines.tenantId, tid)
            )
          )
          .orderBy(asc(cycleCountLines.id));
      }),

    cycleCountComplete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = ctx.tenantId;

        const [cc] = await db
          .select()
          .from(cycleCounts)
          .where(
            and(eq(cycleCounts.id, input.id), eq(cycleCounts.tenantId, tid))
          )
          .limit(1);
        if (!cc) throw new Error("Ø§Ù„Ø¬Ø±Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
        if (cc.status !== "in_progress")
          throw new Error("Ø§Ù„Ø¬Ø±Ø¯ Ù„ÙŠØ³ Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°");

        const lines = await db
          .select()
          .from(cycleCountLines)
          .where(eq(cycleCountLines.cycleCountId, input.id));

        const pendingLines = lines.filter(l => l.status === "pending");
        if (pendingLines.length > 0) {
          throw new Error(`ÙŠÙˆØ¬Ø¯ ${pendingLines.length} ØµÙ†Ù Ù„Ù… ÙŠØªÙ… Ø¬Ø±Ø¯Ù‡Ø§ Ø¨Ø¹Ø¯`);
        }

        await db
          .update(cycleCounts)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(cycleCounts.id, input.id));

        return { success: true };
      }),

    cycleCountApprove: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          applyAdjustments: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid = ctx.tenantId;

        const [cc] = await db
          .select()
          .from(cycleCounts)
          .where(
            and(eq(cycleCounts.id, input.id), eq(cycleCounts.tenantId, tid))
          )
          .limit(1);
        if (!cc) throw new Error("Ø§Ù„Ø¬Ø±Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
        if (cc.status !== "completed") throw new Error("Ø§Ù„Ø¬Ø±Ø¯ Ù„Ù… ÙŠÙƒØªÙ…Ù„ Ø¨Ø¹Ø¯");

        if (input.applyAdjustments) {
          const varianceLines = await db
            .select()
            .from(cycleCountLines)
            .where(
              and(
                eq(cycleCountLines.cycleCountId, input.id),
                ne(cycleCountLines.varianceQty, 0)
              )
            );

          await (db as any).transaction(async (tx: any) => {
            for (const line of varianceLines) {
              const countedQty = line.countedQty ?? 0;
              const adjustmentQty = countedQty - (line.systemQty || 0);
              if (adjustmentQty === 0) continue;

              await tx
                .update(warehouseStock)
                .set({
                  quantity: sql`${warehouseStock.quantity} + ${adjustmentQty}`,
                  availableQty: sql`${warehouseStock.availableQty} + ${adjustmentQty}`,
                  lastMovementAt: new Date(),
                })
                .where(
                  and(
                    eq(warehouseStock.tenantId, tid),
                    eq(warehouseStock.productId, line.productId),
                    eq(warehouseStock.warehouseId, line.warehouseId)
                  )
                );

              await tx.insert(inventoryMovements).values({
                tenantId: tid,
                productId: line.productId,
                warehouseId: line.warehouseId,
                type: "adjustment",
                quantity: adjustmentQty,
                referenceType: "cycle_count",
                referenceId: input.id,
                notes: `ØªØ³ÙˆÙŠØ© Ø¬Ø±Ø¯ Ø¯ÙˆØ±ÙŠ ${cc.countNumber}: ${line.systemQty} â†’ ${countedQty}`,
              });
              await tx.insert(stockAdjustments).values({
                tenantId: tid,
                productId: line.productId,
                warehouseId: line.warehouseId,
                previousQty: line.systemQty || 0,
                newQty: countedQty,
                reason: "Ø¬Ø±Ø¯ Ø¯ÙˆØ±ÙŠ",
                notes: `ØªØ³ÙˆÙŠØ© Ù…Ù† Ø§Ù„Ø¬Ø±Ø¯ ${cc.countNumber}`,
                userId: ctx.user.id,
              });
            }
          });
        }

        await db
          .update(cycleCounts)
          .set({
            status: "approved",
            approvedAt: new Date(),
            approvedById: ctx.user.id,
          })
          .where(eq(cycleCounts.id, input.id));

        return { success: true };
      }),

    // â”€â”€â”€ Inventory Valuation (FIFO/LIFO/Weighted Average) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    valuationLayers: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          warehouseId: z.number().optional(),
          asOfDate: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          return { layers: [], totalQty: 0, totalValue: 0, weightedAvgCost: 0 };
        const tid = requireTenantId(ctx);
        const asOf = input.asOfDate ? new Date(input.asOfDate) : new Date();
        const conditions = [
          eq(inventoryValuationLayers.tenantId, tid),
          eq(inventoryValuationLayers.productId, input.productId),
          eq(inventoryValuationLayers.isActive, true),
          lte(inventoryValuationLayers.layerDate, asOf),
        ];
        if (input.warehouseId)
          conditions.push(
            eq(inventoryValuationLayers.warehouseId, input.warehouseId)
          );
        const layers = await db
          .select()
          .from(inventoryValuationLayers)
          .where(and(...conditions))
          .orderBy(asc(inventoryValuationLayers.layerDate));
        const totalQty = layers.reduce((s, l) => s + (l.remainingQty || 0), 0);
        const totalValue = layers.reduce(
          (s, l) => s + parseFloat(String(l.unitCost)) * (l.remainingQty || 0),
          0
        );
        return {
          layers,
          totalQty,
          totalValue,
          weightedAvgCost: totalQty > 0 ? totalValue / totalQty : 0,
        };
      }),

    fifoValuation: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          warehouseId: z.number().optional(),
          quantity: z.number().int().min(1),
        })
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return { layers: [], totalCost: 0, remainingQty: 0 };
        const tid = requireTenantId(ctx);
        const conditions = [
          eq(inventoryValuationLayers.tenantId, tid),
          eq(inventoryValuationLayers.productId, input.productId),
          eq(inventoryValuationLayers.isActive, true),
          sql`${inventoryValuationLayers.remainingQty} > 0`,
        ];
        if (input.warehouseId)
          conditions.push(
            eq(inventoryValuationLayers.warehouseId, input.warehouseId)
          );
        const layers = await db
          .select()
          .from(inventoryValuationLayers)
          .where(and(...conditions))
          .orderBy(asc(inventoryValuationLayers.layerDate)); // FIFO = oldest first
        let remaining = input.quantity;
        const usedLayers = [];
        let totalCost = 0;
        for (const layer of layers) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, layer.remainingQty);
          const layerCost = parseFloat(String(layer.unitCost)) * take;
          usedLayers.push({ ...layer, takenQty: take, layerCost });
          totalCost += layerCost;
          remaining -= take;
        }
        return { layers: usedLayers, totalCost, remainingQty: remaining };
      }),

    lifoValuation: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          warehouseId: z.number().optional(),
          quantity: z.number().int().min(1),
        })
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return { layers: [], totalCost: 0, remainingQty: 0 };
        const tid = requireTenantId(ctx);
        const conditions = [
          eq(inventoryValuationLayers.tenantId, tid),
          eq(inventoryValuationLayers.productId, input.productId),
          eq(inventoryValuationLayers.isActive, true),
          sql`${inventoryValuationLayers.remainingQty} > 0`,
        ];
        if (input.warehouseId)
          conditions.push(
            eq(inventoryValuationLayers.warehouseId, input.warehouseId)
          );
        const layers = await db
          .select()
          .from(inventoryValuationLayers)
          .where(and(...conditions))
          .orderBy(desc(inventoryValuationLayers.layerDate)); // LIFO = newest first
        let remaining = input.quantity;
        const usedLayers = [];
        let totalCost = 0;
        for (const layer of layers) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, layer.remainingQty);
          const layerCost = parseFloat(String(layer.unitCost)) * take;
          usedLayers.push({ ...layer, takenQty: take, layerCost });
          totalCost += layerCost;
          remaining -= take;
        }
        return { layers: usedLayers, totalCost, remainingQty: remaining };
      }),

    importCsv: tenantProcedure
      .input(
        z.object({
          rows: z
            .array(
              z.object({
                code: z
                  .string()
                  .min(1)
                  .transform(v => v.trim()),
                name: z
                  .string()
                  .min(1)
                  .transform(v => v.trim()),
                type: z.enum(["goods", "service"]).default("goods"),
                category: z
                  .string()
                  .optional()
                  .transform(v => v?.trim() || undefined),
                unit: z.string().default("Ù‚Ø·Ø¹Ø©"),
                purchasePrice: z
                  .string()
                  .default("0")
                  .refine(v => {
                    const n = parseFloat(v);
                    return !isNaN(n) && isFinite(n) && n >= 0;
                  }, "Ø³Ø¹Ø± Ø§Ù„Ø´Ø±Ø§Ø¡ ØºÙŠØ± ØµØ­ÙŠØ­"),
                salePrice: z
                  .string()
                  .default("0")
                  .refine(v => {
                    const n = parseFloat(v);
                    return !isNaN(n) && isFinite(n) && n >= 0;
                  }, "Ø³Ø¹Ø± Ø§Ù„Ø¨ÙŠØ¹ ØºÙŠØ± ØµØ­ÙŠØ­"),
                wholesalePrice: z
                  .string()
                  .default("0")
                  .refine(v => {
                    const n = parseFloat(v);
                    return !isNaN(n) && isFinite(n) && n >= 0;
                  }, "Ø³Ø¹Ø± Ø§Ù„Ø¬Ù…Ù„Ø© ØºÙŠØ± ØµØ­ÙŠØ­"),
                minStock: z.number().int().min(0).default(0),
                currentStock: z.number().int().min(0).default(0),
                barcode: z.string().optional(),
              })
            )
            .min(1)
            .max(500),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const seen = new Set<string>();
        const errors: { row: number; message: string }[] = [];
        let created = 0;
        let updated = 0;

        for (let i = 0; i < input.rows.length; i++) {
          const r = input.rows[i];
          const rowNo = i + 2;
          try {
            if (seen.has(r.code)) {
              errors.push({
                row: rowNo,
                message: `Ø±Ù…Ø² Ù…ÙƒØ±Ø± Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…Ù„Ù: ${r.code}`,
              });
              continue;
            }
            seen.add(r.code);
            // Each row is atomic: product write + stock movement commit or roll back together
            await (db as any).transaction(async (tx: any) => {
              const existing = await tx
                .select()
                .from(products)
                .where(eq(products.code, r.code))
                .limit(1);
              const values = {
                name: r.name,
                type: r.type,
                category: r.category || null,
                unit: r.unit || "Ù‚Ø·Ø¹Ø©",
                purchasePrice: r.purchasePrice || "0",
                salePrice: r.salePrice || "0",
                wholesalePrice: r.wholesalePrice || "0",
                minStock: r.minStock || 0,
                barcode: r.barcode || null,
                isActive: true,
              };
              if (existing.length > 0) {
                await tx
                  .update(products)
                  .set(values)
                  .where(eq(products.id, existing[0].id));
                const prevStock = existing[0].currentStock || 0;
                if (r.currentStock !== prevStock) {
                  await tx
                    .update(products)
                    .set({
                      currentStock: sql`${products.currentStock} + ${r.currentStock - prevStock}`,
                    })
                    .where(eq(products.id, existing[0].id));
                  await tx.insert(inventoryMovements).values({
                    tenantId: ctx.tenantId,
                    productId: existing[0].id,
                    type: "adjustment",
                    quantity: Math.abs(r.currentStock - prevStock),
                    notes: `${r.currentStock > prevStock ? "ØªØ²ÙˆÙŠØ¯" : "ØµØ±Ù"} Ø¹Ø¨Ø± Ø§Ø³ØªÙŠØ±Ø§Ø¯ CSV (Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø¬Ø¯ÙŠØ¯ ${r.currentStock})`,
                  });
                }
                updated++;
              } else {
                await tx.insert(products).values({
                  ...values,
                  code: r.code,
                  currentStock: r.currentStock,
                });
                created++;
              }
            });
          } catch (e: any) {
            errors.push({ row: rowNo, message: String(e?.message || e) });
          }
        }

        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø£ØµÙ†Ø§Ù CSV: ${created} Ø¬Ø¯ÙŠØ¯ØŒ ${updated} ØªØ­Ø¯ÙŠØ«ØŒ ${errors.length} Ø®Ø·Ø£`,
        });
        return { created, updated, errors };
      }),

    byBarcode: tenantProcedure
      .input(z.object({ barcode: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [row] = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, ctx.tenantId!),
              eq(products.barcode, input.barcode),
              eq(products.isActive, true),
              isNull(products.deletedAt)
            )
          )
          .limit(1);
        return row || null;
      }),

    byCode: tenantProcedure
      .input(z.object({ code: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [row] = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, ctx.tenantId!),
              eq(products.code, input.code),
              eq(products.isActive, true),
              isNull(products.deletedAt)
            )
          )
          .limit(1);
        return row || null;
      }),
  }),

  // â”€â”€â”€ Customers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  customers: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        const conditions = [
          eq(customers.isActive, true),
          eq(customers.tenantId, ctx.tenantId!),
          isNull(customers.deletedAt),
        ];
        if (input?.search) {
          conditions.push(
            or(
              ilike(customers.name, `%${input.search}%`),
              ilike(customers.code, `%${input.search}%`),
              ilike(customers.phone, `%${input.search}%`)
            )!
          );
        }
        const where = and(...conditions)!;
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(customers)
          .where(where);
        const items = await db
          .select()
          .from(customers)
          .where(where)
          .orderBy(asc(customers.code))
          .limit(limit)
          .offset(offset);
        return { items, total: countResult?.count ?? 0 };
      }),

    create: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          phone: z.string().optional(),
          email: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          taxNumber: z.string().optional(),
          creditLimit: z.string().default("0"),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db
          .insert(customers)
          .values({ ...input, tenantId: ctx.tenantId, balance: "0" });
        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `Ø¥Ø¶Ø§ÙØ© Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯: ${input.name} (${input.code})`,
        });
        return { success: true };
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          address: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db
          .update(customers)
          .set(data)
          .where(
            and(eq(customers.id, id), eq(customers.tenantId, ctx.tenantId!))
          );
        return { success: true };
      }),
  }),

  // â”€â”€â”€ Suppliers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  suppliers: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        const conditions = [
          eq(suppliers.isActive, true),
          eq(suppliers.tenantId, ctx.tenantId!),
          isNull(suppliers.deletedAt),
        ];
        if (input?.search) {
          conditions.push(
            or(
              ilike(suppliers.name, `%${input.search}%`),
              ilike(suppliers.code, `%${input.search}%`),
              ilike(suppliers.phone, `%${input.search}%`)
            )!
          );
        }
        const where = and(...conditions)!;
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(suppliers)
          .where(where);
        const items = await db
          .select()
          .from(suppliers)
          .where(where)
          .orderBy(asc(suppliers.code))
          .limit(limit)
          .offset(offset);
        return { items, total: countResult?.count ?? 0 };
      }),

    create: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          phone: z.string().optional(),
          email: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          taxNumber: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db
          .insert(suppliers)
          .values({ ...input, tenantId: ctx.tenantId, balance: "0" });
        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ±Ø¯ Ø¬Ø¯ÙŠØ¯: ${input.name} (${input.code})`,
        });
        return { success: true };
      }),

    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db
          .update(suppliers)
          .set(data)
          .where(
            and(eq(suppliers.id, id), eq(suppliers.tenantId, ctx.tenantId!))
          );
        return { success: true };
      }),
  }),

  // â”€â”€â”€ Sales & POS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sales: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            status: z
              .enum(["draft", "confirmed", "paid", "partial", "cancelled"])
              .optional(),
            customerId: z.number().optional(),
            search: z.string().trim().max(100).optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        const conditions: any[] = [eq(salesInvoices.tenantId, ctx.tenantId!)];
        if (input?.status)
          conditions.push(eq(salesInvoices.status, input.status));
        if (input?.customerId)
          conditions.push(eq(salesInvoices.customerId, input.customerId));
        if (input?.search)
          conditions.push(
            ilike(salesInvoices.invoiceNumber, `%${input.search}%`)
          );
        const where = and(...conditions);
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(salesInvoices)
          .where(where);
        const items = await db
          .select({
            ...getTableColumns(salesInvoices),
            customerName: customers.name,
          })
          .from(salesInvoices)
          .leftJoin(
            customers,
            and(
              eq(salesInvoices.customerId, customers.id),
              eq(salesInvoices.tenantId, customers.tenantId)
            )
          )
          .where(where)
          .orderBy(desc(salesInvoices.createdAt))
          .limit(limit)
          .offset(offset);
        return { items, total: countResult?.count ?? 0 };
      }),

    // Daily sales summary for the POS "daily report" / end-of-day cash-out.
    dailySummary: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_VIEW))
      .input(z.object({ date: z.string().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const empty = () => ({
          date: new Date().toISOString().slice(0, 10),
          invoiceCount: 0,
          totalSales: 0,
          totalPaid: 0,
          credit: 0,
          byMethod: { cash: 0, card: 0, transfer: 0, credit: 0, online: 0 },
          topProducts: [] as {
            productId: number;
            productName: string;
            qty: number;
            revenue: number;
          }[],
          previousDayTotal: 0,
        });
        if (!ctx.tenantId) return empty();
        const db = await getDb();
        if (!db) return empty();

        const ref = input?.date
          ? new Date(input.date + "T00:00:00")
          : new Date();
        const y = ref.getFullYear();
        const m = ref.getMonth();
        const d = ref.getDate();
        const start = new Date(y, m, d, 0, 0, 0, 0);
        const end = new Date(y, m, d, 23, 59, 59, 999);

        const invs = await db
          .select()
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.tenantId, ctx.tenantId!),
              gte(salesInvoices.createdAt, start),
              lte(salesInvoices.createdAt, end)
            )
          );
        const active = invs.filter(i => i.status !== "cancelled");

        let totalSales = 0;
        let totalPaid = 0;
        let credit = 0;
        const byMethod: Record<string, number> = {
          cash: 0,
          card: 0,
          transfer: 0,
          credit: 0,
          online: 0,
        };
        for (const inv of active) {
          const t = parseFloat(inv.total || "0");
          const p = parseFloat(inv.paidAmount || "0");
          totalSales += t;
          totalPaid += p;
          credit += Math.max(0, t - p);
          const pm = inv.paymentMethod || "cash";
          byMethod[pm] = (byMethod[pm] || 0) + t;
        }

        let topProducts: {
          productId: number;
          productName: string;
          qty: number;
          revenue: number;
        }[] = [];
        if (active.length > 0) {
          const items = await db
            .select({
              productId: salesInvoiceItems.productId,
              productName: salesInvoiceItems.productName,
              quantity: salesInvoiceItems.quantity,
              unitPrice: salesInvoiceItems.unitPrice,
              discount: salesInvoiceItems.discount,
            })
            .from(salesInvoiceItems)
            .where(
              inArray(
                salesInvoiceItems.invoiceId,
                active.map(i => i.id)
              )
            );
          const map = new Map<
            number,
            {
              productId: number;
              productName: string;
              qty: number;
              revenue: number;
            }
          >();
          for (const it of items) {
            const q = it.quantity;
            const rev =
              q * parseFloat(it.unitPrice || "0") -
              parseFloat(it.discount || "0");
            const cur = map.get(it.productId) || {
              productId: it.productId,
              productName: it.productName,
              qty: 0,
              revenue: 0,
            };
            cur.qty += q;
            cur.revenue += rev;
            map.set(it.productId, cur);
          }
          topProducts = [...map.values()]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        }

        const prevStart = new Date(y, m, d - 1, 0, 0, 0, 0);
        const prevEnd = new Date(y, m, d - 1, 23, 59, 59, 999);
        const prevInvs = await db
          .select({
            total: salesInvoices.total,
            status: salesInvoices.status,
          })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.tenantId, ctx.tenantId!),
              gte(salesInvoices.createdAt, prevStart),
              lte(salesInvoices.createdAt, prevEnd)
            )
          );
        const previousDayTotal = prevInvs
          .filter(i => i.status !== "cancelled")
          .reduce((s, i) => s + parseFloat(i.total || "0"), 0);

        return {
          date: start.toISOString().slice(0, 10),
          invoiceCount: active.length,
          totalSales,
          totalPaid,
          credit,
          byMethod,
          topProducts,
          previousDayTotal,
        };
      }),

    getInvoiceDetails: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [invoice] = await db
          .select()
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.id, input.id),
              eq(salesInvoices.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (!invoice) return null;
        const customer = invoice.customerId
          ? ((
              await db
                .select()
                .from(customers)
                .where(eq(customers.id, invoice.customerId))
                .limit(1)
            )[0] ?? null)
          : null;
        const items = await db
          .select()
          .from(salesInvoiceItems)
          .where(eq(salesInvoiceItems.invoiceId, invoice.id))
          .orderBy(asc(salesInvoiceItems.id));
        return { invoice, customer, items };
      }),

    create: tenantProcedure
      .input(
        z.object({
          customerId: z.number().optional(),
          items: z
            .array(
              z.object({
                productId: z.number(),
                productName: z.string().min(1),
                quantity: z.number().int().min(1),
                unitPrice: z
                  .string()
                  .refine(
                    v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
                    "Ø§Ù„Ø³Ø¹Ø± ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹"
                  ),
                discount: z.string().default("0"),
                // â”€â”€â”€ v7.4.0: Ù…Ø±ÙˆÙ†Ø© Ø§Ù„Ø³Ø·Ø± (ÙˆØ­Ø¯Ø© Ù‚ÙŠØ§Ø³ + Ø¶Ø±ÙŠØ¨Ø© Ù„ÙƒÙ„ Ø³Ø·Ø±) â”€â”€â”€
                unitId: z.number().int().positive().optional(),
                taxPct: z.number().min(0).max(100).optional(),
                taxCategoryId: z.number().int().positive().optional(),
              })
            )
            .min(1, "ÙŠØ¬Ø¨ Ø¥Ø¶Ø§ÙØ© ØµÙ†Ù ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„"),
          discount: z.string().default("0"),
          taxRate: z.string().default("0"),
          paymentMethod: z
            .enum([
              "cash",
              "card",
              "transfer",
              "credit",
              "online",
              "cash_yer",
              "cash_sar",
              "hawala",
              "shabab",
              "mobile_money",
              "bank_transfer",
            ])
            .default("cash"),
          paidAmount: z.string().default("0"),
          // â”€â”€â”€ Split / multi-method payments (POS) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          payments: z
            .array(
              z.object({
                method: z
                  .enum([
                    "cash",
                    "card",
                    "transfer",
                    "credit",
                    "online",
                    "cash_yer",
                    "cash_sar",
                    "hawala",
                    "shabab",
                    "mobile_money",
                    "bank_transfer",
                  ])
                  .default("cash"),
                amount: z.string().refine(v => {
                  const n = parseFloat(v);
                  return !isNaN(n) && n >= 0;
                }, "Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ ØºÙŠØ± Ø³Ø§Ù„Ø¨"),
                reference: z.string().optional(),
              })
            )
            .optional(),
          // â”€â”€â”€ Shift (ÙˆØ±Ø¯ÙŠØ©) linkage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          sessionId: z.number().optional(),
          holdId: z.number().optional(),
          loyaltyPointsRedeemed: z.number().int().min(0).optional(),
          notes: z.string().optional(),
          country: z.string().optional(),
          workSiteId: z.number().optional(),
          deviceId: z.number().optional(),
          lat: z.string().optional(),
          lng: z.string().optional(),
          salesRepId: z.string().optional(),
          // â”€â”€â”€ Multi-currency (Module B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          currency: z.string().optional(),
          currencyRate: z.string().optional(),
          idempotencyKey: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await seedDefaultAccountsForTenant(ctx.tenantId);

        // Validate amounts
        const discount = parseFloat(input.discount);
        const taxRate = parseFloat(input.taxRate);
        if (isNaN(discount) || discount < 0) throw new Error("Ø§Ù„Ø®ØµÙ… ØºÙŠØ± ØµØ­ÙŠØ­");
        if (isNaN(taxRate) || taxRate < 0 || taxRate > 100)
          throw new Error("Ù†Ø³Ø¨Ø© Ø§Ù„Ø¶Ø±ÙŠØ¨Ø© ØºÙŠØ± ØµØ­ÙŠØ­Ø©");
        const currency = (input.currency || "YER").toUpperCase();
        const currencyRate = Number(input.currencyRate || "1");
        if (!/^[A-Z]{3}$/.test(currency))
          throw new Error("Ø±Ù…Ø² Ø§Ù„Ø¹Ù…Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† ÙˆÙÙ‚ Ù…Ø¹ÙŠØ§Ø± ISO 4217");
        if (!Number.isFinite(currencyRate) || currencyRate <= 0)
          throw new Error("Ø³Ø¹Ø± Ø§Ù„ØµØ±Ù ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹");
        for (const item of input.items) {
          const unitPrice = Number(item.unitPrice);
          const lineDiscount = Number(item.discount || "0");
          if (
            !Number.isFinite(unitPrice) ||
            unitPrice < 0 ||
            !Number.isFinite(lineDiscount) ||
            lineDiscount < 0 ||
            lineDiscount > unitPrice * item.quantity
          )
            throw new Error(
              `Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø³Ø¹Ø± Ø£Ùˆ Ø§Ù„Ø®ØµÙ… ØºÙŠØ± ØµØ­ÙŠØ­Ø© Ù„Ù„ØµÙ†Ù Â«${item.productName}Â»`
            );
        }
        if (input.customerId) {
          const [customer] = await db
            .select({ id: customers.id })
            .from(customers)
            .where(
              and(
                eq(customers.id, input.customerId),
                eq(customers.tenantId, ctx.tenantId)
              )
            )
            .limit(1);
          if (!customer) throw new Error("Ø§Ù„Ø¹Ù…ÙŠÙ„ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ø§Ù„Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©");
        }

        const currencyRows = await db
          .select({ id: currencies.id, code: currencies.code })
          .from(currencies)
          .where(
            and(
              eq(currencies.tenantId, ctx.tenantId),
              eq(currencies.code, currency),
              eq(currencies.isActive, true)
            )
          )
          .limit(1);
        if (currency !== "YER" && currencyRows.length === 0) {
          const anyCurrencies = await db
            .select({ id: currencies.id })
            .from(currencies)
            .where(eq(currencies.tenantId, ctx.tenantId))
            .limit(1);
          if (anyCurrencies.length > 0 || !["SAR", "USD"].includes(currency))
            throw new Error("Ø§Ù„Ø¹Ù…Ù„Ø© ØºÙŠØ± Ù…Ø³Ø¬Ù„Ø© Ø£Ùˆ ØºÙŠØ± Ù…ÙØ¹Ù„Ø© ÙÙŠ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¤Ø³Ø³Ø©");
        }

        // Generate unique invoice number with date prefix + random suffix
        const now = new Date();
        const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const randPart = Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase();
        const invoiceNumber = `SI-${datePart}-${randPart}`;

        // Fetch all products at once (no N+1)
        const productIds = input.items.map(i => i.productId);
        const productRows = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, ctx.tenantId),
              inArray(products.id, productIds),
              isNull(products.deletedAt)
            )
          );
        const productMap = new Map(productRows.map(p => [p.id, p]));

        // Validate stock for GOODS items before any write (services have no stock)
        for (const item of input.items) {
          const prod = productMap.get(item.productId);
          if (!prod) throw new Error(`Ø§Ù„Ù…Ù†ØªØ¬ Ø±Ù‚Ù… ${item.productId} ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯`);
          if (prod.type === "goods" && prod.currentStock < item.quantity) {
            throw new Error(
              `Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ØºÙŠØ± ÙƒØ§ÙÙ Ù„Ù„Ù…Ù†ØªØ¬ "${prod.name}" â€” Ø§Ù„Ù…ØªÙˆÙØ±: ${prod.currentStock}, Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: ${item.quantity}`
            );
          }
        }

        // Calculate totals â€” shared engine with the pre-save review endpoint
        // (identical to the legacy formula when no per-line tax is used).
        const totals = computeInvoiceTotals({
          lines: input.items.map(item => ({
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice),
            discountAmount: parseFloat(item.discount || "0"),
            taxPct: item.taxPct ?? 0,
          })),
          headerDiscountAmount: discount,
          headerTaxPct: taxRate,
        });
        const subtotal = totals.subtotal;
        const taxAmount = totals.taxTotal;
        const total = totals.grandTotal;

        // â”€â”€â”€ Payments: explicit split list OR single legacy payment â”€â”€
        type PosPayLine = {
          method: NonNullable<typeof input.paymentMethod>;
          amount: string;
          reference?: string;
        };
        const payIn: PosPayLine[] =
          input.payments && input.payments.length > 0
            ? input.payments
                .filter(p => parseFloat(p.amount) > 0)
                .map(p => ({
                  method: p.method as PosPayLine["method"],
                  amount: p.amount,
                  reference: p.reference,
                }))
            : parseFloat(input.paidAmount) > 0
              ? [
                  {
                    method: input.paymentMethod as PosPayLine["method"],
                    amount: input.paidAmount,
                  },
                ]
              : [];
        const paidAmount = payIn.reduce(
          (sum, p) => sum + parseFloat(p.amount),
          0
        );
        const primaryMethod = payIn[0]?.method ?? input.paymentMethod;
        if (payIn.length > 0) {
          for (const p of payIn) {
            const amt = parseFloat(p.amount);
            if (isNaN(amt) || amt < 0)
              throw new Error("Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ØºÙŠØ± ØµØ­ÙŠØ­");
          }
        }
        if (isNaN(paidAmount) || paidAmount < 0)
          throw new Error("Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ØºÙŠØ± ØµØ­ÙŠØ­");
        if (paidAmount > total + 0.01)
          throw new Error("Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ÙŠØªØ¬Ø§ÙˆØ² Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙØ§ØªÙˆØ±Ø©");
        // Derive initial status from payment: fully paid / partial / unpaid
        const initialStatus =
          paidAmount >= total - 0.01
            ? "paid"
            : paidAmount > 0
              ? "partial"
              : "draft";

        // â”€â”€â”€ Governance: country, unified global code, ZATCA (Saudi) â”€â”€â”€â”€â”€
        const [settingsRow] = await db
          .select()
          .from(settings)
          .where(eq(settings.tenantId, ctx.tenantId!))
          .limit(1);
        const [tenantRow] = await db
          .select({ country: tenants.country })
          .from(tenants)
          .where(eq(tenants.id, ctx.tenantId!))
          .limit(1);
        const country =
          input.country ||
          settingsRow?.country ||
          tenantRow?.country ||
          "Ø§Ù„ÙŠÙ…Ù†";
        const globalCode = genGlobalCode({
          country,
          tenantId: ctx.tenantId!,
          branchId: null,
          userId: ctx.user?.id ?? null,
        });
        let zatcaPayload: string | undefined;
        if (isSaudiCountry(country)) {
          let zcfg: any;
          try {
            zcfg = settingsRow?.zatcaConfig
              ? JSON.parse(settingsRow.zatcaConfig)
              : {};
          } catch {
            zcfg = {};
          }
          const qr = buildZatcaQr(
            zcfg.sellerName || settingsRow?.institutionName || "",
            zcfg.vatNumber || "",
            new Date().toISOString(),
            total,
            taxAmount
          );
          const hash = invoiceHash(
            `${invoiceNumber}|${total}|${taxAmount}|${country}`
          );
          zatcaPayload = JSON.stringify({
            uuid: randomUUID(),
            qrBase64: qr,
            hash,
            stampedAt: new Date().toISOString(),
          });
        }

        // Execute all in a single transaction
        // Note: neon-serverless Pool supports transaction() via drizzle
        const result = await (db as any).transaction(async (tx: any) => {
          const [invoice] = await tx
            .insert(salesInvoices)
            .values({
              tenantId: ctx.tenantId!,
              country,
              workSiteId: input.workSiteId ?? null,
              deviceId: input.deviceId ?? null,
              lat: input.lat ?? null,
              lng: input.lng ?? null,
              globalCode,
              zatca: zatcaPayload ?? null,
              invoiceNumber,
              customerId: input.customerId || null,
              status: initialStatus,
              subtotal: subtotal.toString(),
              discount: input.discount,
              taxRate: input.taxRate,
              taxAmount: taxAmount.toString(),
              total: total.toString(),
              paidAmount: paidAmount.toString(),
              paymentMethod: primaryMethod,
              notes: input.notes || null,
              userId: ctx.user.id,
              currency: input.currency || "YER",
              currencyRate: currencyRate.toString(),
              currencyId: currencyRows[0]?.id ?? null,
            })
            .returning();

          // Insert all items (v7.4.0: unit + per-line tax persisted)
          const itemValues = input.items.map(item => ({
            invoiceId: invoice.id,
            productId: item.productId,
            unitId: item.unitId ?? null,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxPct: String(item.taxPct ?? 0),
            taxCategoryId: item.taxCategoryId ?? null,
            total: (
              parseFloat(item.unitPrice) * item.quantity -
              parseFloat(item.discount)
            ).toString(),
          }));
          await tx.insert(salesInvoiceItems).values(itemValues);

          // Atomic stock decrement (goods only) + inventory movement log
          for (const item of input.items) {
            const prod = productMap.get(item.productId);
            if (prod?.type === "service") continue; // services carry no stock

            // Deduct from global product stock (guarded â€” no oversell under concurrency)
            const globalDone = await tx
              .update(products)
              .set({
                currentStock: sql`${products.currentStock} - ${item.quantity}`,
              })
              .where(
                and(
                  eq(products.id, item.productId),
                  gte(products.currentStock, item.quantity)
                )
              )
              .returning({ id: products.id });
            if (globalDone.length === 0)
              throw new Error(
                `Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù…Ù† Â«${item.productName}Â» ØªØ¬Ø§ÙˆØ²Øª Ø§Ù„Ù…ØªÙˆÙØ±`
              );

            // Deduct from warehouse stock (default warehouse)
            const defaultWarehouse = await tx
              .select({ id: warehouses.id })
              .from(warehouses)
              .where(
                and(
                  eq(warehouses.tenantId, ctx.tenantId!),
                  eq(warehouses.isActive, true)
                )
              )
              .orderBy(asc(warehouses.code))
              .limit(1);

            const warehouseId = defaultWarehouse[0]?.id;
            if (warehouseId) {
              const stockDone = await tx
                .update(warehouseStock)
                .set({
                  quantity: sql`${warehouseStock.quantity} - ${item.quantity}`,
                  availableQty: sql`${warehouseStock.availableQty} - ${item.quantity}`,
                  lastMovementAt: new Date(),
                })
                .where(
                  and(
                    eq(warehouseStock.tenantId, ctx.tenantId!),
                    eq(warehouseStock.productId, item.productId),
                    eq(warehouseStock.warehouseId, warehouseId),
                    gte(warehouseStock.availableQty, item.quantity)
                  )
                )
                .returning({ id: warehouseStock.id });
              if (stockDone.length === 0)
                throw new Error(
                  `Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù…Ù† Â«${item.productName}Â» ØªØ¬Ø§ÙˆØ²Øª Ø§Ù„Ù…ØªÙˆÙØ± ÙÙŠ Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹`
                );

              // Consume valuation layers (FIFO)
              const layers = await tx
                .select()
                .from(inventoryValuationLayers)
                .where(
                  and(
                    eq(inventoryValuationLayers.tenantId, ctx.tenantId!),
                    eq(inventoryValuationLayers.productId, item.productId),
                    eq(inventoryValuationLayers.warehouseId, warehouseId),
                    eq(inventoryValuationLayers.isActive, true),
                    sql`${inventoryValuationLayers.remainingQty} > 0`
                  )
                )
                .orderBy(asc(inventoryValuationLayers.layerDate));

              let remainingQty = item.quantity;
              for (const layer of layers) {
                if (remainingQty <= 0) break;
                const consumeQty = Math.min(remainingQty, layer.remainingQty);
                await tx
                  .update(inventoryValuationLayers)
                  .set({
                    remainingQty: sql`${inventoryValuationLayers.remainingQty} - ${consumeQty}`,
                  })
                  .where(eq(inventoryValuationLayers.id, layer.id));
                remainingQty -= consumeQty;
              }
            }

            // Log inventory movement
            await tx.insert(inventoryMovements).values({
              tenantId: ctx.tenantId,
              productId: item.productId,
              warehouseId: warehouseId || null,
              type: "out",
              quantity: item.quantity,
              referenceId: invoice.id,
              referenceType: "sale",
              notes: `ÙØ§ØªÙˆØ±Ø© ${invoiceNumber}`,
            });
          }

          // Atomic customer balance update
          if (input.customerId) {
            const unpaidAmount = (total - paidAmount) * currencyRate;
            if (unpaidAmount > 0) {
              await tx
                .update(customers)
                .set({ balance: sql`${customers.balance} + ${unpaidAmount}` })
                .where(
                  and(
                    eq(customers.id, input.customerId),
                    eq(customers.tenantId, ctx.tenantId!)
                  )
                );
            }
          }

          // Auto-posting: double-entry journal for the invoice
          await postInvoiceGlEntries(tx, {
            kind: "sale",
            invoiceId: invoice.id,
            invoiceNumber,
            total,
            paidAmount,
            taxAmount,
            discount,
            paymentMethod: primaryMethod,
            branchId: null,
            userId: ctx.user.id,
            tenantId: ctx.tenantId!,
            exchangeRate: currencyRate,
            items: input.items.map(item => {
              const prod = productMap.get(item.productId);
              return {
                productId: item.productId,
                type: (prod?.type === "service" ? "service" : "goods") as
                  | "goods"
                  | "service",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                cost: prod?.purchasePrice,
                revenueAccountId: prod?.salesAccountId ?? null,
              };
            }),
          });

          // â”€â”€â”€ Pay registers: one row per payment method (source sales) â”€
          for (const p of payIn) {
            await tx.insert(payments).values({
              tenantId: ctx.tenantId!,
              source: "sales",
              invoiceId: invoice.id,
              amount: p.amount,
              paymentMethod: p.method,
              paymentDate: new Date(),
              notes: p.reference ? `Ù…Ø±Ø¬Ø¹: ${p.reference}` : null,
              userId: ctx.user.id,
              currencyId: currencyRows[0]?.id ?? null,
              exchangeRate: currencyRate.toString(),
              baseAmount: (Number(p.amount) * currencyRate).toFixed(2),
              idempotencyKey: input.idempotencyKey
                ? `${input.idempotencyKey}:${p.method}`
                : null,
            });
          }

          // â”€â”€â”€ Shift (ÙˆØ±Ø¯ÙŠØ©) linkage: keep a pos_orders record so the
          //     session reports (X/Z) can aggregate sales per session.
          if (input.sessionId) {
            await tx.insert(posOrders).values({
              tenantId: ctx.tenantId!,
              sessionId: input.sessionId,
              salesInvoiceId: invoice.id,
              total: total.toString(),
              paymentMethod: primaryMethod,
              status: "completed",
              createdById: ctx.user.id,
              currencyId: currencyRows[0]?.id ?? null,
            });
          }

          // â”€â”€â”€ Released hold (Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…Ø¹Ù„Ù‚Ø© Ø³Ø§Ø¨Ù‚Ø§Ù‹) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (input.holdId) {
            await tx
              .update(posHeldCarts)
              .set({
                status: "completed",
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(posHeldCarts.id, input.holdId),
                  eq(posHeldCarts.tenantId, ctx.tenantId!)
                )
              );
          }

          // â”€â”€â”€ Loyalty: redeem points and accrue 1pt per paid unit â”€â”€â”€â”€â”€
          const redeemPoints = input.loyaltyPointsRedeemed ?? 0;
          if (input.customerId && redeemPoints > 0) {
            const [cust] = await tx
              .select({ loyaltyPoints: customers.loyaltyPoints })
              .from(customers)
              .where(
                and(
                  eq(customers.id, input.customerId),
                  eq(customers.tenantId, ctx.tenantId!)
                )
              )
              .limit(1);
            const current = Number(cust?.loyaltyPoints ?? 0);
            if (current < redeemPoints)
              throw new Error("Ù†Ù‚Ø§Ø· Ø§Ù„ÙˆÙ„Ø§Ø¡ ØºÙŠØ± ÙƒØ§ÙÙŠØ© Ù„Ù„Ø¹Ù…ÙŠÙ„");
            await tx
              .update(customers)
              .set({
                loyaltyPoints: Math.max(
                  0,
                  current - redeemPoints + Math.floor(paidAmount)
                ),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(customers.id, input.customerId),
                  eq(customers.tenantId, ctx.tenantId!)
                )
              );
          } else if (input.customerId && paidAmount > 0) {
            await tx
              .update(customers)
              .set({
                loyaltyPoints: sql`${customers.loyaltyPoints} + ${Math.floor(paidAmount)}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(customers.id, input.customerId),
                  eq(customers.tenantId, ctx.tenantId!)
                )
              );
          }

          // Audit log
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª: ${invoiceNumber}`,
            details: `Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${total} â€” Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹: ${primaryMethod}${
              payIn.length > 0
                ? " â€” Ø¯ÙØ¹Ø§Øª: " +
                  payIn.map(p => `${p.method} ${p.amount}`).join(", ")
                : ""
            }`,
          });

          return {
            id: invoice.id,
            invoiceId: invoice.id,
            invoiceNumber,
            globalCode,
            zatcaView: zatcaPayload ? JSON.parse(zatcaPayload) : null,
          };
        });

        return { success: true, ...result };
      }),

    updateStatus: tenantProcedure
      .use(
        requirePermissions({
          any: [PERMISSIONS.POS_VOID_SALE, PERMISSIONS.POS_EDIT_SALE],
        })
      )
      .input(
        z.object({
          id: z.number(),
          status: z.enum([
            "draft",
            "confirmed",
            "paid",
            "partial",
            "cancelled",
          ]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db
          .select()
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.id, input.id),
              eq(salesInvoices.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (existing.length === 0) throw new Error("Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
        const inv = existing[0];
        if (inv.status === "cancelled" && input.status !== "cancelled") {
          throw new Error("Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…Ù„ØºØ§Ø© ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ¹ÙŠÙ„Ù‡Ø§");
        }
        if (inv.status === input.status)
          return { success: true, unchanged: true };

        // Cancelling a non-draft invoice reverses stock, customer balance and payments.
        // Status update + reversals run in ONE transaction so a retry after a crash
        // can never run the stock/balance restore twice.
        const cancelFlow =
          input.status === "cancelled" && inv.status !== "draft";
        const items = cancelFlow
          ? await db
              .select()
              .from(salesInvoiceItems)
              .where(eq(salesInvoiceItems.invoiceId, inv.id))
          : [];
        const itemPayments = cancelFlow
          ? await db
              .select()
              .from(payments)
              .where(
                and(
                  eq(payments.source, "sales"),
                  eq(payments.invoiceId, inv.id)
                )
              )
          : [];

        await (db as any).transaction(async (tx: any) => {
          if (cancelFlow) {
            for (const item of items) {
              await tx
                .update(products)
                .set({
                  currentStock: sql`${products.currentStock} + ${item.quantity}`,
                })
                .where(eq(products.id, item.productId));
              await tx.insert(inventoryMovements).values({
                tenantId: ctx.tenantId,
                productId: item.productId,
                type: "in",
                quantity: item.quantity,
                referenceId: inv.id,
                referenceType: "sale-cancel",
                notes: `Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© ${inv.invoiceNumber}`,
              });
            }
            if (inv.customerId) {
              const reversedUnpaid =
                parseFloat(inv.total) - parseFloat(inv.paidAmount);
              if (reversedUnpaid > 0) {
                await tx
                  .update(customers)
                  .set({
                    balance: sql`${customers.balance} - ${reversedUnpaid}`,
                  })
                  .where(eq(customers.id, inv.customerId));
              }
            }
            for (const p of itemPayments) {
              await tx
                .update(payments)
                .set({ notes: `Ù…Ø³ØªØ±Ø¯Ø© â€” Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© ${inv.invoiceNumber}` })
                .where(eq(payments.id, p.id));
            }
            await tx.insert(activityLogs).values({
              userId: ctx.user.id,
              action: `Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª: ${inv.invoiceNumber}`,
              details: `ØªÙ… Ø¹ÙƒØ³ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ÙˆØ§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„ÙØ§ØªÙˆØ±Ø©`,
            });
          }

          await tx
            .update(salesInvoices)
            .set({ status: input.status, updatedAt: new Date() })
            .where(eq(salesInvoices.id, inv.id));
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª ${inv.invoiceNumber} Ø¥Ù„Ù‰ "${input.status}"`,
          });
        });

        return { success: true };
      }),

    getItems: tenantProcedure
      .input(
        z.object({
          invoiceId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        const [invoice] = await db
          .select({ id: salesInvoices.id })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.id, input.invoiceId),
              eq(salesInvoices.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (!invoice) return [];
        return await db
          .select()
          .from(salesInvoiceItems)
          .where(eq(salesInvoiceItems.invoiceId, input.invoiceId));
      }),

    // â”€â”€â”€ POS Returns / Exchanges (Ù…Ø±ØªØ¬Ø¹ ÙƒØ§Ù…Ù„ Ø£Ùˆ Ø¬Ø²Ø¦ÙŠ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    returns: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_RETURNS))
      .input(
        z
          .object({
            invoiceId: z.number().optional(),
            sessionId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        const conditions: any[] = [eq(posReturns.tenantId, ctx.tenantId!)];
        if (input?.invoiceId)
          conditions.push(eq(posReturns.originalInvoiceId, input.invoiceId));
        if (input?.sessionId)
          conditions.push(eq(posReturns.sessionId, input.sessionId));
        return await db
          .select()
          .from(posReturns)
          .where(and(...conditions))
          .orderBy(desc(posReturns.createdAt))
          .limit(100);
      }),

    return: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_RETURNS))
      .input(
        z.object({
          invoiceId: z.number(),
          // â”€â”€â”€ Lines to return â€” quantity cannot exceed the invoice line â”€
          items: z
            .array(
              z.object({
                productId: z.number(),
                quantity: z.number().int().min(1),
                restock: z.boolean().default(true),
                condition: z.enum(["new", "used", "damaged"]).default("new"),
                serialNumbers: z.string().optional(),
              })
            )
            .min(1, "Ø£Ø¶Ù ØµÙ†ÙØ§Ù‹ ÙˆØ§Ø­Ø¯Ø§Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ Ù„Ù„Ø§Ø³ØªØ±Ø¬Ø§Ø¹"),
          refundMethod: z
            .enum([
              "cash",
              "card",
              "transfer",
              "credit",
              "online",
              "cash_yer",
              "cash_sar",
              "hawala",
              "shabab",
              "mobile_money",
              "bank_transfer",
            ])
            .default("cash"),
          refundReference: z.string().optional(),
          reason: z.string().optional(),
          notes: z.string().optional(),
          sessionId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [inv] = await db
          .select()
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.id, input.invoiceId),
              eq(salesInvoices.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (!inv) throw new Error("Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
        if (inv.status === "cancelled")
          throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ø³ØªØ±Ø¬Ø§Ø¹ ÙØ§ØªÙˆØ±Ø© Ù…Ù„ØºØ§Ø©");

        const invItems = await db
          .select()
          .from(salesInvoiceItems)
          .where(eq(salesInvoiceItems.invoiceId, inv.id));
        const itemMap = new Map(invItems.map(it => [it.productId, it]));

        // â”€â”€â”€ Validate requested quantities per invoice line â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        for (const line of input.items) {
          const orig = itemMap.get(line.productId);
          if (!orig)
            throw new Error(`ØµÙ†Ù ${line.productId} ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ Ø¨Ø§Ù„ÙØ§ØªÙˆØ±Ø©`);
          const alreadyReturned = await db
            .select({
              qty: sql<number>`coalesce(sum(${posReturnItems.quantity}), 0)::int`,
            })
            .from(posReturnItems)
            .innerJoin(posReturns, eq(posReturns.id, posReturnItems.returnId))
            .where(
              and(
                eq(posReturns.originalInvoiceId, inv.id),
                eq(posReturns.tenantId, ctx.tenantId!),
                eq(posReturnItems.productId, line.productId)
              )
            );
          const returnedQty = Number(alreadyReturned[0]?.qty ?? 0);
          if (returnedQty + line.quantity > orig.quantity)
            throw new Error(
              `ÙƒÙ…ÙŠØ© Ø§Ù„Ø§Ø³ØªØ±Ø¬Ø§Ø¹ Ù„Ù„ØµÙ†Ù "${orig.productName}" ØªØ¬Ø§ÙˆØ²Øª Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø¨Ø§Ø¹Ø© (Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ ${orig.quantity - returnedQty})`
            );
        }

        // â”€â”€â”€ Refund math: proportional share of global discount + tax â”€
        const subtotal = parseFloat(inv.subtotal || "0");
        const invDiscount = parseFloat(inv.discount || "0");
        const invTax = parseFloat(inv.taxAmount || "0");
        let returnSubtotal = 0;
        let returnLineDisc = 0;
        const lines: {
          productId: number;
          productName: string;
          quantity: number;
          unitPrice: string;
          discount: string;
          taxAmount: string;
          total: string;
          restock: boolean;
          condition: string;
          serialNumbers: string | null;
        }[] = [];

        for (const line of input.items) {
          const orig = itemMap.get(line.productId)!;
          const unitPrice = parseFloat(orig.unitPrice || "0");
          const lineDisc = parseFloat(orig.discount || "0");
          const qtyShare = line.quantity / orig.quantity;
          const lineUnitDisc = (lineDisc * line.quantity) / orig.quantity;
          returnSubtotal += unitPrice * line.quantity;
          returnLineDisc += lineUnitDisc;
          const netBeforeTax = unitPrice * line.quantity - lineUnitDisc;
          const taxShare =
            subtotal - invDiscount > 0
              ? (netBeforeTax / (subtotal - invDiscount)) * invTax
              : 0;
          lines.push({
            productId: line.productId,
            productName: orig.productName,
            quantity: line.quantity,
            unitPrice: orig.unitPrice,
            discount: lineUnitDisc.toString(),
            taxAmount: taxShare.toString(),
            total: (netBeforeTax + taxShare).toString(),
            restock: line.restock,
            condition: line.condition,
            serialNumbers: line.serialNumbers ?? null,
          });
        }

        const globalDiscShare =
          subtotal > 0 ? invDiscount * (returnSubtotal / subtotal) : 0;
        const refundAmount = Math.max(
          0,
          returnSubtotal - returnLineDisc - globalDiscShare
        );

        const returnNumber = `RT-${new Date().getFullYear()}${String(
          new Date().getMonth() + 1
        ).padStart(
          2,
          "0"
        )}${String(new Date().getDate()).padStart(2, "0")}-${Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase()}`;

        // â”€â”€â”€ Products needed for stock updates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const productRows = await db
          .select()
          .from(products)
          .where(
            and(
              inArray(
                products.id,
                input.items.map(i => i.productId)
              ),
              isNull(products.deletedAt)
            )
          );
        const productMap = new Map(productRows.map(p => [p.id, p]));
        let returnId = 0;

        await (db as any).transaction(async (tx: any) => {
          const [ret] = await tx
            .insert(posReturns)
            .values({
              tenantId: ctx.tenantId!,
              returnNumber,
              originalInvoiceId: inv.id,
              originalInvoiceNumber: inv.invoiceNumber,
              customerId: inv.customerId,
              branchId: null,
              sessionId: input.sessionId ?? null,
              refundMethod: input.refundMethod,
              refundReference: input.refundReference ?? null,
              reason: input.reason ?? null,
              status: "completed",
              refundAmount: refundAmount.toString(),
              createdById: ctx.user.id,
              processedById: ctx.user.id,
              notes: input.notes ?? null,
              processedAt: new Date(),
            })
            .returning();

          await tx
            .insert(posReturnItems)
            .values(lines.map(l => ({ ...l, returnId: ret.id })));

          // â”€â”€â”€ Restock (unless the item was damaged beyond return) â”€â”€â”€
          for (const line of lines) {
            const prod = productMap.get(line.productId);
            if (prod?.type === "service" || !line.restock) continue;

            await tx
              .update(products)
              .set({
                currentStock: sql`${products.currentStock} + ${line.quantity}`,
              })
              .where(eq(products.id, line.productId));

            const defaultWarehouse = await tx
              .select({ id: warehouses.id })
              .from(warehouses)
              .where(
                and(
                  eq(warehouses.tenantId, ctx.tenantId!),
                  eq(warehouses.isActive, true)
                )
              )
              .orderBy(asc(warehouses.code))
              .limit(1);
            const warehouseId = defaultWarehouse[0]?.id;
            if (warehouseId) {
              await tx
                .update(warehouseStock)
                .set({
                  quantity: sql`${warehouseStock.quantity} + ${line.quantity}`,
                  availableQty: sql`${warehouseStock.availableQty} + ${line.quantity}`,
                  lastMovementAt: new Date(),
                })
                .where(
                  and(
                    eq(warehouseStock.tenantId, ctx.tenantId!),
                    eq(warehouseStock.productId, line.productId),
                    eq(warehouseStock.warehouseId, warehouseId)
                  )
                );
            }

            await tx.insert(inventoryMovements).values({
              tenantId: ctx.tenantId,
              productId: line.productId,
              warehouseId: warehouseId || null,
              type: "in",
              quantity: line.quantity,
              referenceId: ret.id,
              referenceType: "sale-return",
              notes: `Ø§Ø³ØªØ±Ø¬Ø§Ø¹ ${returnNumber} Ù…Ù† ÙØ§ØªÙˆØ±Ø© ${inv.invoiceNumber}`,
            });
          }

          // â”€â”€â”€ Reflect on the customer receivable (credit-sold portion) â”€
          if (inv.customerId) {
            const unpaidBefore = Math.max(
              0,
              parseFloat(inv.total || "0") - parseFloat(inv.paidAmount || "0")
            );
            const reduceBy = Math.min(refundAmount, unpaidBefore);
            if (reduceBy > 0) {
              await tx
                .update(customers)
                .set({
                  balance: sql`${customers.balance} - ${reduceBy}`,
                })
                .where(
                  and(
                    eq(customers.id, inv.customerId),
                    eq(customers.tenantId, ctx.tenantId!)
                  )
                );
            }
          }

          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `Ø§Ø³ØªØ±Ø¬Ø§Ø¹ Ù…Ù† ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª: ${inv.invoiceNumber}`,
            details: `Ù‚ÙŠÙ…Ø© Ø§Ù„Ø§Ø³ØªØ±Ø¬Ø§Ø¹: ${refundAmount} â€” Ø§Ù„Ø·Ø±ÙŠÙ‚Ø©: ${input.refundMethod}`,
          });

          returnId = ret.id;
          return { id: ret.id, returnNumber };
        });

        return {
          success: true,
          returnId,
          returnNumber,
          refundAmount: refundAmount.toString(),
        };
      }),
  }),

  // â”€â”€â”€ Purchases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  purchases: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            status: z
              .enum(["draft", "confirmed", "paid", "partial", "cancelled"])
              .optional(),
            supplierId: z.number().optional(),
            search: z.string().trim().max(100).optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        const conditions: any[] = [
          eq(purchaseInvoices.tenantId, ctx.tenantId!),
        ];
        if (input?.status)
          conditions.push(eq(purchaseInvoices.status, input.status));
        if (input?.supplierId)
          conditions.push(eq(purchaseInvoices.supplierId, input.supplierId));
        if (input?.search)
          conditions.push(
            ilike(purchaseInvoices.invoiceNumber, `%${input.search}%`)
          );
        const where = and(...conditions);
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(purchaseInvoices)
          .where(where);
        const items = await db
          .select({
            ...getTableColumns(purchaseInvoices),
            supplierName: suppliers.name,
          })
          .from(purchaseInvoices)
          .leftJoin(
            suppliers,
            and(
              eq(purchaseInvoices.supplierId, suppliers.id),
              eq(purchaseInvoices.tenantId, suppliers.tenantId)
            )
          )
          .where(where)
          .orderBy(desc(purchaseInvoices.createdAt))
          .limit(limit)
          .offset(offset);
        return { items, total: countResult?.count ?? 0 };
      }),

    create: tenantProcedure
      .input(
        z.object({
          customerId: z.number().optional(),
          items: z
            .array(
              z.object({
                productId: z.number(),
                productName: z.string().min(1),
                quantity: z.number().int().min(1),
                unitPrice: z
                  .string()
                  .refine(
                    v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
                    "Ø§Ù„Ø³Ø¹Ø± ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹"
                  ),
                discount: z.string().default("0"),
              })
            )
            .min(1, "ÙŠØ¬Ø¨ Ø¥Ø¶Ø§ÙØ© ØµÙ†Ù ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„"),
          discount: z.string().default("0"),
          taxRate: z.string().default("0"),
          paymentMethod: z
            .enum(["cash", "card", "transfer", "credit", "online"])
            .default("cash"),
          paidAmount: z.string().default("0"),
          supplierId: z.number().optional(),
          poId: z.number().optional(),
          grnId: z.number().optional(),
          notes: z.string().optional(),
          country: z.string().optional(),
          workSiteId: z.number().optional(),
          deviceId: z.number().optional(),
          lat: z.string().optional(),
          lng: z.string().optional(),
          currency: z.string().length(3).default("YER"),
          exchangeRate: z.string().default("1"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await seedDefaultAccountsForTenant(ctx.tenantId);

        const discount = parseFloat(input.discount);
        const taxRate = parseFloat(input.taxRate);
        if (isNaN(discount) || discount < 0) throw new Error("Ø§Ù„Ø®ØµÙ… ØºÙŠØ± ØµØ­ÙŠØ­");
        if (isNaN(taxRate) || taxRate < 0 || taxRate > 100)
          throw new Error("Ù†Ø³Ø¨Ø© Ø§Ù„Ø¶Ø±ÙŠØ¨Ø© ØºÙŠØ± ØµØ­ÙŠØ­Ø©");

        const currencyCode = input.currency.toUpperCase();
        const exchangeRate = Number(input.exchangeRate);
        if (!/^[A-Z]{3}$/.test(currencyCode))
          throw new Error("Ø±Ù…Ø² Ø§Ù„Ø¹Ù…Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† ÙˆÙÙ‚ Ù…Ø¹ÙŠØ§Ø± ISO 4217");
        if (!Number.isFinite(exchangeRate) || exchangeRate <= 0)
          throw new Error("Ø³Ø¹Ø± Ø§Ù„ØµØ±Ù ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹");
        for (const item of input.items) {
          const unitPrice = Number(item.unitPrice);
          const lineDiscount = Number(item.discount || "0");
          if (
            !Number.isFinite(unitPrice) ||
            unitPrice < 0 ||
            !Number.isFinite(lineDiscount) ||
            lineDiscount < 0 ||
            lineDiscount > unitPrice * item.quantity
          )
            throw new Error(
              `Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø³Ø¹Ø± Ø£Ùˆ Ø§Ù„Ø®ØµÙ… ØºÙŠØ± ØµØ­ÙŠØ­Ø© Ù„Ù„ØµÙ†Ù Â«${item.productName}Â»`
            );
        }
        if (input.supplierId) {
          const [supplier] = await db
            .select({ id: suppliers.id })
            .from(suppliers)
            .where(
              and(
                eq(suppliers.id, input.supplierId),
                eq(suppliers.tenantId, ctx.tenantId)
              )
            )
            .limit(1);
          if (!supplier) throw new Error("Ø§Ù„Ù…ÙˆØ±Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ø§Ù„Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©");
        }
        const [purchaseCurrency] = await db
          .select({ id: currencies.id, code: currencies.code })
          .from(currencies)
          .where(
            and(
              eq(currencies.tenantId, ctx.tenantId),
              eq(currencies.code, currencyCode),
              eq(currencies.isActive, true)
            )
          )
          .limit(1);
        if (currencyCode !== "YER" && !purchaseCurrency) {
          const [configuredCurrency] = await db
            .select({ id: currencies.id })
            .from(currencies)
            .where(eq(currencies.tenantId, ctx.tenantId))
            .limit(1);
          if (configuredCurrency || !["SAR", "USD"].includes(currencyCode))
            throw new Error("Ø§Ù„Ø¹Ù…Ù„Ø© ØºÙŠØ± Ù…Ø³Ø¬Ù„Ø© Ø£Ùˆ ØºÙŠØ± Ù…ÙØ¹Ù„Ø© ÙÙŠ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¤Ø³Ø³Ø©");
        }

        const now = new Date();
        const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const randPart = Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase();
        const invoiceNumber = `PI-${datePart}-${randPart}`;

        // Fetch products once (no N+1)
        const productIds = input.items.map(i => i.productId);
        const productRows = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, ctx.tenantId),
              inArray(products.id, productIds),
              isNull(products.deletedAt)
            )
          );
        const productMap = new Map(productRows.map(p => [p.id, p]));

        // Validate all products exist
        for (const item of input.items) {
          if (!productMap.has(item.productId))
            throw new Error(`Ø§Ù„Ù…Ù†ØªØ¬ Ø±Ù‚Ù… ${item.productId} ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯`);
        }

        // â”€â”€ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø«Ù„Ø§Ø«ÙŠØ©: PO â† GRN â† ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø´Ø±Ø§Ø¡ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Ø¥Ø°Ø§ Ø­ÙØ¯Ø¯ Ø£Ù…Ø± Ø´Ø±Ø§Ø¡ Ùˆ/Ø£Ùˆ Ø³Ù†Ø¯ Ø§Ø³ØªÙ„Ø§Ù…ØŒ ØªÙÙØ­Øµ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù‚Ø¨Ù„ Ù†Ø´Ø£ØªÙ‡Ø§:
        //  â€¢ Ø£ØµÙ†Ø§Ù Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£ØµÙ†Ø§Ù Ù†ÙØ³Ù‡Ø§ ÙÙŠ Ø§Ù„Ø£Ù…Ø±.
        //  â€¢ Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…ÙÙˆØªØ±Ø© â‰¤ Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø³ØªÙ„Ù…Ø© ÙØ¹Ù„ÙŠØ§Ù‹ (Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯ Ø³Ù†Ø¯).
        //  â€¢ Ø§Ù„Ø³Ø¹Ø± Ø¶Ù…Ù† ØªÙØ§ÙˆØª 5% Ù…Ù‚Ø§Ø¨Ù„ Ø³Ø¹Ø± Ø§Ù„Ø£Ù…Ø±.
        //  â€¢ ØªØ·Ø§Ø¨Ù‚ Ø§Ù„Ù…ÙˆØ±Ø¯ Ø¨ÙŠÙ† Ø§Ù„Ù…Ø³ØªÙ†Ø¯Ø§Øª.
        let skipStockPosting = false;
        let effectivePoId: number | null = input.poId ?? null;
        let effectiveGrnId: number | null = input.grnId ?? null;
        if (input.grnId) {
          const [grn] = await db
            .select()
            .from(goodsReceipts)
            .where(
              and(
                eq(goodsReceipts.id, input.grnId),
                eq(goodsReceipts.tenantId, ctx.tenantId)
              )
            )
            .limit(1);
          if (!grn)
            throw new Error("Ø³Ù†Ø¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ Ø£Ùˆ Ù„ÙŠØ³ Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¤Ø³Ø³Ø©");
          if (grn.status !== "posted")
            throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ÙÙˆØªØ±Ø© Ø¹Ù„Ù‰ Ø³Ù†Ø¯ Ø§Ø³ØªÙ„Ø§Ù… ØºÙŠØ± Ù…Ø±Ø­Ù‘Ù„");
          if (input.poId && input.poId !== grn.poId)
            throw new Error("Ø£Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡ Ù„Ø§ ÙŠØªÙˆØ§ÙÙ‚ Ù…Ø¹ Ø³Ù†Ø¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù…");
          effectivePoId = grn.poId;
          effectiveGrnId = grn.id;
        }
        if (effectivePoId) {
          const [po] = await db
            .select()
            .from(purchaseOrders)
            .where(
              and(
                eq(purchaseOrders.id, effectivePoId),
                eq(purchaseOrders.tenantId, ctx.tenantId)
              )
            )
            .limit(1);
          if (!po) throw new Error("Ø£Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ Ø£Ùˆ Ù„ÙŠØ³ Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¤Ø³Ø³Ø©");
          if (po.status === "cancelled")
            throw new Error("Ø£Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡ Ù…Ù„ØºÙŠ â€” Ø§Ù„ÙÙˆØªØ±Ø© Ù…Ø±ÙÙˆØ¶Ø©");

          const supplierMatch = assertSupplierMatches(
            po.supplierId,
            input.supplierId ?? null
          );
          if (!supplierMatch.ok)
            throw new Error(
              supplierMatch.issues.map(i => i.message).join(" | ")
            );

          const orderLines = (
            await db
              .select()
              .from(purchaseOrderItems)
              .where(eq(purchaseOrderItems.poId, po.id))
          ).map(r => ({
            poItemId: r.id,
            productId: r.productId,
            productName: r.productName,
            quantity: r.quantity,
            receivedQty: r.receivedQty,
            unitPrice: r.unitPrice,
            discount: r.discount,
          }));

          const receiptLines: Array<{
            productId: number;
            productName: string;
            quantityReceived: number;
          }> = effectiveGrnId
            ? (
                await db
                  .select()
                  .from(goodsReceiptItems)
                  .where(eq(goodsReceiptItems.grnId, effectiveGrnId))
              ).map(r => ({
                productId: r.productId,
                productName: r.productName,
                quantityReceived: r.quantityReceived,
              }))
            : [];

          const invoiceLines = input.items.map(i => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
          }));

          const match = matchInvoiceAgainstPo(
            orderLines,
            invoiceLines,
            receiptLines
          );
          if (!match.ok)
            throw new Error(
              `ÙØ´Ù„Øª Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø«Ù„Ø§Ø«ÙŠØ© â€” ${match.issues.map(i => i.message).join(" | ")}`
            );

          // Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø±ÙØ­Ù‘Ù„ Ø¹Ù†Ø¯ Ø³Ù†Ø¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… â€” Ø§Ù„ÙÙˆØªØ±Ø© Ù„Ø§ ØªØ¹ÙŠØ¯ ØªØ±Ø­ÙŠÙ„Ù‡.
          skipStockPosting = Boolean(effectiveGrnId);
        }

        const subtotal = input.items.reduce(
          (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
          0
        );
        const taxAmount = ((subtotal - discount) * taxRate) / 100;
        const total = subtotal - discount + taxAmount;
        const paidAmount = parseFloat(input.paidAmount);
        if (isNaN(paidAmount) || paidAmount < 0)
          throw new Error("Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ØºÙŠØ± ØµØ­ÙŠØ­");
        if (paidAmount > total + 0.01)
          throw new Error("Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ÙŠØªØ¬Ø§ÙˆØ² Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙØ§ØªÙˆØ±Ø©");
        const initialStatus =
          paidAmount >= total - 0.01
            ? "paid"
            : paidAmount > 0
              ? "partial"
              : "draft";

        const [settingsRow] = await db
          .select()
          .from(settings)
          .where(eq(settings.tenantId, ctx.tenantId!))
          .limit(1);
        const [tenantRow] = await db
          .select({ country: tenants.country })
          .from(tenants)
          .where(eq(tenants.id, ctx.tenantId!))
          .limit(1);
        const country =
          input.country ||
          settingsRow?.country ||
          tenantRow?.country ||
          "Ø§Ù„ÙŠÙ…Ù†";
        const globalCode = genGlobalCode({
          country,
          tenantId: ctx.tenantId!,
          branchId: null,
          userId: ctx.user?.id ?? null,
        });
        let zatcaPayload: string | undefined;
        if (isSaudiCountry(country)) {
          let zcfg: any;
          try {
            zcfg = settingsRow?.zatcaConfig
              ? JSON.parse(settingsRow.zatcaConfig)
              : {};
          } catch {
            zcfg = {};
          }
          const qr = buildZatcaQr(
            zcfg.sellerName || settingsRow?.institutionName || "",
            zcfg.vatNumber || "",
            new Date().toISOString(),
            total,
            taxAmount
          );
          const hash = invoiceHash(
            `${invoiceNumber}|${total}|${taxAmount}|${country}`
          );
          zatcaPayload = JSON.stringify({
            uuid: randomUUID(),
            qrBase64: qr,
            hash,
            stampedAt: new Date().toISOString(),
          });
        }

        const result = await (db as any).transaction(async (tx: any) => {
          const [invoice] = await tx
            .insert(purchaseInvoices)
            .values({
              tenantId: ctx.tenantId!,
              country,
              workSiteId: input.workSiteId ?? null,
              deviceId: input.deviceId ?? null,
              lat: input.lat ?? null,
              lng: input.lng ?? null,
              globalCode,
              zatca: zatcaPayload ?? null,
              invoiceNumber,
              supplierId: input.supplierId || null,
              poId: effectivePoId,
              grnId: effectiveGrnId,
              status: initialStatus,
              subtotal: subtotal.toString(),
              discount: input.discount,
              taxRate: input.taxRate,
              taxAmount: taxAmount.toString(),
              total: total.toString(),
              paidAmount: input.paidAmount,
              paymentMethod: input.paymentMethod,
              notes: input.notes || null,
              userId: ctx.user.id,
              currencyId: purchaseCurrency?.id ?? null,
              currency: currencyCode,
              exchangeRate: exchangeRate.toString(),
              baseAmount: (total * exchangeRate).toFixed(2),
            })
            .returning();

          const itemValues = input.items.map(item => ({
            invoiceId: invoice.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: (
              parseFloat(item.unitPrice) * item.quantity -
              parseFloat(item.discount)
            ).toString(),
          }));
          await tx.insert(purchaseInvoiceItems).values(itemValues);

          // Atomic stock increment + warehouse stock + valuation layers
          // (ØªÙØªØ®Ø·Ù‰ Ø¹Ù†Ø¯ Ø§Ù„ÙÙˆØªØ±Ø© Ø¶Ø¯ Ø³Ù†Ø¯ Ø§Ø³ØªÙ„Ø§Ù… â€” Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø±ÙØ­Ù‘Ù„ ÙÙŠ Ø³Ù†Ø¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù…)
          if (!skipStockPosting) {
            for (const item of input.items) {
              if (productMap.get(item.productId)?.type === "service") continue;
              await tx
                .update(products)
                .set({
                  currentStock: sql`${products.currentStock} + ${item.quantity}`,
                })
                .where(eq(products.id, item.productId));

              // Get default warehouse
              const defaultWarehouse = await tx
                .select({ id: warehouses.id })
                .from(warehouses)
                .where(
                  and(
                    eq(warehouses.tenantId, ctx.tenantId!),
                    eq(warehouses.isActive, true)
                  )
                )
                .orderBy(asc(warehouses.code))
                .limit(1);

              const warehouseId = defaultWarehouse[0]?.id;
              if (warehouseId) {
                await tx
                  .insert(warehouseStock)
                  .values({
                    tenantId: ctx.tenantId!,
                    productId: item.productId,
                    warehouseId,
                    quantity: item.quantity,
                    reservedQty: 0,
                    availableQty: item.quantity,
                    lastMovementAt: new Date(),
                  })
                  .onConflictDoUpdate({
                    target: [
                      warehouseStock.productId,
                      warehouseStock.warehouseId,
                      warehouseStock.tenantId,
                    ],
                    set: {
                      quantity: sql`${warehouseStock.quantity} + ${item.quantity}`,
                      availableQty: sql`${warehouseStock.availableQty} + ${item.quantity}`,
                      lastMovementAt: new Date(),
                      updatedAt: new Date(),
                    },
                  });

                // Create valuation layer for purchase
                const unitCost = parseFloat(item.unitPrice) * exchangeRate;
                await tx.insert(inventoryValuationLayers).values({
                  tenantId: ctx.tenantId!,
                  productId: item.productId,
                  warehouseId,
                  layerDate: new Date(),
                  quantity: item.quantity,
                  remainingQty: item.quantity,
                  unitCost: unitCost.toFixed(4),
                  totalCost: (unitCost * item.quantity).toFixed(2),
                  sourceType: "purchase",
                  sourceId: invoice.id,
                  referenceType: "purchase_invoice",
                  referenceId: invoice.id,
                });
              }

              await tx.insert(inventoryMovements).values({
                tenantId: ctx.tenantId,
                productId: item.productId,
                warehouseId: warehouseId || null,
                type: "in",
                quantity: item.quantity,
                referenceId: invoice.id,
                referenceType: "purchase",
                notes: `ÙØ§ØªÙˆØ±Ø© Ø´Ø±Ø§Ø¡ ${invoiceNumber}`,
              });
            }
          }

          // Atomic supplier balance update
          if (input.supplierId) {
            const unpaidAmount = (total - paidAmount) * exchangeRate;
            if (unpaidAmount > 0) {
              await tx
                .update(suppliers)
                .set({ balance: sql`${suppliers.balance} + ${unpaidAmount}` })
                .where(
                  and(
                    eq(suppliers.id, input.supplierId),
                    eq(suppliers.tenantId, ctx.tenantId!)
                  )
                );
            }
          }

          // Auto-posting: double-entry journal for the invoice
          await postInvoiceGlEntries(tx, {
            kind: "purchase",
            invoiceId: invoice.id,
            invoiceNumber,
            total,
            paidAmount,
            branchId: null,
            userId: ctx.user.id,
            tenantId: ctx.tenantId!,
            exchangeRate,
          });

          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª: ${invoiceNumber}`,
            details: `Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${total} â€” Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹: ${input.paymentMethod}`,
          });

          return { invoiceId: invoice.id, invoiceNumber };
        });

        return { success: true, ...result };
      }),

    updateStatus: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum([
            "draft",
            "confirmed",
            "paid",
            "partial",
            "cancelled",
          ]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db
          .select()
          .from(purchaseInvoices)
          .where(
            and(
              eq(purchaseInvoices.id, input.id),
              eq(purchaseInvoices.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (existing.length === 0) throw new Error("Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
        const inv = existing[0];
        if (inv.status === "cancelled" && input.status !== "cancelled") {
          throw new Error("Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…Ù„ØºØ§Ø© ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ¹ÙŠÙ„Ù‡Ø§");
        }
        if (inv.status === input.status)
          return { success: true, unchanged: true };

        // Cancelling a non-draft invoice reverses stock, supplier balance and payments.
        // Status update + reversals run in ONE transaction (no double-restore on retry).
        const cancelFlow =
          input.status === "cancelled" && inv.status !== "draft";
        const items = cancelFlow
          ? await db
              .select()
              .from(purchaseInvoiceItems)
              .where(eq(purchaseInvoiceItems.invoiceId, inv.id))
          : [];

        await (db as any).transaction(async (tx: any) => {
          if (cancelFlow) {
            for (const item of items) {
              const globalDone = await tx
                .update(products)
                .set({
                  currentStock: sql`${products.currentStock} - ${item.quantity}`,
                })
                .where(
                  and(
                    eq(products.id, item.productId),
                    gte(products.currentStock, item.quantity)
                  )
                )
                .returning({ id: products.id });
              if (globalDone.length === 0)
                throw new Error(
                  `Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ØºÙŠØ± ÙƒØ§ÙÙ Ù„Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø´Ø±Ø§Ø¡ â€” Ø§Ù„Ù…Ù†ØªØ¬ ${item.productId}`
                );

              // Update warehouse stock and valuation layers
              const defaultWarehouse = await tx
                .select({ id: warehouses.id })
                .from(warehouses)
                .where(
                  and(
                    eq(warehouses.tenantId, ctx.tenantId!),
                    eq(warehouses.isActive, true)
                  )
                )
                .orderBy(asc(warehouses.code))
                .limit(1);

              const warehouseId = defaultWarehouse[0]?.id;
              if (warehouseId) {
                const stockDone = await tx
                  .update(warehouseStock)
                  .set({
                    quantity: sql`${warehouseStock.quantity} - ${item.quantity}`,
                    availableQty: sql`${warehouseStock.availableQty} - ${item.quantity}`,
                    lastMovementAt: new Date(),
                  })
                  .where(
                    and(
                      eq(warehouseStock.tenantId, ctx.tenantId!),
                      eq(warehouseStock.productId, item.productId),
                      eq(warehouseStock.warehouseId, warehouseId),
                      gte(warehouseStock.availableQty, item.quantity)
                    )
                  )
                  .returning({ id: warehouseStock.id });
                if (stockDone.length === 0)
                  throw new Error(
                    `Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ØºÙŠØ± ÙƒØ§ÙÙ Ù„Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø´Ø±Ø§Ø¡ ÙÙŠ Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹`
                  );

                // Mark valuation layers from this purchase as inactive
                await tx
                  .update(inventoryValuationLayers)
                  .set({ isActive: false, updatedAt: new Date() })
                  .where(
                    and(
                      eq(inventoryValuationLayers.tenantId, ctx.tenantId!),
                      eq(inventoryValuationLayers.productId, item.productId),
                      eq(inventoryValuationLayers.warehouseId, warehouseId),
                      eq(inventoryValuationLayers.sourceType, "purchase"),
                      eq(inventoryValuationLayers.sourceId, inv.id)
                    )
                  );
              }

              await tx.insert(inventoryMovements).values({
                tenantId: ctx.tenantId,
                productId: item.productId,
                warehouseId: warehouseId || null,
                type: "out",
                quantity: item.quantity,
                referenceId: inv.id,
                referenceType: "purchase-cancel",
                notes: `Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© Ø´Ø±Ø§Ø¡ ${inv.invoiceNumber}`,
              });
            }
            if (inv.supplierId) {
              const reversedUnpaid =
                parseFloat(inv.total) - parseFloat(inv.paidAmount);
              if (reversedUnpaid > 0) {
                await tx
                  .update(suppliers)
                  .set({
                    balance: sql`${suppliers.balance} - ${reversedUnpaid}`,
                  })
                  .where(eq(suppliers.id, inv.supplierId));
              }
            }
            await tx.insert(activityLogs).values({
              userId: ctx.user.id,
              action: `Ø¥Ù„ØºØ§Ø¡ ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª: ${inv.invoiceNumber}`,
              details: `ØªÙ… Ø¹ÙƒØ³ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ÙˆØ§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„ÙØ§ØªÙˆØ±Ø©`,
            });
          }

          await tx
            .update(purchaseInvoices)
            .set({ status: input.status, updatedAt: new Date() })
            .where(eq(purchaseInvoices.id, inv.id));
          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª ${inv.invoiceNumber} Ø¥Ù„Ù‰ "${input.status}"`,
          });
        });

        return { success: true };
      }),

    getItems: tenantProcedure
      .input(
        z.object({
          invoiceId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        const [invoice] = await db
          .select({ id: purchaseInvoices.id })
          .from(purchaseInvoices)
          .where(
            and(
              eq(purchaseInvoices.id, input.invoiceId),
              eq(purchaseInvoices.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (!invoice) return [];
        return await db
          .select()
          .from(purchaseInvoiceItems)
          .where(eq(purchaseInvoiceItems.invoiceId, input.invoiceId));
      }),
  }),

  // â”€â”€â”€ Orders & Distribution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  orders: router({
    // Public order tracking for the customer portal: matches ONLY by order
    // reference number or the guest's own phone number. Never exposes the
    // full order list or other customers' data to anonymous visitors.
    track: publicProcedure
      .input(
        z.object({
          query: z.string().min(6, "Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ø·Ù„Ø¨ Ø£Ùˆ Ù‡Ø§ØªÙ ØµØ­ÙŠØ­").max(50),
        })
      )
      .query(async ({ input, ctx }) => {
        // Public lookup: moderate per-IP budget against enumeration.
        const ip = ctx.req.ip || "unknown";
        const rl = checkRateLimit(`track:${ip}`, 30, 60 * 60 * 1000);
        if (!rl.ok) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Ø·Ù„Ø¨Ø§Øª Ø¨Ø­Ø« ÙƒØ«ÙŠØ±Ø© â€” Ø£Ø¹Ø¯ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ø¨Ø¹Ø¯ ${rl.retryAfterSec} Ø«Ø§Ù†ÙŠØ©.`,
          });
        }
        const db = await getDb();
        if (!db) return { items: [] };
        const tid =
          Number.parseInt(
            (ctx.req.headers["x-tenant-id"] as string) || "",
            10
          ) || 1;
        const q = input.query.trim();
        const rows = await db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            status: orders.status,
            total: orders.total,
            createdAt: orders.createdAt,
            deliveryAddress: orders.deliveryAddress,
            deliveryNotes: orders.deliveryNotes,
            assignedTo: orders.assignedTo,
          })
          .from(orders)
          .leftJoin(customers, eq(orders.customerId, customers.id))
          .where(
            and(
              eq(orders.tenantId, tid),
              or(
                ilike(orders.orderNumber, `%${q}%`),
                ilike(customers.phone, `%${q}%`)
              )
            )
          )
          .orderBy(desc(orders.createdAt))
          .limit(20);
        return { items: rows };
      }),

    // Tenant-scoped listing â€” consumed by the authenticated Commercial page.
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            status: z
              .enum([
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
              ])
              .optional(),
            search: z.string().trim().max(100).optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        const conditions: any[] = [eq(orders.tenantId, ctx.tenantId!)];
        if (input?.status) conditions.push(eq(orders.status, input.status));
        if (input?.search)
          conditions.push(ilike(orders.orderNumber, `%${input.search}%`));
        const where = and(...conditions);
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(orders)
          .where(where);
        const items = await db
          .select({ ...getTableColumns(orders), customerName: customers.name })
          .from(orders)
          .leftJoin(
            customers,
            and(
              eq(orders.customerId, customers.id),
              eq(orders.tenantId, customers.tenantId)
            )
          )
          .where(where)
          .orderBy(desc(orders.createdAt))
          .limit(limit)
          .offset(offset);
        return { items, total: countResult?.count ?? 0 };
      }),

    create: tenantProcedure
      .input(
        z.object({
          customerId: z.number().optional(),
          items: z
            .array(
              z.object({
                productId: z.number(),
                productName: z.string().min(1),
                quantity: z.number().int().min(1),
                unitPrice: z
                  .string()
                  .refine(
                    v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
                    "Ø§Ù„Ø³Ø¹Ø± ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹"
                  ),
                // â”€â”€â”€ v7.4.0: Ù…Ø±ÙˆÙ†Ø© Ø§Ù„Ø³Ø·Ø± (ÙˆØ­Ø¯Ø© Ù‚ÙŠØ§Ø³ + Ø¶Ø±ÙŠØ¨Ø© Ù„ÙƒÙ„ Ø³Ø·Ø±) â”€â”€â”€
                unitId: z.number().int().positive().optional(),
                taxPct: z.number().min(0).max(100).optional(),
              })
            )
            .min(1, "ÙŠØ¬Ø¨ Ø¥Ø¶Ø§ÙØ© ØµÙ†Ù ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„"),
          deliveryAddress: z.string().optional(),
          deliveryDate: z.string().optional(),
          deliveryNotes: z.string().optional(),
          assignedTo: z.string().optional(),
          country: z.string().optional(),
          workSiteId: z.number().optional(),
          deviceId: z.number().optional(),
          lat: z.string().optional(),
          lng: z.string().optional(),
          idempotencyKey: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input.idempotencyKey) {
          const existingOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.idempotencyKey, input.idempotencyKey))
            .limit(1);
          if (existingOrders.length > 0) {
            return {
              id: existingOrders[0].id,
              orderNumber: existingOrders[0].orderNumber,
            };
          }
        }

        // Merge duplicate cart lines, then validate products exist
        const mergedMap = new Map<number, number>();
        for (const it of input.items)
          mergedMap.set(
            it.productId,
            (mergedMap.get(it.productId) || 0) + it.quantity
          );
        const effectiveItems = Array.from(mergedMap.entries()).map(
          ([productId, quantity]) => {
            const orig = input.items.find(i => i.productId === productId)!;
            return {
              productId,
              quantity,
              unitPrice: orig.unitPrice,
              productName: orig.productName,
              unitId: orig.unitId ?? null,
              taxPct: orig.taxPct ?? 0,
            };
          }
        );
        const productIds = effectiveItems.map(i => i.productId);
        const productRows = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, ctx.tenantId),
              inArray(products.id, productIds),
              isNull(products.deletedAt)
            )
          );
        if (productRows.length !== productIds.length)
          throw new Error("ÙˆØ§Ø­Ø¯ Ø£Ùˆ Ø£ÙƒØ«Ø± Ù…Ù† Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
        const productTypeById = new Map(
          productRows.map(product => [product.id, product.type])
        );
        if (input.customerId) {
          const [customer] = await db
            .select({ id: customers.id })
            .from(customers)
            .where(
              and(
                eq(customers.id, input.customerId),
                eq(customers.tenantId, ctx.tenantId)
              )
            )
            .limit(1);
          if (!customer) throw new Error("Ø§Ù„Ø¹Ù…ÙŠÙ„ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ø§Ù„Ù…Ø¤Ø³Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©");
        }

        const total = effectiveItems.reduce(
          (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
          0
        );
        const now = new Date();
        const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const randPart = Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase();
        const orderNumber = `ORD-${datePart}-${randPart}`;

        const [settingsRow] = await db
          .select()
          .from(settings)
          .where(eq(settings.tenantId, ctx.tenantId!))
          .limit(1);
        const [tenantRow] = await db
          .select({ country: tenants.country })
          .from(tenants)
          .where(eq(tenants.id, ctx.tenantId!))
          .limit(1);
        const country =
          input.country ||
          settingsRow?.country ||
          tenantRow?.country ||
          "Ø§Ù„ÙŠÙ…Ù†";
        const globalCode = genGlobalCode({
          country,
          tenantId: ctx.tenantId!,
          branchId: null,
          userId: ctx.user?.id ?? null,
        });

        const result = await (db as any).transaction(async (tx: any) => {
          const [order] = await tx
            .insert(orders)
            .values({
              tenantId: ctx.tenantId!,
              country,
              workSiteId: input.workSiteId ?? null,
              deviceId: input.deviceId ?? null,
              lat: input.lat ?? null,
              lng: input.lng ?? null,
              globalCode,
              orderNumber,
              customerId: input.customerId || null,
              total: total.toString(),
              deliveryAddress: input.deliveryAddress || null,
              deliveryDate: input.deliveryDate
                ? new Date(input.deliveryDate)
                : null,
              deliveryNotes: input.deliveryNotes || null,
              assignedTo: input.assignedTo || null,
              userId: ctx.user.id,
              idempotencyKey: input.idempotencyKey ?? null,
            })
            .returning();

          const itemValues = effectiveItems.map(item => ({
            orderId: order.id,
            productId: item.productId,
            unitId: item.unitId ?? null,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxPct: String(item.taxPct ?? 0),
            total: (parseFloat(item.unitPrice) * item.quantity).toString(),
          }));
          await tx.insert(orderItems).values(itemValues);

          // Reserve stock atomically (guarded decrement â€” no oversell under concurrency)
          for (const item of itemValues) {
            if (productTypeById.get(item.productId) === "service") continue;
            const updated = await tx
              .update(products)
              .set({
                currentStock: sql`${products.currentStock} - ${item.quantity}`,
              })
              .where(
                and(
                  eq(products.id, item.productId),
                  gte(products.currentStock, item.quantity)
                )
              )
              .returning({ id: products.id });
            if (updated.length === 0)
              throw new Error(
                `Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù…Ù† Â«${item.productName}Â» ØªØ¬Ø§ÙˆØ²Øª Ø§Ù„Ù…ØªÙˆÙØ± Ø¹Ù†Ø¯ ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø·Ù„Ø¨`
              );
            await tx.insert(inventoryMovements).values({
              tenantId: ctx.tenantId,
              productId: item.productId,
              type: "out",
              quantity: item.quantity,
              referenceId: order.id,
              referenceType: "order",
              notes: `Ø·Ù„Ø¨ ØªÙˆØ²ÙŠØ¹ ${orderNumber}`,
            });
          }

          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨ ØªÙˆØ²ÙŠØ¹: ${orderNumber}`,
            details: `Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${total}`,
          });

          return { orderId: order.id, orderNumber };
        });

        return { success: true, ...result };
      }),

    updateStatus: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum([
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
          ]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Validate current status allows this transition
        const existing = await db
          .select()
          .from(orders)
          .where(
            and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId!))
          )
          .limit(1);
        if (existing.length === 0) throw new Error("Ø§Ù„Ø·Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
        const currentStatus = existing[0].status;
        if (currentStatus === "delivered") {
          throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØºÙŠÙŠØ± Ø­Ø§Ù„Ø© Ø·Ù„Ø¨ Ù…ÙØ³Ù„Ù‘Ù… Ø£Ùˆ Ù…ÙÙ„ØºÙ‰");
        }
        if (currentStatus === "cancelled" && input.status !== "cancelled") {
          throw new Error("Ø§Ù„Ø·Ù„Ø¨ Ù…ÙÙ„ØºÙ‰ ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ¹ÙŠÙ„Ù‡");
        }

        const result = await (db as any).transaction(async (tx: any) => {
          await tx
            .update(orders)
            .set({ status: input.status, updatedAt: new Date() })
            .where(
              and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId!))
            );

          // Cancelling an order releases its reserved stock â€” unless it was already
          // converted into a sales invoice (the invoice owns the stock then).
          if (input.status === "cancelled") {
            const linked = await tx
              .select()
              .from(salesInvoices)
              .where(ilike(salesInvoices.notes, `%${existing[0].orderNumber}%`))
              .limit(1);
            if (linked.length === 0) {
              const items = await tx
                .select()
                .from(orderItems)
                .where(eq(orderItems.orderId, input.id));
              const reservedProducts = items.length
                ? await tx
                    .select({ id: products.id, type: products.type })
                    .from(products)
                    .where(
                      and(
                        eq(products.tenantId, ctx.tenantId!),
                        inArray(
                          products.id,
                          items.map((item: any) => item.productId)
                        )
                      )
                    )
                : [];
              const reservedTypes = new Map(
                reservedProducts.map((product: any) => [
                  product.id,
                  product.type,
                ])
              );
              for (const it of items) {
                if (reservedTypes.get(it.productId) === "service") continue;
                await tx
                  .update(products)
                  .set({
                    currentStock: sql`${products.currentStock} + ${it.quantity}`,
                  })
                  .where(eq(products.id, it.productId));
                await tx.insert(inventoryMovements).values({
                  tenantId: ctx.tenantId,
                  productId: it.productId,
                  type: "in",
                  quantity: it.quantity,
                  referenceId: input.id,
                  referenceType: "order",
                  notes: `Ø¥Ù„ØºØ§Ø¡ Ø·Ù„Ø¨ ${existing[0].orderNumber}`,
                });
              }
            }
          }

          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨ #${input.id} Ù…Ù† "${currentStatus}" Ø¥Ù„Ù‰ "${input.status}"`,
          });
          return { success: true };
        });

        return result;
      }),

    // Convert a (web/store) order into an official sales invoice + auto-posting GL entries
    // Stock was already reserved at order time â€” no second deduction happens here.
    createSaleInvoice: tenantProcedure
      .input(
        z.object({
          orderId: z.number(),
          paymentMethod: z
            .enum(["cash", "card", "transfer", "credit", "online"])
            .default("cash"),
          paidAmount: z
            .string()
            .default("0")
            .refine(v => {
              const n = parseFloat(v);
              return !isNaN(n) && isFinite(n) && n >= 0;
            }, "Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ØºÙŠØ± ØµØ­ÙŠØ­"),
          notes: z.string().optional(),
          salesRepId: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await seedDefaultAccountsForTenant(ctx.tenantId);

        const [order] = await db
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.id, input.orderId),
              eq(orders.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);
        if (!order) throw new Error("Ø§Ù„Ø·Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");
        if (order.status === "cancelled")
          throw new Error("Ø§Ù„Ø·Ù„Ø¨ Ù…ÙÙ„ØºÙ‰ ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† ØªØ­ÙˆÙŠÙ„Ù‡");

        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        if (items.length === 0) throw new Error("Ø§Ù„Ø·Ù„Ø¨ Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø£ØµÙ†Ø§ÙØ§Ù‹");

        const subtotal = items.reduce(
          (s, it) => s + parseFloat(it.unitPrice || "0") * it.quantity,
          0
        );
        const total = subtotal;
        const paidAmount = parseFloat(input.paidAmount || "0");
        if (paidAmount > total + 0.01)
          throw new Error("Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ ÙŠØªØ¬Ø§ÙˆØ² Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙØ§ØªÙˆØ±Ø©");
        const status =
          paidAmount >= total - 0.01
            ? "paid"
            : paidAmount > 0
              ? "partial"
              : "confirmed";

        const now = new Date();
        const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const randPart = Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase();
        const invoiceNumber = `SI-${datePart}-${randPart}`;

        const result = await (db as any).transaction(async (tx: any) => {
          // Duplicate-conversion guard lives INSIDE the transaction so two concurrent
          // conversions of the same order cannot both succeed.
          const prior = await tx
            .select()
            .from(salesInvoices)
            .where(
              and(
                eq(salesInvoices.tenantId, ctx.tenantId!),
                eq(salesInvoices.orderId, order.id)
              )
            )
            .limit(1);
          if (prior.length > 0)
            throw new Error(
              `ØªÙ… ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨ Ù…Ø³Ø¨Ù‚Ø§Ù‹ Ø¥Ù„Ù‰ ÙØ§ØªÙˆØ±Ø© ${prior[0].invoiceNumber}`
            );

          const fresh = await tx
            .select()
            .from(orders)
            .where(eq(orders.id, order.id))
            .limit(1);
          if (fresh.length === 0 || fresh[0].status === "cancelled")
            throw new Error("Ø§Ù„Ø·Ù„Ø¨ Ù…ÙÙ„ØºÙ‰ ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† ØªØ­ÙˆÙŠÙ„Ù‡");

          const [invoice] = await tx
            .insert(salesInvoices)
            .values({
              invoiceNumber,
              customerId: order.customerId || null,
              orderId: order.id,
              status,
              subtotal: subtotal.toFixed(2),
              discount: "0",
              taxRate: "0",
              taxAmount: "0",
              total: total.toFixed(2),
              paidAmount: paidAmount.toFixed(2),
              paymentMethod: input.paymentMethod,
              notes: input.notes || null,
              salesRepId: input.salesRepId ?? null,
              userId: ctx.user.id,
            })
            .returning();

          const itemValues = items.map(it => ({
            invoiceId: invoice.id,
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: "0",
            total: (parseFloat(it.unitPrice || "0") * it.quantity).toFixed(2),
          }));
          await tx.insert(salesInvoiceItems).values(itemValues);

          const unpaid = total - paidAmount;
          if (order.customerId && unpaid > 0.009) {
            await tx
              .update(customers)
              .set({ balance: sql`${customers.balance} + ${unpaid}` })
              .where(eq(customers.id, order.customerId));
          }

          await postInvoiceGlEntries(tx, {
            kind: "sale",
            invoiceId: invoice.id,
            invoiceNumber,
            total,
            paidAmount,
            branchId: null,
            userId: ctx.user.id,
            tenantId: ctx.tenantId!,
          });

          // Never regress an order that is already past "pending" (processing/shipped/etc.)
          if (fresh[0].status === "pending") {
            await tx
              .update(orders)
              .set({ status: "confirmed", updatedAt: new Date() })
              .where(eq(orders.id, order.id));
          }

          await tx.insert(activityLogs).values({
            userId: ctx.user.id,
            action: `ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨ ${order.orderNumber} Ø¥Ù„Ù‰ ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª ${invoiceNumber}`,
            details: `Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${total.toFixed(2)} â€” Ø§Ù„Ù…Ø¯ÙÙˆØ¹: ${paidAmount.toFixed(2)} (Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ù…Ø­Ø¬ÙˆØ² Ù…Ù† ÙˆÙ‚Øª Ø§Ù„Ø·Ù„Ø¨)`,
          });

          return { invoiceId: invoice.id, invoiceNumber };
        });

        return { success: true, ...result };
      }),

    // Authenticated only â€” order line items may reference internal pricing.
    getItems: tenantProcedure
      .input(
        z.object({
          orderId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        const order = await db
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(eq(orders.id, input.orderId), eq(orders.tenantId, ctx.tenantId))
          )
          .limit(1);
        if (order.length === 0) return [];
        return await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, input.orderId));
      }),
  }),

  // â”€â”€â”€ Commercial Dashboard Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  commercial: router({
    getStats: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId)
        return {
          lowStock: [],
          topCustomers: [],
          monthStats: { salesTotal: 0, purchasesTotal: 0, ordersCount: 0 },
          counts: {
            products: 0,
            customers: 0,
            suppliers: 0,
            sales: 0,
            purchases: 0,
            orders: 0,
          },
        };
      const db = await getDb();
      if (!db)
        return {
          lowStock: [],
          topCustomers: [],
          monthStats: { salesTotal: 0, purchasesTotal: 0, ordersCount: 0 },
          counts: {
            products: 0,
            customers: 0,
            suppliers: 0,
            sales: 0,
            purchases: 0,
            orders: 0,
          },
        };

      const allProducts = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            eq(products.tenantId, ctx.tenantId!),
            isNull(products.deletedAt)
          )
        );
      const lowStock = allProducts
        .filter(p => p.currentStock <= p.minStock)
        .sort(
          (a, b) => a.currentStock - a.minStock - (b.currentStock - b.minStock)
        )
        .slice(0, 10);

      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );
      const [salesAgg] = await db
        .select({
          total: sql<string>`coalesce(sum(${salesInvoices.total}), '0')`,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId!),
            gte(salesInvoices.invoiceDate, monthStart),
            ne(salesInvoices.status, "cancelled")
          )
        );
      const [purchasesAgg] = await db
        .select({
          total: sql<string>`coalesce(sum(${purchaseInvoices.total}), '0')`,
        })
        .from(purchaseInvoices)
        .where(
          and(
            eq(purchaseInvoices.tenantId, ctx.tenantId!),
            gte(purchaseInvoices.invoiceDate, monthStart),
            ne(purchaseInvoices.status, "cancelled")
          )
        );
      const [ordersAgg] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(
          and(
            eq(orders.tenantId, ctx.tenantId!),
            gte(orders.createdAt, monthStart)
          )
        );

      const [productsCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            eq(products.tenantId, ctx.tenantId!),
            isNull(products.deletedAt)
          )
        );
      const [customersCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(
          and(
            eq(customers.isActive, true),
            eq(customers.tenantId, ctx.tenantId!),
            isNull(customers.deletedAt)
          )
        );
      const [suppliersCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.isActive, true),
            eq(suppliers.tenantId, ctx.tenantId!),
            isNull(suppliers.deletedAt)
          )
        );
      const [salesCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId!),
            ne(salesInvoices.status, "cancelled")
          )
        );
      const [purchasesCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(purchaseInvoices)
        .where(
          and(
            eq(purchaseInvoices.tenantId, ctx.tenantId!),
            ne(purchaseInvoices.status, "cancelled")
          )
        );
      const [ordersCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(
          and(
            eq(orders.tenantId, ctx.tenantId!),
            ne(orders.status, "cancelled")
          )
        );

      // Top customers by unpaid balance (highest receivables)
      const topCustomers = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, ctx.tenantId!),
            eq(customers.isActive, true),
            isNull(customers.deletedAt),
            sql`${customers.balance} > 0`
          )
        )
        .orderBy(desc(customers.balance))
        .limit(5);

      return {
        lowStock: lowStock.map(p => ({
          id: p.id,
          code: p.code,
          name: p.name,
          currentStock: p.currentStock,
          minStock: p.minStock,
          unit: p.unit,
        })),
        topCustomers: topCustomers.map(c => ({
          id: c.id,
          code: c.code,
          name: c.name,
          balance: c.balance,
          phone: c.phone,
        })),
        monthStats: {
          salesTotal: parseFloat(salesAgg?.total || "0"),
          purchasesTotal: parseFloat(purchasesAgg?.total || "0"),
          ordersCount: ordersAgg?.count ?? 0,
        },
        counts: {
          products: productsCount?.count ?? 0,
          customers: customersCount?.count ?? 0,
          suppliers: suppliersCount?.count ?? 0,
          sales: salesCount?.count ?? 0,
          purchases: purchasesCount?.count ?? 0,
          orders: ordersCount?.count ?? 0,
        },
      };
    }),
  }),

  // â”€â”€â”€ Payments (Installments & Settlements) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â”€â”€â”€ Public Storefront (website integration) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  store: router({
    catalog: publicProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            category: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return { items: [], categories: [] };
        const tid =
          Number.parseInt(
            (ctx.req.headers["x-tenant-id"] as string) || "",
            10
          ) || 1;
        const data = await getCatalog(db, tid, {
          search: input?.search,
          category: input?.category,
        });
        return { items: data.items.slice(0, 200), categories: data.categories };
      }),

    placeOrder: publicProcedure
      .input(placeOrderInputSchema)
      .mutation(async ({ input, ctx }) => {
        // Stock-draining write: strict per-IP budget (5 orders/hour).
        const ip = ctx.req.ip || "unknown";
        const rl = checkRateLimit(`place-order:${ip}`, 5, 60 * 60 * 1000);
        if (!rl.ok) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Ø¹Ø¯Ø¯ ÙƒØ¨ÙŠØ± Ù…Ù† Ø§Ù„Ø·Ù„Ø¨Ø§Øª â€” Ø£Ø¹Ø¯ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ø¨Ø¹Ø¯ ${rl.retryAfterSec} Ø«Ø§Ù†ÙŠØ©.`,
          });
        }
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const tid =
          Number.parseInt(
            (ctx.req.headers["x-tenant-id"] as string) || "",
            10
          ) || 1;
        // Webhook/double-submit retries send the key as a header
        // (x-idempotency-key); the body field wins when both are present.
        const headerKey =
          (ctx.req.headers["x-idempotency-key"] as string) || undefined;
        const result = await placePublicOrder(db, tid, {
          ...input,
          idempotencyKey: input.idempotencyKey ?? headerKey,
        });
        return result;
      }),
  }),

  payments: router({
    list: tenantProcedure
      .input(
        z.object({
          source: z.enum(["sales", "purchases"]),
          invoiceId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return await db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.tenantId, ctx.tenantId!),
              eq(payments.source, input.source),
              eq(payments.invoiceId, input.invoiceId)
            )
          )
          .orderBy(desc(payments.paymentDate));
      }),

    create: tenantProcedure
      .input(
        z.object({
          source: z.enum(["sales", "purchases"]),
          invoiceId: z.number(),
          amount: z.string().refine(v => {
            const n = parseFloat(v);
            return !isNaN(n) && n > 0 && n < 1_000_000_000;
          }, "Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø±Ù‚Ù…Ø§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹"),
          paymentMethod: z
            .enum(["cash", "card", "transfer", "credit", "online"])
            .default("cash"),
          paymentDate: z.string().optional(),
          notes: z.string().optional(),
          idempotencyKey: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId) throw new Error("ÙŠØ¬Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¤Ø³Ø³Ø© Ø£ÙˆÙ„Ø§Ù‹");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const paymentAmount = parseFloat(input.amount);

        if (input.idempotencyKey) {
          const existingPayments = await db
            .select()
            .from(payments)
            .where(eq(payments.idempotencyKey, input.idempotencyKey))
            .limit(1);
          if (existingPayments.length > 0) {
            return { paymentId: existingPayments[0].id };
          }
        }

        if (input.source === "sales") {
          const invoices = await db
            .select()
            .from(salesInvoices)
            .where(
              and(
                eq(salesInvoices.id, input.invoiceId),
                eq(salesInvoices.tenantId, ctx.tenantId!)
              )
            )
            .limit(1);
          if (invoices.length === 0)
            throw new Error("ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
          const inv = invoices[0];
          if (inv.status === "cancelled")
            throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ­ØµÙŠÙ„ ÙØ§ØªÙˆØ±Ø© Ù…Ù„ØºØ§Ø©");
          const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount);
          if (paymentAmount > remaining + 0.01)
            throw new Error(
              `Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØªØ¬Ø§ÙˆØ² Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ Ø¹Ù„Ù‰ Ø§Ù„ÙØ§ØªÙˆØ±Ø© (${remaining})`
            );

          await (db as any).transaction(async (tx: any) => {
            const [pay] = await tx
              .insert(payments)
              .values({
                tenantId: ctx.tenantId!,
                source: "sales",
                invoiceId: input.invoiceId,
                amount: input.amount,
                paymentMethod: input.paymentMethod,
                paymentDate: input.paymentDate
                  ? new Date(input.paymentDate)
                  : new Date(),
                notes: input.notes || null,
                userId: ctx.user.id,
                currencyId: inv.currencyId ?? null,
                exchangeRate: String(inv.currencyRate || "1"),
                baseAmount: (
                  paymentAmount * Number(inv.currencyRate || 1)
                ).toFixed(2),
                idempotencyKey: input.idempotencyKey ?? null,
              })
              .returning();

            const newPaid = parseFloat(inv.paidAmount) + paymentAmount;
            const newStatus =
              newPaid >= parseFloat(inv.total) - 0.01 ? "paid" : "partial";
            await tx
              .update(salesInvoices)
              .set({
                paidAmount: newPaid.toString(),
                status: newStatus,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(salesInvoices.id, input.invoiceId),
                  eq(salesInvoices.tenantId, ctx.tenantId!)
                )
              );

            if (inv.customerId) {
              await tx
                .update(customers)
                .set({
                  balance: sql`${customers.balance} - ${paymentAmount * Number(inv.currencyRate || 1)}`,
                })
                .where(
                  and(
                    eq(customers.id, inv.customerId),
                    eq(customers.tenantId, ctx.tenantId!)
                  )
                );
            }
            await postPaymentGlEntries(tx, {
              kind: "sale",
              invoiceId: input.invoiceId,
              invoiceNumber: inv.invoiceNumber,
              amount: paymentAmount,
              paymentMethod: input.paymentMethod,
              tenantId: ctx.tenantId!,
              paymentDate: input.paymentDate
                ? new Date(input.paymentDate)
                : undefined,
              userId: ctx.user.id,
              exchangeRate: Number(inv.currencyRate || 1),
            });
            await tx.insert(activityLogs).values({
              userId: ctx.user.id,
              action: `ØªØ­ØµÙŠÙ„ Ø¯ÙØ¹Ø© Ù…Ù† ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª ${inv.invoiceNumber}`,
              details: `Ø§Ù„Ù…Ø¨Ù„Øº: ${input.amount} â€” Ø§Ù„Ø·Ø±ÙŠÙ‚Ø©: ${input.paymentMethod}`,
            });
            return { paymentId: pay.id };
          });
        } else {
          const invoices = await db
            .select()
            .from(purchaseInvoices)
            .where(
              and(
                eq(purchaseInvoices.id, input.invoiceId),
                eq(purchaseInvoices.tenantId, ctx.tenantId!)
              )
            )
            .limit(1);
          if (invoices.length === 0)
            throw new Error("ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");
          const inv = invoices[0];
          if (inv.status === "cancelled")
            throw new Error("Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø³Ø¯Ø§Ø¯ ÙØ§ØªÙˆØ±Ø© Ù…Ù„ØºØ§Ø©");
          const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount);
          if (paymentAmount > remaining + 0.01)
            throw new Error(
              `Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØªØ¬Ø§ÙˆØ² Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ Ø¹Ù„Ù‰ Ø§Ù„ÙØ§ØªÙˆØ±Ø© (${remaining})`
            );

          await (db as any).transaction(async (tx: any) => {
            const [pay] = await tx
              .insert(payments)
              .values({
                tenantId: ctx.tenantId!,
                source: "purchases",
                invoiceId: input.invoiceId,
                amount: input.amount,
                paymentMethod: input.paymentMethod,
                paymentDate: input.paymentDate
                  ? new Date(input.paymentDate)
                  : new Date(),
                notes: input.notes || null,
                userId: ctx.user.id,
                currencyId: inv.currencyId ?? null,
                exchangeRate: String(inv.exchangeRate || "1"),
                baseAmount: (
                  paymentAmount * Number(inv.exchangeRate || 1)
                ).toFixed(2),
                idempotencyKey: input.idempotencyKey ?? null,
              })
              .returning();

            const newPaid = parseFloat(inv.paidAmount) + paymentAmount;
            const newStatus =
              newPaid >= parseFloat(inv.total) - 0.01 ? "paid" : "partial";
            await tx
              .update(purchaseInvoices)
              .set({
                paidAmount: newPaid.toString(),
                status: newStatus,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(purchaseInvoices.id, input.invoiceId),
                  eq(purchaseInvoices.tenantId, ctx.tenantId!)
                )
              );

            if (inv.supplierId) {
              await tx
                .update(suppliers)
                .set({
                  balance: sql`${suppliers.balance} - ${paymentAmount * Number(inv.exchangeRate || 1)}`,
                })
                .where(
                  and(
                    eq(suppliers.id, inv.supplierId),
                    eq(suppliers.tenantId, ctx.tenantId!)
                  )
                );
            }
            await postPaymentGlEntries(tx, {
              kind: "purchase",
              invoiceId: input.invoiceId,
              invoiceNumber: inv.invoiceNumber,
              amount: paymentAmount,
              paymentMethod: input.paymentMethod,
              tenantId: ctx.tenantId!,
              paymentDate: input.paymentDate
                ? new Date(input.paymentDate)
                : undefined,
              userId: ctx.user.id,
              exchangeRate: Number(inv.exchangeRate || 1),
            });
            await tx.insert(activityLogs).values({
              userId: ctx.user.id,
              action: `ØªØ³Ø¬ÙŠÙ„ Ø¯ÙØ¹Ø© Ø³Ø¯Ø§Ø¯ Ø¹Ù„Ù‰ ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª ${inv.invoiceNumber}`,
              details: `Ø§Ù„Ù…Ø¨Ù„Øº: ${input.amount} â€” Ø§Ù„Ø·Ø±ÙŠÙ‚Ø©: ${input.paymentMethod}`,
            });
            return { paymentId: pay.id };
          });
        }

        return { success: true };
      }),
  }),
  costCenters: costCentersRouter,
  beneficiaries: beneficiariesRouter,
  financialReports: financialReportsRouter,
  fiscalPeriods: fiscalPeriodsRouter,
  openingBalances: openingBalancesRouter,
  fiscalPeriodClosing: fiscalPeriodClosingRouter,
  accountingReports: accountingReportsRouter,
  inventoryReports: inventoryReportsRouter,
  query: queryRouter,
  documents: documentsRouter,
});

export type AppRouter = typeof appRouter;

// Re-export functions used by other routers
export { provisionGenericTenant } from "./_core/systemRouter";
export { seedDefaultAccountsForTenant, defaultCityForCountry };


