/**
 * onboardingPresets — محرك اقتراح ذكي للتهيئة الأولية
 * يأخذ متغيرات أساسية من الزائر ويقترح: الدليل المحاسبي، الأصناف، الإعدادات، السياسات، الأدوار
 * معيارية، دقيقة، وسهلة — كل اقتراح قابل للتعديل قبل الحفظ
 */

export type Sector =
  | "retail"
  | "wholesale"
  | "contracting"
  | "services"
  | "knowledge"
  | "manufacturing";
export type Size = "micro" | "small" | "medium" | "enterprise";
export type Country = "YE" | "SA" | "AE" | "EG" | "JO" | "other";

export interface OnboardingInput {
  sector: Sector;
  size: Size;
  country: Country;
  branches: number;
  salesType: "retail" | "wholesale" | "services" | "mixed";
  hasInventory: boolean;
  vatRegistered: boolean;
}

export interface ChartSuggestion {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parentCode?: string;
}

export interface PolicySuggestion {
  allowCredit: boolean;
  allowNegativeStock: boolean;
  requireCustomer: boolean;
  defaultWarehouse: string;
  postingRules: {
    goodsRevenueCode: string;
    serviceRevenueCode: string;
    inventoryCode: string;
    vatRate: number;
  };
}

export interface RoleSuggestion {
  code: string;
  name: string;
  permissions: string[];
}

const BASE_CHART: ChartSuggestion[] = [
  { code: "1010", name: "الصندوق — الخزينة", type: "asset" },
  { code: "1020", name: "البنوك", type: "asset" },
  { code: "1030", name: "العملاء — ذمم مدينة", type: "asset" },
  { code: "1060", name: "المخزون السلعي", type: "asset" },
  { code: "2010", name: "الموردون — ذمم دائنة", type: "liability" },
  { code: "2140", name: "ضريبة القيمة المضافة — مستحقة", type: "liability" },
  { code: "3010", name: "رأس المال", type: "equity" },
  { code: "3100", name: "الأرباح المحتجزة", type: "equity" },
  { code: "4010", name: "إيرادات المبيعات — بضائع", type: "revenue" },
  { code: "4020", name: "إيرادات الخدمات", type: "revenue" },
  { code: "5010", name: "تكلفة المبيعات", type: "expense" },
  { code: "5100", name: "مصاريف تشغيلية", type: "expense" },
];

const SECTOR_CHART: Record<Sector, ChartSuggestion[]> = {
  retail: [
    {
      code: "1061",
      name: "مخزون بضائع التجزئة",
      type: "asset",
      parentCode: "1060",
    },
    {
      code: "4011",
      name: "مبيعات التجزئة",
      type: "revenue",
      parentCode: "4010",
    },
    {
      code: "5011",
      name: "تكلفة بضاعة التجزئة",
      type: "expense",
      parentCode: "5010",
    },
  ],
  wholesale: [
    { code: "1062", name: "مخزون الجملة", type: "asset", parentCode: "1060" },
    {
      code: "4012",
      name: "مبيعات الجملة",
      type: "revenue",
      parentCode: "4010",
    },
  ],
  contracting: [
    { code: "1120", name: "أعمال تحت التنفيذ — WIP", type: "asset" },
    {
      code: "4013",
      name: "إيرادات المقاولات والمشاريع",
      type: "revenue",
      parentCode: "4010",
    },
    {
      code: "5012",
      name: "تكلفة المشاريع",
      type: "expense",
      parentCode: "5010",
    },
    { code: "1080", name: "الدفعات المقدمة لمقاولين", type: "asset" },
  ],
  services: [
    {
      code: "4021",
      name: "إيرادات الاستشارات",
      type: "revenue",
      parentCode: "4020",
    },
    { code: "5110", name: "أتعاب مهنية", type: "expense", parentCode: "5100" },
  ],
  knowledge: [
    {
      code: "4022",
      name: "إيرادات الخدمات المعرفية والطباعة",
      type: "revenue",
      parentCode: "4020",
    },
    {
      code: "5111",
      name: "تكلفة الطباعة والورق",
      type: "expense",
      parentCode: "5100",
    },
  ],
  manufacturing: [
    { code: "1070", name: "مواد خام", type: "asset", parentCode: "1060" },
    {
      code: "1071",
      name: "إنتاج تحت التشغيل",
      type: "asset",
      parentCode: "1060",
    },
    { code: "1072", name: "منتجات تامة", type: "asset", parentCode: "1060" },
  ],
};

