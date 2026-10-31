import { and, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { notifyOwner } from "./notification";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./trpc";
import { requireOwner } from "./tenant";
import { getDb } from "../db";
import {
  tenants,
  branches,
  settings,
  accounts,
  products,
  openingBalances,
  activityLogs,
  users,
  loginAttempts,
  paymentGateways,
  subscriptionPolicies,
  subscriptionPlans,
} from "../../drizzle/schema";
import {
  LIBRARY_TENANT_CODE,
  LIBRARY_TENANT_NAME,
  libraryAccounts,
  libraryGoods,
  libraryServices,
  libraryInventoryValue,
} from "../seed/libraryTenantData";

/**
 * Convert the historically GLOBAL unique keys on code columns into
 * per-tenant composite unique keys (code, tenant_id). Idempotent: old single
 * column unique indexes are dropped (if present) and the new composite
 * indexes are created only if missing. This is what allows a second tenant
 * (مكتبة الحسينية) to reuse the same account/product/customer/supplier codes
 * without colliding with tenant 1.
 */
async function applyTenantUniqueConstraints(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const dropCandidates: Record<string, string[]> = {
    accounts: ["accounts_code_unique", "accounts_code_key"],
    products: ["products_code_unique", "products_code_key"],
    customers: ["customers_code_unique", "customers_code_key"],
    suppliers: ["suppliers_code_unique", "suppliers_code_key"],
    warehouses: ["warehouses_code_unique", "warehouses_code_key"],
  };
  const createStmts = [
    `CREATE UNIQUE INDEX IF NOT EXISTS accounts_code_tenant_unique ON accounts (code, "tenantId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS products_code_tenant_unique ON products (code, "tenantId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS customers_code_tenant_unique ON customers (code, "tenantId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS suppliers_code_tenant_unique ON suppliers (code, "tenantId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS warehouses_code_tenant_unique ON warehouses (code, "tenantId")`,
  ];

  const runSafe = async (stmt: string, required = false) => {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e: any) {
      if (required) throw e;
      // Non-fatal (e.g. already removed) — keep going.
      console.warn("[applyConstraints] ignored:", stmt, e?.message);
    }
  };

  for (const [tbl, names] of Object.entries(dropCandidates)) {
    for (const name of names) {
      // A unique on `code` may have been created as a CONSTRAINT or a bare
      // UNIQUE INDEX; drop both forms so the new composite key can be added.
      await runSafe(`ALTER TABLE ${tbl} DROP CONSTRAINT IF EXISTS ${name}`);
      await runSafe(`DROP INDEX IF EXISTS ${name}`);
    }
  }
  for (const stmt of createStmts) {
    await runSafe(stmt, true);
  }
}

/**
 * Runtime schema migration for the POS / flexible sales feature.
 * Adds config columns to `settings` and account-linkage columns to `products`,
 * and seeds the additional default chart-of-accounts entries every tenant needs
 * (goods sales revenue, inventory, sales discount, and per-method bank accounts).
 * Idempotent — safe to call repeatedly.
 */
