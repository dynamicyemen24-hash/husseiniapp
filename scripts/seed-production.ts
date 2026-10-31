import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import * as schema from "../drizzle/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run seed");
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function upsertDemoTenant() {
  console.log("[seed] Upserting demo tenant...");
  const existing = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.code, "demo"))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.tenants)
      .set({
        name: "مؤسسة الحسينية التجريبية",
        currency: "YER",
        country: "اليمن",
        subscriptionPlan: "standard",
        sector: "general",
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.code, "demo"));
    console.log("[seed] Demo tenant updated.");
    return existing[0].id;
  }

  const [inserted] = await db
    .insert(schema.tenants)
    .values({
      name: "مؤسسة الحسينية التجريبية",
      code: "demo",
      currency: "YER",
      country: "اليمن",
      subscriptionPlan: "standard",
      sector: "general",
    })
    .returning({ id: schema.tenants.id });
  console.log("[seed] Demo tenant created.");
  return inserted.id;
}

async function upsertSystemRoles(tenantId: number) {
  console.log("[seed] Upserting system roles...");
  const roles = [
    {
      code: "ADMIN",
      name: "admin",
      nameAr: "مدير النظام",
      description: "Full system access",
    },
    {
      code: "ACCOUNTANT",
      name: "accountant",
      nameAr: "محاسب",
      description: "Accounting module access",
    },
    {
      code: "AUDITOR",
      name: "auditor",
      nameAr: "مراجع",
      description: "Read-only audit access",
    },
    {
      code: "MANAGER",
      name: "manager",
      nameAr: "مدير",
      description: "Management dashboard access",
    },
    {
      code: "STOREKEEPER",
      name: "storekeeper",
      nameAr: "أمين مستودع",
      description: "Inventory management access",
    },
    {
      code: "SALES",
      name: "sales",
      nameAr: "مبيعات",
      description: "Sales and POS access",
    },
    {
      code: "PROCUREMENT",
      name: "procurement",
      nameAr: "مشتريات",
      description: "Procurement module access",
    },
    {
      code: "HR",
      name: "hr",
      nameAr: "موارد بشرية",
      description: "HR and payroll access",
    },
  ];

  for (const role of roles) {
    const existing = await db
      .select()
      .from(schema.roles)
      .where(
        and(
          eq(schema.roles.tenantId, tenantId),
          eq(schema.roles.code, role.code)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.roles)
        .set({
          name: role.name,
          nameAr: role.nameAr,
          description: role.description,
          updatedAt: new Date(),
        })
        .where(eq(schema.roles.id, existing[0].id));
    } else {
      await db.insert(schema.roles).values({
        tenantId,
        code: role.code,
        name: role.name,
        nameAr: role.nameAr,
        description: role.description,
      });
    }
  }
  console.log("[seed] System roles upserted.");
}