const SIZE_ROLES: Record<Size, RoleSuggestion[]> = {
  micro: [
    { code: "owner", name: "المالك", permissions: ["*"] },
    {
      code: "accountant",
      name: "المحاسب",
      permissions: ["accounting", "reports"],
    },
  ],
  small: [
    { code: "owner", name: "المالك", permissions: ["*"] },
    {
      code: "accountant",
      name: "المحاسب",
      permissions: ["accounting", "commercial", "reports"],
    },
    { code: "cashier", name: "أمين الصندوق", permissions: ["sales", "pos"] },
  ],
  medium: [
    { code: "owner", name: "المالك", permissions: ["*"] },
    {
      code: "accountant",
      name: "مدير الحسابات",
      permissions: ["accounting", "reports", "audit"],
    },
    { code: "cashier", name: "أمين الصندوق", permissions: ["sales", "pos"] },
    {
      code: "auditor",
      name: "المراجع الداخلي",
      permissions: ["reports", "audit"],
    },
    { code: "hr", name: "مسؤول الموارد البشرية", permissions: ["hr"] },
  ],
  enterprise: [
    { code: "owner", name: "المالك", permissions: ["*"] },
    {
      code: "accountant",
      name: "مدير الحسابات",
      permissions: ["accounting", "reports", "audit"],
    },
    {
      code: "sales_manager",
      name: "مدير المبيعات",
      permissions: ["commercial", "sales"],
    },
    {
      code: "warehouse_manager",
      name: "مدير المخازن",
      permissions: ["inventory"],
    },
    { code: "hr", name: "الموارد البشرية", permissions: ["hr"] },
    { code: "auditor", name: "المراجع", permissions: ["audit"] },
  ],
};

export function suggestChart(input: OnboardingInput): ChartSuggestion[] {
  const base = [...BASE_CHART];
  const extra = SECTOR_CHART[input.sector] || [];
  // إزالة المخزون إذا لا يوجد مخزون
  const filtered = input.hasInventory
    ? base
    : base.filter(
        c =>
          c.code !== "1060" &&
          !c.code.startsWith("106") &&
          !c.code.startsWith("107")
      );
  return [...filtered, ...extra];
}

export function suggestPolicies(input: OnboardingInput): PolicySuggestion {
  const vatRate =
    input.country === "SA" && input.vatRegistered
      ? 15
      : input.country === "AE" && input.vatRegistered
        ? 5
        : 0;
  return {
    allowCredit: input.sector !== "retail" || input.size !== "micro",
    allowNegativeStock: false,
    requireCustomer:
      input.sector === "contracting" || input.sector === "services",
    defaultWarehouse: input.hasInventory ? "MAIN" : "—",
    postingRules: {
      goodsRevenueCode: input.sector === "contracting" ? "4013" : "4010",
      serviceRevenueCode: "4020",
      inventoryCode: "1060",
      vatRate,
    },
  };
}

export function suggestRoles(input: OnboardingInput): RoleSuggestion[] {
  return SIZE_ROLES[input.size] || SIZE_ROLES.small;
}

export function suggestCostCenters(
  input: OnboardingInput
): { code: string; name: string }[] {
  const base = [
    { code: "CC-ADMIN", name: "الإدارة العامة" },
    { code: "CC-SALES", name: "المبيعات" },
  ];
  if (input.sector === "contracting")
    base.push({ code: "CC-PROJECT", name: "المشاريع" });
  if (input.sector === "knowledge")
    base.push({ code: "CC-PRINT", name: "الطباعة" });
  if (input.branches > 1) {
    for (let i = 1; i <= input.branches; i++)
      base.push({ code: `CC-BR${i}`, name: `الفرع ${i}` });
  }
  return base;
}

export const SECTOR_LABEL: Record<Sector, string> = {
  retail: "تجزئة",
  wholesale: "جملة",
  contracting: "مقاولات ومشاريع",
  services: "خدمات واستشارات",
  knowledge: "خدمات معرفية وطباعة",
  manufacturing: "صناعة",
};

export const SIZE_LABEL: Record<Size, string> = {
  micro: "صغيرة جداً (1-4)",
  small: "صغيرة (5-20)",
  medium: "متوسطة (20-100)",
  enterprise: "كبيرة (100+)",
};