async function applyPosSchema(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const colAdds = [
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS "posConfig" text`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS "salesPolicy" text`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS "paymentMethods" text`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS "postingRules" text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "salesAccountId" integer`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "cogsAccountId" integer`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "inventoryAccountId" integer`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "unitOfMeasure" varchar(50)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "secondaryUnit" varchar(50)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "conversionFactor" numeric(15,4)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "isComposite" boolean`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "bom" text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "alternativeIds" text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "attachmentUrl" text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "costMethod" varchar(30)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "directCost" numeric(15,2)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "indirectCost" numeric(15,2)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "productionMinutes" integer`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "priceMode" varchar(20)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "marginPct" numeric(6,2)`,
  ];
  for (const stmt of colAdds) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e: any) {
      console.warn("[applyPosSchema] column add ignored:", stmt, e?.message);
    }
  }

  const tableStmts = [
    `CREATE TABLE IF NOT EXISTS stock_adjustments (
      id serial PRIMARY KEY,
      "tenantId" integer NOT NULL,
      "productId" integer NOT NULL,
      "warehouseId" integer,
      "previousQty" integer NOT NULL,
      "newQty" integer NOT NULL,
      reason varchar(100) DEFAULT 'تسوية',
      notes text,
      "userId" integer,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS warehouse_transfers (
      id serial PRIMARY KEY,
      "tenantId" integer NOT NULL,
      "productId" integer NOT NULL,
      "fromWarehouseId" integer NOT NULL,
      "toWarehouseId" integer NOT NULL,
      quantity integer NOT NULL,
      notes text,
      "userId" integer,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )`,
  ];
  for (const stmt of tableStmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e: any) {
      console.warn("[applyPosSchema] table create ignored:", e?.message);
    }
  }

  const allTenants = await db.select({ id: tenants.id }).from(tenants);
  const extraAccounts = [
    {
      code: "4011",
      name: "إيرادات مبيعات البضائع",
      type: "revenue" as const,
      category: "الإيرادات التشغيلية",
      description: "إيرادات بيع البضائع والسلع",
    },
    {
      code: "1060",
      name: "المخزون السلعي",
      type: "asset" as const,
      category: "الأصول المتداولة",
      description: "قيمة المخزون من البضائع",
    },
    {
      code: "1090",
      name: "الخصم المسموح به (خصم المبيعات)",
      type: "expense" as const,
      category: "خصم المبيعات",
      description: "خصومات ممنوحة على المبيعات",
    },
    {
      code: "1021",
      name: "البنك — بطاقات ومدى",
      type: "asset" as const,
      category: "الأصول المتداولة",
      description: "تحصيلات عبر نقاط البيع بالبطاقة",
    },
    {
      code: "1022",
      name: "البنك — حوالات",
      type: "asset" as const,
      category: "الأصول المتداولة",
      description: "تحصيلات عبر التحويل البنكي",
    },
    {
      code: "1023",
      name: "البنك — مدفوعات أونلاين",
      type: "asset" as const,
      category: "الأصول المتداولة",
      description: "تحصيلات عبر بوابات الدفع الإلكتروني",
    },
  ];
  for (const t of allTenants) {
    for (const acc of extraAccounts) {
      await db
        .insert(accounts)
        .values({ ...acc, tenantId: t.id })
        .onConflictDoNothing({ target: [accounts.code, accounts.tenantId] });
    }
  }
}

// Runtime migration for global governance: audit/traceability fields, work-site
// & device context, geo-coordinates, unified global numbering, and Saudi
// e-invoicing (ZATCA) support.
async function applyGovernanceSchema(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const colAdds = [
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS "country" varchar(100) DEFAULT 'اليمن'`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS "zatcaConfig" text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "country" varchar(100) DEFAULT 'اليمن'`,
    `ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS "country" varchar(100) DEFAULT 'اليمن'`,
    `ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS "workSiteId" integer`,
    `ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS "deviceId" integer`,
    `ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS "lat" numeric(10,7)`,
    `ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS "lng" numeric(10,7)`,
    `ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS "globalCode" varchar(160)`,
    `ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS "country" varchar(100) DEFAULT 'اليمن'`,
    `ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS "workSiteId" integer`,
    `ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS "deviceId" integer`,
    `ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS "lat" numeric(10,7)`,
    `ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS "lng" numeric(10,7)`,
    `ALTER TABLE warehouse_transfers ADD COLUMN IF NOT EXISTS "globalCode" varchar(160)`,
    `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "country" varchar(100) DEFAULT 'اليمن'`,
    `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "workSiteId" integer`,
    `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "deviceId" integer`,
    `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "lat" numeric(10,7)`,
    `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "lng" numeric(10,7)`,
    `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "globalCode" varchar(160)`,
    `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "zatca" text`,
    `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "country" varchar(100) DEFAULT 'اليمن'`,
    `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "workSiteId" integer`,
    `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "deviceId" integer`,
    `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "lat" numeric(10,7)`,
    `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "lng" numeric(10,7)`,
    `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "globalCode" varchar(160)`,
    `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "zatca" text`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "country" varchar(100) DEFAULT 'اليمن'`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "workSiteId" integer`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deviceId" integer`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "lat" numeric(10,7)`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "lng" numeric(10,7)`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "globalCode" varchar(160)`,
  ];
  for (const stmt of colAdds) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e: any) {
      console.warn("[applyGovernanceSchema] col ignored:", e?.message);
    }
  }

  const tableStmts = [
    `CREATE TABLE IF NOT EXISTS work_sites (
      id serial PRIMARY KEY,
      "tenantId" integer NOT NULL,
      code varchar(50) NOT NULL,
      name varchar(255) NOT NULL,
      address text,
      lat numeric(10,7),
      lng numeric(10,7),
      "isActive" boolean DEFAULT true,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS devices (
      id serial PRIMARY KEY,
      "tenantId" integer NOT NULL,
      code varchar(50) NOT NULL,
      name varchar(255) NOT NULL,
      type varchar(30) DEFAULT 'pos',
      "workSiteId" integer,
      location varchar(255),
      "lastSeenAt" timestamp,
      "isActive" boolean DEFAULT true,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )`,
  ];
  for (const stmt of tableStmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e: any) {
      console.warn("[applyGovernanceSchema] table ignored:", e?.message);
    }
  }

  const uniques = [
    `CREATE UNIQUE INDEX IF NOT EXISTS stock_adjustments_gc_tenant_unique ON stock_adjustments ("tenantId","globalCode")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS warehouse_transfers_gc_tenant_unique ON warehouse_transfers ("tenantId","globalCode")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS sales_invoices_gc_tenant_unique ON sales_invoices ("tenantId","globalCode")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS purchase_invoices_gc_tenant_unique ON purchase_invoices ("tenantId","globalCode")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS orders_gc_tenant_unique ON orders ("tenantId","globalCode")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS work_sites_code_tenant_unique ON work_sites (code,"tenantId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS devices_code_tenant_unique ON devices (code,"tenantId")`,
  ];
  for (const stmt of uniques) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e: any) {
      console.warn("[applyGovernanceSchema] unique ignored:", e?.message);
    }
  }

  for (const tbl of [
    "settings",
    "products",
    "sales_invoices",
    "purchase_invoices",
    "orders",
    "stock_adjustments",
    "warehouse_transfers",
  ]) {
    try {
      await db.execute(
        sql.raw(`UPDATE ${tbl} SET country = 'اليمن' WHERE country IS NULL`)
      );
    } catch (e: any) {
      console.warn("[applyGovernanceSchema] backfill ignored:", e?.message);
    }
  }
}

// Reconcile the physical `products` table with the columns declared in
// drizzle/schema.ts. db:push cannot run in this environment, so any column
// added to the schema after the table's creation must be added here at
// runtime (idempotent via IF NOT EXISTS).
async function applyProductsSchemaFix(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const colAdds = [
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "indirectCost" decimal(15,2) DEFAULT '0' NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "productionMinutes" integer`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "priceMode" varchar(20) DEFAULT 'direct' NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "marginPct" decimal(6,2) DEFAULT '0' NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true NOT NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now()`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now()`,
  ];
  for (const stmt of colAdds) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e: any) {
      console.warn("[applyProductsSchemaFix] col ignored:", e?.message);
    }
  }
}

// Runtime migration for local subscriber authentication: adds username +
// passwordHash to `users`, a partial unique index on username, and the
// `login_attempts` audit table (device + geo for lockout & security map).
export async function applyAuthSchema(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const colAdds = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "username" varchar(120)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordHash" text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" boolean DEFAULT false NOT NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "verificationToken" varchar(128)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "verificationTokenExpiry" timestamp`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetToken" varchar(128)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetTokenExpiry" timestamp`,
    `ALTER TABLE tenants ALTER COLUMN "ownerUserId" DROP NOT NULL`,
  ];
  for (const stmt of colAdds) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e: any) {
      console.warn("[applyAuthSchema] col ignored:", stmt, e?.message);
    }
  }
  const uniques = [
    `CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username) WHERE username IS NOT NULL`,
  ];
  for (const stmt of uniques) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e: any) {
      console.warn("[applyAuthSchema] unique ignored:", stmt, e?.message);
    }
  }
  const tableStmts = [
    `CREATE TABLE IF NOT EXISTS login_attempts (
      id serial PRIMARY KEY,
      "tenantId" integer,
      "userId" integer,
      username varchar(120),
      success boolean NOT NULL,
      ip varchar(64),
      "userAgent" text,
      device varchar(120),
      country varchar(100),
      city varchar(120),
      lat decimal(10,7),
      lng decimal(10,7),
      "createdAt" timestamp NOT NULL DEFAULT now()
    )`,
    // SaaS Billing: dynamic payment gateways managed by the platform owner.
    `CREATE TABLE IF NOT EXISTS payment_gateways (
      id serial PRIMARY KEY,
      "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
      code varchar(60) NOT NULL UNIQUE,
      "providerType" varchar(40) NOT NULL,
      name varchar(120) NOT NULL,
      country varchar(60) DEFAULT 'عالمي' NOT NULL,
      "countryCode" varchar(2) DEFAULT 'GL' NOT NULL,
      currency varchar(10) DEFAULT 'USD' NOT NULL,
      mode varchar(10) DEFAULT 'test' NOT NULL,
      credentials text,
      "feePercent" decimal(5,2) DEFAULT '0' NOT NULL,
      "feeFixed" decimal(10,2) DEFAULT '0' NOT NULL,
      instructions text,
      "checkoutUrlTemplate" text,
      "isActive" boolean DEFAULT true NOT NULL,
      "sortOrder" integer DEFAULT 0 NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now(),
      "serverVersion" integer DEFAULT 1 NOT NULL,
      "lastSyncAt" timestamp,
      "conflictState" varchar(20) DEFAULT 'none',
      "aggregateId" uuid
    )`,
    // SaaS Billing: flexible subscription policy (never stops the business).
    `CREATE TABLE IF NOT EXISTS subscription_policies (
      id serial PRIMARY KEY,
      "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
      code varchar(50) NOT NULL UNIQUE,
      name varchar(120) NOT NULL,
      "trialDays" integer DEFAULT 14 NOT NULL,
      "graceDays" integer DEFAULT 30 NOT NULL,
      "graceFullAccess" boolean DEFAULT true NOT NULL,
      "maxOverdueDays" integer DEFAULT 120 NOT NULL,
      "restrictedFeatures" jsonb,
      "dunningReminderDays" jsonb,
      "isActive" boolean DEFAULT true NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )`,
  ];
  // SaaS Billing: flexible per-country plan pricing (optional column).
  try {
    await db.execute(
      sql.raw(
        `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS "countryPricing" jsonb`
      )
    );
  } catch (e: any) {
    console.warn("[applyAuthSchema] countryPricing col ignored:", e?.message);
  }
  for (const stmt of tableStmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e: any) {
      console.warn("[applyAuthSchema] table ignored:", stmt, e?.message);
    }
  }

  // SaaS Billing catalog (plans + policy + gateways) — idempotent.
  try {
    await seedBillingCatalog(db);
  } catch (e: any) {
    console.warn("[applyAuthSchema] billing catalog seed ignored:", e?.message);
  }
}

/**
 * seedBillingCatalog — بذر الكتالوج التجاري (idempotent by count):
 *   1) السياسة الافتراضية للاشتراك (لا يتوقف العمل أبداً).
 *   2) الباقات (starter/growth/pro) مع تسعير مرن لكل دولة.
 *   3) بوابات دفع جاهزة: واتساب (افتراضي)، تحويل بنكي، كاش، يدوي —
 *      مع بوابات مدفوعة (Tap/Moyasar/Stripe) معطّلة بانتظار إدخال
 *      بيانات من المالك من لوحة الإدارة.
 */
export async function seedBillingCatalog(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  // 1) Subscription policy.
  const existingPolicy = await db
    .select({ id: subscriptionPolicies.id })
    .from(subscriptionPolicies)
    .where(eq(subscriptionPolicies.code, "default"))
    .limit(1);
  if (existingPolicy.length === 0) {
    await db.insert(subscriptionPolicies).values({
      code: "default",
      name: "السياسة الافتراضية — لا يتوقف العمل أبداً",
      trialDays: 14,
      graceDays: 30,
      graceFullAccess: true,
      maxOverdueDays: 120,
      restrictedFeatures: [
        "exports",
        "zatca",
        "api_keys",
        "ai_assistant",
        "add_user",
        "add_branch",
        "backups",
      ],
      dunningReminderDays: [7, 3, 1, 0, -3, -7],
    });
  }

  // 2) Subscription plans with flexible per-country pricing.
  const planCount = await db
    .select({ id: subscriptionPlans.id })
    .from(subscriptionPlans)
    .limit(1);
  if (planCount.length === 0) {
    await db.insert(subscriptionPlans).values([
      {
        name: "الباقة الأساسية",
        code: "starter",
        description:
          "للأعمال الصغيرة: إصدار فواتير، دفتر يومية، كشف حساب، تقارير أساسية.",
        priceMonthly: "2990",
        priceYearly: "29900",
        currency: "YER",
        maxUsers: 3,
        maxBranches: 1,
        maxTransactions: 1000,
        sortOrder: 1,
        features: [
          "فواتير بيع وشراء",
          "دفتر اليومية والقيود",
          "متابعة العملاء والموردين",
          "تقارير أساسية",
          "3 مستخدمين",
        ],
        countryPricing: [
          {
            countryCode: "SA",
            country: "السعودية",
            currency: "SAR",
            priceMonthly: "49",
            priceYearly: "490",
            taxPercent: 15,
          },
          {
            countryCode: "AE",
            country: "الإمارات",
            currency: "AED",
            priceMonthly: "45",
            priceYearly: "450",
            taxPercent: 5,
          },
          {
            countryCode: "US",
            country: "أمريكا",
            currency: "USD",
            priceMonthly: "12",
            priceYearly: "120",
            taxPercent: 0,
          },
          {
            countryCode: "EG",
            country: "مصر",
            currency: "EGP",
            priceMonthly: "299",
            priceYearly: "2990",
            taxPercent: 14,
          },
        ],
      },
      {
        name: "باقة النمو",
        code: "growth",
        description:
          "للشركات النامية: وحدات المخزون، نقاط البيع، إعداد ميزانية وتقارير متقدمة.",
        priceMonthly: "6990",
        priceYearly: "69900",
        currency: "YER",
        maxUsers: 10,
        maxBranches: 3,
        maxTransactions: 10000,
        sortOrder: 2,
        features: [
          "كل مزايا الأساسية",
          "المخزون ونقاط البيع",
          "الميزانية والتدفقات النقدية",
          "10 مستخدمين",
          "3 فروع",
        ],
        countryPricing: [
          {
            countryCode: "SA",
            country: "السعودية",
            currency: "SAR",
            priceMonthly: "99",
            priceYearly: "990",
            taxPercent: 15,
          },
          {
            countryCode: "AE",
            country: "الإمارات",
            currency: "AED",
            priceMonthly: "89",
            priceYearly: "890",
            taxPercent: 5,
          },
          {
            countryCode: "US",
            country: "أمريكا",
            currency: "USD",
            priceMonthly: "25",
            priceYearly: "250",
            taxPercent: 0,
          },
          {
            countryCode: "EG",
            country: "مصر",
            currency: "EGP",
            priceMonthly: "599",
            priceYearly: "5990",
            taxPercent: 14,
          },
        ],
      },
      {
        name: "الباقة الاحترافية",
        code: "pro",
        description:
          "للمؤسسات: ZATCA، وحدات متقدمة، API، أولوية دعم، فروع ومستخدمون غير محدود.",
        priceMonthly: "14990",
        priceYearly: "149900",
        currency: "YER",
        maxUsers: 999,
        maxBranches: 999,
        maxTransactions: 1000000,
        sortOrder: 3,
        features: [
          "كل مزايا النمو",
          "الفوترة الإلكترونية ZATCA",
          "وحدات متقدمة (مشاريع/موارد بشرية)",
          "API وتكاملات",
          "مستخدمون وفروع غير محدودين",
        ],
        countryPricing: [
          {
            countryCode: "SA",
            country: "السعودية",
            currency: "SAR",
            priceMonthly: "199",
            priceYearly: "1990",
            taxPercent: 15,
          },
          {
            countryCode: "AE",
            country: "الإمارات",
            currency: "AED",
            priceMonthly: "179",
            priceYearly: "1790",
            taxPercent: 5,
          },
          {
            countryCode: "US",
            country: "أمريكا",
            currency: "USD",
            priceMonthly: "49",
            priceYearly: "490",
            taxPercent: 0,
          },
          {
            countryCode: "EG",
            country: "مصر",
            currency: "EGP",
            priceMonthly: "1199",
            priceYearly: "11990",
            taxPercent: 14,
          },
        ],
      },
    ]);
  }

  // 3) Payment gateways. Manual-friendly defaults active; card providers stay
  //    disabled until the owner enters credentials from the admin panel.
  const gwCount = await db
    .select({ id: paymentGateways.id })
    .from(paymentGateways)
    .limit(1);
  if (gwCount.length === 0) {
    await db.insert(paymentGateways).values([
      {
        code: "whatsapp",
        providerType: "whatsapp",
        name: "الدفع عبر واتساب",
        country: "عالمي",
        countryCode: "GL",
        currency: "YER",
        mode: "live",
        instructions:
          "أرسل بيانات الدفع عبر واتساب وسيتولى فريق الدعم تأكيد اشتراككم فوراً.",
        feePercent: "0",
        feeFixed: "0",
        isActive: true,
        sortOrder: 10,
      },
      {
        code: "bank_transfer",
        providerType: "bank_transfer",
        name: "تحويل بنكي",
        country: "عالمي",
        countryCode: "GL",
        currency: "YER",
        mode: "live",
        instructions:
          "حوّل المبلغ إلى الحساب البنكي وأرفق إيصال التحويل — يُفعَّل اشتراككم خلال دقائق.",
        feePercent: "0",
        feeFixed: "0",
        isActive: true,
        sortOrder: 20,
      },
      {
        code: "cash",
        providerType: "cash",
        name: "الدفع نقداً",
        country: "عالمي",
        countryCode: "GL",
        currency: "YER",
        mode: "live",
        instructions:
          "تواصل مع توزيعنا المعتمد في منطقتكم للدفع النقدي وتفعيل الاشتراك.",
        feePercent: "0",
        feeFixed: "0",
        isActive: true,
        sortOrder: 30,
      },
      {
        code: "tap",
        providerType: "tap",
        name: "بطاقة ائتمان / مدى (Tap)",
        country: "الخليج",
        countryCode: "SA",
        currency: "SAR",
        mode: "test",
        instructions:
          "ادفع مباشرة ببطاقات مدى/فيزا/ماستركارد — تفعيل فوري تلقائي.",
        checkoutUrlTemplate: "",
        feePercent: "2.6",
        feeFixed: "0",
        isActive: false,
        sortOrder: 40,
      },
      {
        code: "moyasar",
        providerType: "moyasar",
        name: "بطاقة ائتمان (Moyasar)",
        country: "الخليج",
        countryCode: "SA",
        currency: "SAR",
        mode: "test",
        instructions: "ادفع ببطاقات فيزا/ماستركارد عبر بوابة Moyasar.",
        checkoutUrlTemplate: "",
        feePercent: "2.9",
        feeFixed: "0",
        isActive: false,
        sortOrder: 50,
      },
      {
        code: "stripe",
        providerType: "stripe",
        name: "بطاقة دولية (Stripe)",
        country: "عالمي",
        countryCode: "GL",
        currency: "USD",
        mode: "test",
        instructions: "ادفع ببطاقات دولية عبر Stripe — تفعيل فوري.",
        checkoutUrlTemplate: "",
        feePercent: "2.9",
        feeFixed: "30",
        isActive: false,
        sortOrder: 60,
      },
    ]);
  }
}

// Self-serve provisioning for a brand-new subscriber organisation. Seeds a
// standard chart of accounts (same codes the journal logic posts against) plus
// branch + settings. Idempotent by tenant code.
export async function provisionGenericTenant(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  opts: { name: string; code: string; country?: string; currency?: string }
): Promise<number> {
  const country = opts.country || "اليمن";
  let tenantRow = (
    await db.select().from(tenants).where(eq(tenants.code, opts.code)).limit(1)
  )[0];
  if (!tenantRow) {
    const [created] = await db
      .insert(tenants)
      .values({
        name: opts.name,
        code: opts.code,
        currency: opts.currency || "YER",
      })
      .returning();
    tenantRow = created;
  }
  const tid = tenantRow!.id;

  const existingBranch = await db
    .select()
    .from(branches)
    .where(eq(branches.tenantId, tid))
    .limit(1);
  if (existingBranch.length === 0) {
    await db.insert(branches).values({
      tenantId: tid,
      name: "الفرع الرئيسي",
      code: "MAIN",
      city: "",
      isMain: true,
    });
  }

  const existingSettings = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, tid))
    .limit(1);
  if (existingSettings.length === 0) {
    await db.insert(settings).values({
      tenantId: tid,
      institutionName: opts.name,
      country,
      currency:
        (opts.currency || "YER").toUpperCase() === "SAR"
          ? "ريال سعودي (SAR)"
          : (opts.currency || "YER").toUpperCase() === "AED"
            ? "درهم إماراتي (AED)"
            : (opts.currency || "YER").toUpperCase() === "USD"
              ? "دولار أمريكي (USD)"
              : "ريال يمني (YER)",
      accountingPeriod: String(new Date().getFullYear()),
      managerName: opts.name,
    });
  }

  const acctCount = await db.$count(accounts, eq(accounts.tenantId, tid));
  if (acctCount === 0) {
    const inserted = await db
      .insert(accounts)
      .values(
        libraryAccounts.map(a => ({
          tenantId: tid,
          code: a.code,
          name: a.name,
          type: a.type,
          isActive: true,
          isCustom: false,
          parentAccountId: null,
        }))
      )
      .returning({ id: accounts.id, code: accounts.code });
    const codeToId = new Map(inserted.map(r => [r.code, r.id]));
    for (const a of libraryAccounts) {
      if (a.parentCode && codeToId.has(a.parentCode)) {
        await db
          .update(accounts)
          .set({ parentAccountId: codeToId.get(a.parentCode)! })
          .where(and(eq(accounts.tenantId, tid), eq(accounts.code, a.code)));
      }
    }
  }
  return tid;
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({ timestamp: z.number().min(0, "timestamp cannot be negative") })
    )
    .query(() => ({ ok: true })),

  notifyOwner: adminProcedure
    .input(z.object({ title: z.string().min(1), content: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return { success: delivered } as const;
    }),

  // Super-admin only: list every tenant (for the owner tenant switcher).
  listTenants: protectedProcedureAdmin().query(async ({ ctx }) => {
    requireOwner(ctx);
    const db = await getDb();
    if (!db) return [] as { id: number; name: string; code: string }[];
    const rows = await db
      .select({ id: tenants.id, name: tenants.name, code: tenants.code })
      .from(tenants);
    return rows as { id: number; name: string; code: string }[];
  }),

  // Super-admin only: harden the schema (global → per-tenant unique keys).
  applyTenantConstraints: protectedProcedureAdmin().mutation(
    async ({ ctx }) => {
      requireOwner(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await applyTenantUniqueConstraints(db);
      return { ok: true };
    }
  ),

  // Super-admin only: runtime migration for the flexible POS / sales feature.
  migratePos: protectedProcedureAdmin().mutation(async ({ ctx }) => {
    requireOwner(ctx);
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await applyTenantUniqueConstraints(db);
    await applyPosSchema(db);
    await applyGovernanceSchema(db);
    await applyProductsSchemaFix(db);
    await applyAuthSchema(db);
    return { ok: true };
  }),

  // Super-admin only: provision "مكتبة الحسينية" as a fully independent
  // tenant, migrate its reference data from docs/ and post a balanced opening
  // entry (inventory value → Dr stock / Cr owner's capital). Idempotent.
  provisionLibraryTenant: protectedProcedureAdmin().mutation(
    async ({ ctx }) => {
      requireOwner(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await applyTenantUniqueConstraints(db);
      await applyPosSchema(db);
      await applyGovernanceSchema(db);
      await applyProductsSchemaFix(db);
      await applyAuthSchema(db);

      const ownerId = ctx.user!.id;

      // 1) Tenant (idempotent by immutable code)
      let tenantRow = (
        await db
          .select()
          .from(tenants)
          .where(eq(tenants.code, LIBRARY_TENANT_CODE))
          .limit(1)
      )[0];
      let alreadyProvisioned = false;
      if (tenantRow) {
        alreadyProvisioned = true;
      } else {
        const [created] = await db
          .insert(tenants)
          .values({
            name: LIBRARY_TENANT_NAME,
            code: LIBRARY_TENANT_CODE,
            ownerUserId: ownerId,
            currency: "YER",
          })
          .returning();
        tenantRow = created;
      }
      const tid = tenantRow!.id;

      // 2) Branch (idempotent)
      const existingBranch = await db
        .select()
        .from(branches)
        .where(eq(branches.tenantId, tid))
        .limit(1);
      if (existingBranch.length === 0) {
        await db.insert(branches).values({
          tenantId: tid,
          name: "الفرع الرئيسي — مكتبة الحسينية",
          code: "MAIN",
          city: "صنعاء",
          isMain: true,
        });
      }

      // 3) Settings (idempotent — unique tenantId)
      const existingSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.tenantId, tid))
        .limit(1);
      if (existingSettings.length === 0) {
        await db.insert(settings).values({
          tenantId: tid,
          institutionName: LIBRARY_TENANT_NAME,
          currency: "ريال يمني (YER)",
          accountingPeriod: "2026",
          managerName: "إدارة مكتبة الحسينية",
        });
      }

      let accountsSeeded = 0;
      let productsSeeded = 0;

      // 4) Chart of accounts (idempotent by count)
      const acctCount = await db.$count(accounts, eq(accounts.tenantId, tid));
      if (acctCount === 0) {
        const inserted = await db
          .insert(accounts)
          .values(
            libraryAccounts.map(a => ({
              tenantId: tid,
              code: a.code,
              name: a.name,
              type: a.type,
              isActive: true,
              isCustom: false,
              parentAccountId: null,
            }))
          )
          .returning({ id: accounts.id, code: accounts.code });
        const codeToId = new Map(inserted.map(r => [r.code, r.id]));
        // second pass: wire parent links
        for (const a of libraryAccounts) {
          if (a.parentCode && codeToId.has(a.parentCode)) {
            await db
              .update(accounts)
              .set({ parentAccountId: codeToId.get(a.parentCode)! })
              .where(
                and(eq(accounts.tenantId, tid), eq(accounts.code, a.code))
              );
          }
        }
        accountsSeeded = inserted.length;
      }

      // 5) Products (goods + services) — idempotent by count
      const prodCount = await db.$count(products, eq(products.tenantId, tid));
      if (prodCount === 0) {
        const all = [
          ...libraryGoods.map(g => ({
            tenantId: tid,
            code: g.code,
            name: g.name,
            type: "goods" as const,
            category: g.category,
            unit: g.unit,
            purchasePrice: g.purchasePrice,
            salePrice: g.salePrice,
            currentStock: g.currentStock,
            isActive: true,
          })),
          ...libraryServices.map(s => ({
            tenantId: tid,
            code: `S-${s.code}`,
            name: s.name,
            type: "service" as const,
            category: s.category,
            unit: s.unit,
            purchasePrice: s.purchasePrice,
            salePrice: s.salePrice,
            currentStock: 0,
            isActive: true,
            description: s.description || null,
          })),
        ];
        const inserted = await db.insert(products).values(all).returning();
        productsSeeded = inserted.length;
      }

      // 6) Balanced opening entry (inventory value → Dr stock / Cr capital)
      const openingCount = await db.$count(
        openingBalances,
        and(
          eq(openingBalances.tenantId, tid),
          eq(openingBalances.periodName, "السنة المالية 2026")
        )
      );
      if (openingCount === 0 && libraryInventoryValue > 0) {
        const value = libraryInventoryValue.toFixed(2);

        let inventoryAccount = (
          await db
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.tenantId, tid),
                eq(accounts.type, "asset"),
                or(
                  ilike(accounts.name, "%مخزون%"),
                  ilike(accounts.name, "%بضاعة%"),
                  ilike(accounts.name, "%جرد%")
                )
              )
            )
            .limit(1)
        )[0];

        if (!inventoryAccount) {
          const firstAsset = (
            await db
              .select()
              .from(accounts)
              .where(
                and(eq(accounts.tenantId, tid), eq(accounts.type, "asset"))
              )
              .limit(1)
          )[0];
          const [created] = await db
            .insert(accounts)
            .values({
              tenantId: tid,
              code: "1250",
              name: "المخزون السلعي",
              type: "asset",
              isActive: true,
              isCustom: true,
              parentAccountId: firstAsset ? firstAsset.id : null,
            })
            .returning();
          inventoryAccount = created;
        }

        let capitalAccount = (
          await db
            .select()
            .from(accounts)
            .where(and(eq(accounts.tenantId, tid), eq(accounts.type, "equity")))
            .limit(1)
        )[0];
        if (!capitalAccount) {
          const [created] = await db
            .insert(accounts)
            .values({
              tenantId: tid,
              code: "3000",
              name: "رأس مال مكتبة الحسينية",
              type: "equity",
              isActive: true,
              isCustom: true,
            })
            .returning();
          capitalAccount = created;
        }

        await db.insert(openingBalances).values([
          {
            tenantId: tid,
            accountId: inventoryAccount.id,
            amount: value,
            type: "debit",
            periodName: "السنة المالية 2026",
            notes: "تزويد المخزون الافتتاحي من جرد مكتبة الحسينية",
          },
          {
            tenantId: tid,
            accountId: capitalAccount.id,
            amount: value,
            type: "credit",
            periodName: "السنة المالية 2026",
            notes: "رأس مال صاحب المنشأة مقابل المخزون الافتتاحي",
          },
        ]);
      }

      await db.insert(activityLogs).values({
        tenantId: tid,
        userId: ownerId,
        action: alreadyProvisioned
          ? `دخول مالك المنصة إلى مؤسسة ${LIBRARY_TENANT_NAME}`
          : `تزويد مؤسسة ${LIBRARY_TENANT_NAME} وترحيل بياناتها المرجعية`,
        details: `حسابات: ${accountsSeeded}، أصناف: ${productsSeeded}، قيمة المخزون الافتتاحي: ${libraryInventoryValue.toFixed(
          2
        )} ريال يمني`,
      });

      return {
        tenantId: tid,
        tenantCode: LIBRARY_TENANT_CODE,
        tenantName: LIBRARY_TENANT_NAME,
        alreadyProvisioned,
        accounts: accountsSeeded,
        products: productsSeeded,
        inventoryValue: libraryInventoryValue,
      };
    }
  ),
});

/**
 * Helper: a protected procedure that additionally enforces super-admin.
 * `protectedProcedureAdmin` requires an authenticated user; the body of each
 * procedure calls `requireOwner(ctx)` to restrict to the platform owner.
 */
function protectedProcedureAdmin() {
  return protectedProcedure;
}