async function upsertPermissions(tenantId: number) {
  console.log("[seed] Upserting permissions...");
  const permissions = [
    // Accounting
    {
      key: "accounting.read",
      name: "Accounting Read",
      nameAr: "قراءة المحاسبة",
      category: "accounting",
    },
    {
      key: "accounting.write",
      name: "Accounting Write",
      nameAr: "كتابة المحاسبة",
      category: "accounting",
    },
    {
      key: "accounting.post",
      name: "Accounting Post",
      nameAr: "ترحيل المحاسبة",
      category: "accounting",
    },
    {
      key: "accounting.approve",
      name: "Accounting Approve",
      nameAr: "اعتماد المحاسبة",
      category: "accounting",
    },
    {
      key: "accounting.close_period",
      name: "Accounting Close Period",
      nameAr: "إقفال الفترات",
      category: "accounting",
    },
    // Inventory
    {
      key: "inventory.read",
      name: "Inventory Read",
      nameAr: "قراءة المخزون",
      category: "inventory",
    },
    {
      key: "inventory.write",
      name: "Inventory Write",
      nameAr: "كتابة المخزون",
      category: "inventory",
    },
    {
      key: "inventory.adjust",
      name: "Inventory Adjust",
      nameAr: "تسوية المخزون",
      category: "inventory",
    },
    {
      key: "inventory.transfer",
      name: "Inventory Transfer",
      nameAr: "نقل المخزون",
      category: "inventory",
    },
    // Sales
    {
      key: "sales.read",
      name: "Sales Read",
      nameAr: "قراءة المبيعات",
      category: "sales",
    },
    {
      key: "sales.write",
      name: "Sales Write",
      nameAr: "كتابة المبيعات",
      category: "sales",
    },
    {
      key: "sales.pos",
      name: "Sales POS",
      nameAr: "نقطة البيع",
      category: "sales",
    },
    {
      key: "sales.return",
      name: "Sales Return",
      nameAr: "إرجاع المبيعات",
      category: "sales",
    },
    // Procurement
    {
      key: "procurement.read",
      name: "Procurement Read",
      nameAr: "قراءة المشتريات",
      category: "procurement",
    },
    {
      key: "procurement.write",
      name: "Procurement Write",
      nameAr: "كتابة المشتريات",
      category: "procurement",
    },
    {
      key: "procurement.approve",
      name: "Procurement Approve",
      nameAr: "采购审批",
      category: "procurement",
    },
    // HR
    { key: "hr.read", name: "HR Read", nameAr: "读取人力资源", category: "hr" },
    {
      key: "hr.write",
      name: "HR Write",
      nameAr: "写入人力资源",
      category: "hr",
    },
    {
      key: "hr.payroll",
      name: "HR Payroll",
      nameAr: "薪资管理",
      category: "hr",
    },
    // Settings
    {
      key: "settings.read",
      name: "Settings Read",
      nameAr: "读取设置",
      category: "settings",
    },
    {
      key: "settings.write",
      name: "Settings Write",
      nameAr: "写入设置",
      category: "settings",
    },
    // Reports
    {
      key: "reports.read",
      name: "Reports Read",
      nameAr: "读取报表",
      category: "reports",
    },
    {
      key: "reports.export",
      name: "Reports Export",
      nameAr: "导出报表",
      category: "reports",
    },
  ];

  for (const perm of permissions) {
    const existing = await db
      .select()
      .from(schema.permissions)
      .where(eq(schema.permissions.key, perm.key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.permissions)
        .set({
          name: perm.name,
          nameAr: perm.nameAr,
          category: perm.category,
          updatedAt: new Date(),
        })
        .where(eq(schema.permissions.id, existing[0].id));
    } else {
      await db.insert(schema.permissions).values({
        key: perm.key,
        name: perm.name,
        nameAr: perm.nameAr,
        category: perm.category,
      });
    }
  }
  console.log("[seed] Permissions upserted.");
}

async function upsertDefaultSettings(tenantId: number) {
  console.log("[seed] Upserting default settings...");
  const existing = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.tenantId, tenantId))
    .limit(1);

  const defaultSettings = {
    tenantId,
    institutionName: "مؤسسة الحسينية لخدمات الأعمال",
    currency: "ريال يمني (YER)",
    country: "اليمن",
    accountingPeriod: new Date().getFullYear().toString(),
    managerName: "إدارة المؤسسة",
    posConfig: JSON.stringify({
      taxRate: 0,
      discountEnabled: true,
      printReceipt: true,
      currency: "YER",
    }),
    salesPolicy: JSON.stringify({
      allowNegativeStock: false,
      requireCustomer: false,
      defaultPaymentMethod: "cash",
    }),
    paymentMethods: JSON.stringify([
      { id: "cash", name: "نقدي", enabled: true },
      { id: "card", name: "بطاقة", enabled: true },
      { id: "transfer", name: "تحويل", enabled: true },
    ]),
    postingRules: JSON.stringify({
      autoPost: false,
      requireApproval: true,
      allowEditPosted: false,
    }),
    zatcaConfig: JSON.stringify({
      enabled: false,
      environment: "sandbox",
    }),
    documentTemplate: JSON.stringify({
      logo: "",
      footer: "شكراً لتعاملكم معنا",
      terms: "البضاعة المباعة لا ترد ولا تستبدل",
    }),
  };

  if (existing.length > 0) {
    await db
      .update(schema.settings)
      .set({ ...defaultSettings, updatedAt: new Date() })
      .where(eq(schema.settings.tenantId, tenantId));
    console.log("[seed] Default settings updated.");
  } else {
    await db.insert(schema.settings).values(defaultSettings);
    console.log("[seed] Default settings created.");
  }
}

async function upsertWorkflowDefinitions(tenantId: number) {
  console.log("[seed] Upserting workflow definitions...");
  try {
    const workflows = [
      {
        name: "purchase_approval",
        nameAr: "اعتماد المشتريات",
        description: "Purchase order approval workflow",
        module: "procurement",
        steps: JSON.stringify([
          {
            id: "draft",
            name: "مسودة",
            nameAr: "مسودة",
            order: 0,
            isInitial: true,
          },
          {
            id: "pending",
            name: "قيد المراجعة",
            nameAr: "قيد المراجعة",
            order: 1,
          },
          {
            id: "approved",
            name: "معتمد",
            nameAr: "معتمد",
            order: 2,
            isTerminal: true,
          },
          {
            id: "rejected",
            name: "مرفوض",
            nameAr: "مرفوض",
            order: 3,
            isTerminal: true,
          },
        ]),
        transitions: JSON.stringify([
          { from: "draft", to: "pending", action: "submit" },
          {
            from: "pending",
            to: "approved",
            action: "approve",
            requiredRole: "manager",
          },
          {
            from: "pending",
            to: "rejected",
            action: "reject",
            requiredRole: "manager",
          },
        ]),
      },
      {
        name: "expense_approval",
        nameAr: "اعتماد المصروفات",
        description: "Expense claim approval workflow",
        module: "accounting",
        steps: JSON.stringify([
          {
            id: "draft",
            name: "مسودة",
            nameAr: "مسودة",
            order: 0,
            isInitial: true,
          },
          { id: "submitted", name: "مقدم", nameAr: "مقدم", order: 1 },
          {
            id: "approved",
            name: "معتمد",
            nameAr: "与批准",
            order: 2,
            isTerminal: true,
          },
          {
            id: "rejected",
            name: "拒绝",
            nameAr: "拒绝",
            order: 3,
            isTerminal: true,
          },
          {
            id: "paid",
            name: "已支付",
            nameAr: "已支付",
            order: 4,
            isTerminal: true,
          },
        ]),
        transitions: JSON.stringify([
          { from: "draft", to: "submitted", action: "submit" },
          {
            from: "submitted",
            to: "approved",
            action: "approve",
            requiredRole: "accountant",
          },
          {
            from: "submitted",
            to: "rejected",
            action: "reject",
            requiredRole: "accountant",
          },
          {
            from: "approved",
            to: "paid",
            action: "pay",
            requiredRole: "accountant",
          },
        ]),
      },
      {
        name: "leave_approval",
        nameAr: "اعتماد الإجازات",
        description: "Leave request approval workflow",
        module: "hr",
        steps: JSON.stringify([
          {
            id: "draft",
            name: "مسودة",
            nameAr: "مسودة",
            order: 0,
            isInitial: true,
          },
          {
            id: "pending",
            name: "قيد المراجعة",
            nameAr: "قيد المراجعة",
            order: 1,
          },
          {
            id: "approved",
            name: "与批准",
            nameAr: "批准",
            order: 2,
            isTerminal: true,
          },
          {
            id: "rejected",
            name: "拒绝",
            nameAr: "拒绝",
            order: 3,
            isTerminal: true,
          },
        ]),
        transitions: JSON.stringify([
          { from: "draft", to: "pending", action: "submit" },
          {
            from: "pending",
            to: "approved",
            action: "approve",
            requiredRole: "hr",
          },
          {
            from: "pending",
            to: "rejected",
            action: "reject",
            requiredRole: "hr",
          },
        ]),
      },
    ];

    for (const wf of workflows) {
      const existing = await db
        .select()
        .from(schema.workflowDefinitions)
        .where(
          and(
            eq(schema.workflowDefinitions.tenantId, tenantId),
            eq(schema.workflowDefinitions.name, wf.name)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.workflowDefinitions)
          .set({
            nameAr: wf.nameAr,
            description: wf.description,
            module: wf.module,
            steps: wf.steps,
            transitions: wf.transitions,
            updatedAt: new Date(),
          })
          .where(eq(schema.workflowDefinitions.id, existing[0].id));
      } else {
        await db.insert(schema.workflowDefinitions).values({
          tenantId,
          name: wf.name,
          nameAr: wf.nameAr,
          description: wf.description,
          module: wf.module,
          steps: wf.steps,
          transitions: wf.transitions,
        });
      }
    }
    console.log("[seed] Workflow definitions upserted.");
  } catch (error: any) {
    if (error.code === "42P01") {
      console.warn(
        "[seed] Workflow definitions table does not exist yet, skipping (run migrations first)."
      );
    } else {
      throw error;
    }
  }
}

async function upsertDefaultAccounts(tenantId: number) {
  console.log("[seed] Upserting default chart of accounts...");
  const accounts = [
    // Assets
    {
      code: "1000",
      name: "الأصول",
      nameAr: "الأصول",
      type: "asset",
      isCustom: false,
    },
    {
      code: "1100",
      name: "الأصول المتداولة",
      nameAr: "الأصول المتداولة",
      type: "asset",
      parentCode: "1000",
      isCustom: false,
    },
    {
      code: "1110",
      name: "النقدية",
      nameAr: "النقدية",
      type: "asset",
      parentCode: "1100",
      isCustom: false,
    },
    {
      code: "1120",
      name: "البنوك",
      nameAr: "البنوك",
      type: "asset",
      parentCode: "1100",
      isCustom: false,
    },
    {
      code: "1130",
      name: "الذمم المدينة",
      nameAr: "الذمم المدينة",
      type: "asset",
      parentCode: "1100",
      isCustom: false,
    },
    {
      code: "1140",
      name: "المخزون",
      nameAr: "المخزون",
      type: "asset",
      parentCode: "1100",
      isCustom: false,
    },
    {
      code: "1200",
      name: "الأصول الثابتة",
      nameAr: "الأصول الثابتة",
      type: "asset",
      parentCode: "1000",
      isCustom: false,
    },
    {
      code: "1210",
      name: "الأراضي والمباني",
      nameAr: "الأراضي والمباني",
      type: "asset",
      parentCode: "1200",
      isCustom: false,
    },
    {
      code: "1220",
      name: "المعدات والآلات",
      nameAr: "المعدات والآلات",
      type: "asset",
      parentCode: "1200",
      isCustom: false,
    },
    {
      code: "1230",
      name: "الأثاث والتجهيزات",
      nameAr: "الأثاث والتجهيزات",
      type: "asset",
      parentCode: "1200",
      isCustom: false,
    },
    // Liabilities
    {
      code: "2000",
      name: "الخصوم",
      nameAr: "الخصوم",
      type: "liability",
      isCustom: false,
    },
    {
      code: "2100",
      name: "الخصوم المتداولة",
      nameAr: "الخصوم المتداولة",
      type: "liability",
      parentCode: "2000",
      isCustom: false,
    },
    {
      code: "2110",
      name: "الذمم الدائنة",
      nameAr: "الذمم الدائنة",
      type: "liability",
      parentCode: "2100",
      isCustom: false,
    },
    {
      code: "2120",
      name: "الإيرادات المقدمة",
      nameAr: "الإيرادات المقدمة",
      type: "liability",
      parentCode: "2100",
      isCustom: false,
    },
    {
      code: "2200",
      name: "الخصوم طويلة الأجل",
      nameAr: "الخصوم طويلة الأجل",
      type: "liability",
      parentCode: "2000",
      isCustom: false,
    },
    // Equity
    {
      code: "3000",
      name: "حقوق الملكية",
      nameAr: "حقوق الملكية",
      type: "equity",
      isCustom: false,
    },
    {
      code: "3100",
      name: "رأس المال",
      nameAr: "رأس المال",
      type: "equity",
      parentCode: "3000",
      isCustom: false,
    },
    {
      code: "3200",
      name: "الأرباح المحتجزة",
      nameAr: "الأرباح المحتجزة",
      type: "equity",
      parentCode: "3000",
      isCustom: false,
    },
    // Revenue
    {
      code: "4000",
      name: "الإيرادات",
      nameAr: "الإيرادات",
      type: "revenue",
      isCustom: false,
    },
    {
      code: "4100",
      name: "إيرادات المبيعات",
      nameAr: "إيرادات المبيعات",
      type: "revenue",
      parentCode: "4000",
      isCustom: false,
    },
    {
      code: "4200",
      name: "إيرادات الخدمات",
      nameAr: "إيرادات الخدمات",
      type: "revenue",
      parentCode: "4000",
      isCustom: false,
    },
    {
      code: "4300",
      name: "إيرادات أخرى",
      nameAr: "إيرادات أخرى",
      type: "revenue",
      parentCode: "4000",
      isCustom: false,
    },
    // Expenses
    {
      code: "5000",
      name: "المصروفات",
      nameAr: "المصروفات",
      type: "expense",
      isCustom: false,
    },
    {
      code: "5100",
      name: "مصروفات التشغيل",
      nameAr: "مصروفات التشغيل",
      type: "expense",
      parentCode: "5000",
      isCustom: false,
    },
    {
      code: "5200",
      name: "مصروفات إدارية",
      nameAr: "مصروفات إدارية",
      type: "expense",
      parentCode: "5000",
      isCustom: false,
    },
    {
      code: "5300",
      name: "مصروفات تسويقية",
      nameAr: "مصروفات تسويقية",
      type: "expense",
      parentCode: "5000",
      isCustom: false,
    },
    {
      code: "5400",
      name: "مصروفات تمويلية",
      nameAr: "مصروفات تمويلية",
      type: "expense",
      parentCode: "5000",
      isCustom: false,
    },
  ];

  const codeToId = new Map<string, number>();

  for (const acc of accounts) {
    const existing = await db
      .select()
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.tenantId, tenantId),
          eq(schema.accounts.code, acc.code)
        )
      )
      .limit(1);

    let parentId: number | null = null;
    if (acc.parentCode) {
      parentId = codeToId.get(acc.parentCode) ?? null;
    }

    if (existing.length > 0) {
      await db
        .update(schema.accounts)
        .set({
          name: acc.name,
          nameAr: acc.nameAr,
          type: acc.type as any,
          parentAccountId: parentId,
          isCustom: acc.isCustom,
          updatedAt: new Date(),
        })
        .where(eq(schema.accounts.id, existing[0].id));
      codeToId.set(acc.code, existing[0].id);
    } else {
      const [inserted] = await db
        .insert(schema.accounts)
        .values({
          tenantId,
          code: acc.code,
          name: acc.name,
          nameAr: acc.nameAr,
          type: acc.type as any,
          parentAccountId: parentId,
          isCustom: acc.isCustom,
        })
        .returning({ id: schema.accounts.id });
      codeToId.set(acc.code, inserted.id);
    }
  }
  console.log("[seed] Default chart of accounts upserted.");
}

async function upsertDefaultCurrencies(tenantId: number) {
  console.log("[seed] Upserting default currencies...");
  const currencies = [
    {
      code: "YER",
      name: "Yemeni Rial",
      nameAr: "الريال اليمني",
      symbol: "﷼",
      isBase: true,
      exchangeRate: "1",
    },
    {
      code: "USD",
      name: "US Dollar",
      nameAr: "الدولار الأمريكي",
      symbol: "$",
      isBase: false,
      exchangeRate: "250",
    },
    {
      code: "SAR",
      name: "Saudi Riyal",
      nameAr: "الريال السعودي",
      symbol: "﷼",
      isBase: false,
      exchangeRate: "66.67",
    },
    {
      code: "EUR",
      name: "Euro",
      nameAr: "اليورو",
      symbol: "€",
      isBase: false,
      exchangeRate: "270",
    },
  ];

  for (const cur of currencies) {
    const existing = await db
      .select()
      .from(schema.currencies)
      .where(
        and(
          eq(schema.currencies.tenantId, tenantId),
          eq(schema.currencies.code, cur.code)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.currencies)
        .set({
          name: cur.name,
          nameAr: cur.nameAr,
          symbol: cur.symbol,
          isBase: cur.isBase,
          exchangeRate: cur.exchangeRate,
          updatedAt: new Date(),
        })
        .where(eq(schema.currencies.id, existing[0].id));
    } else {
      await db.insert(schema.currencies).values({
        tenantId,
        code: cur.code,
        name: cur.name,
        nameAr: cur.nameAr,
        symbol: cur.symbol,
        isBase: cur.isBase,
        exchangeRate: cur.exchangeRate,
      });
    }
  }
  console.log("[seed] Default currencies upserted.");
}

async function upsertDefaultUnits(tenantId: number) {
  console.log("[seed] Upserting default units...");
  const units = [
    { code: "PCS", name: "قطعة", nameAr: "قطعة", symbol: "ق" },
    { code: "BOX", name: "علبة", nameAr: "علبة", symbol: "ع" },
    { code: "PKT", name: "حزمة", nameAr: "حزمة", symbol: "ح" },
    { code: "KG", name: "كيلوجرام", nameAr: "كيلوجرام", symbol: "كجم" },
    { code: "M", name: "متر", nameAr: "متر", symbol: "م" },
    { code: "L", name: "لتر", nameAr: "لتر", symbol: "ل" },
  ];

  for (const unit of units) {
    const existing = await db
      .select()
      .from(schema.units)
      .where(
        and(
          eq(schema.units.tenantId, tenantId),
          eq(schema.units.code, unit.code)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.units)
        .set({
          name: unit.name,
          nameAr: unit.nameAr,
          symbol: unit.symbol,
          updatedAt: new Date(),
        })
        .where(eq(schema.units.id, existing[0].id));
    } else {
      await db.insert(schema.units).values({
        tenantId,
        code: unit.code,
        name: unit.name,
        nameAr: unit.nameAr,
        symbol: unit.symbol,
      });
    }
  }
  console.log("[seed] Default units upserted.");
}

async function upsertDefaultCategories(tenantId: number) {
  console.log("[seed] Upserting default categories...");
  const categories = [
    { code: "GOODS", name: "سلع", nameAr: "سلع" },
    { code: "SERVICES", name: "خدمات", nameAr: "خدمات" },
    { code: "RAW", name: "مواد خام", nameAr: "مواد خام" },
    { code: "FINISHED", name: "منتجات تامة", nameAr: "منتجات تامة" },
    { code: "CONSUMABLE", name: "مستهلكات", nameAr: "مستهلكات" },
  ];

  for (const cat of categories) {
    const existing = await db
      .select()
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.tenantId, tenantId),
          eq(schema.categories.code, cat.code)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.categories)
        .set({ name: cat.name, nameAr: cat.nameAr, updatedAt: new Date() })
        .where(eq(schema.categories.id, existing[0].id));
    } else {
      await db.insert(schema.categories).values({
        tenantId,
        code: cat.code,
        name: cat.name,
        nameAr: cat.nameAr,
      });
    }
  }
  console.log("[seed] Default categories upserted.");
}

async function upsertDefaultWarehouse(tenantId: number) {
  console.log("[seed] Upserting default warehouse...");
  const existing = await db
    .select()
    .from(schema.warehouses)
    .where(
      and(
        eq(schema.warehouses.tenantId, tenantId),
        eq(schema.warehouses.code, "MAIN")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.warehouses)
      .set({
        name: "المستودع الرئيسي",
        nameAr: "المستودع الرئيسي",
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.warehouses.id, existing[0].id));
  } else {
    await db.insert(schema.warehouses).values({
      tenantId,
      code: "MAIN",
      name: "المستودع الرئيسي",
      nameAr: "المستودع الرئيسي",
      isActive: true,
    });
  }
  console.log("[seed] Default warehouse upserted.");
}

async function main() {
  console.log("[seed] Starting production seed...");

  try {
    const tenantId = await upsertDemoTenant();
    await upsertDefaultCurrencies(tenantId);
    await upsertDefaultUnits(tenantId);
    await upsertDefaultCategories(tenantId);
    await upsertDefaultAccounts(tenantId);
    await upsertDefaultWarehouse(tenantId);
    await upsertSystemRoles(tenantId);
    await upsertPermissions(tenantId);
    await upsertDefaultSettings(tenantId);
    await upsertWorkflowDefinitions(tenantId);

    console.log("[seed] Production seed completed successfully.");
  } catch (error) {
    console.error("[seed] Error:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main();
