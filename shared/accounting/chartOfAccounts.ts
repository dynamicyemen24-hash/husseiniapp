/**
 * Standardized Chart of Accounts (COA) Templates
 * لكل منطقة/دولة مجموعة معيارية من الحسابات
 * Supports: Yemen, Saudi Arabia, UAE, and custom configurations
 */

export interface COAAccount {
  code: string;
  name: string;
  nameEn?: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  category: string;
  description: string;
  isSystem?: boolean;
  parentCode?: string;
}

export interface COATemplate {
  id: string;
  name: string;
  nameAr: string;
  country: string;
  currency: string;
  accounts: COAAccount[];
  defaultPostingRules: DefaultPostingRules;
  defaultPaymentMethods: DefaultPaymentMethod[];
  vatRate: number;
  taxSystem: "vat" | "ztca" | "none";
}

export interface DefaultPostingRules {
  // Revenue
  goodsRevenueCode: string;
  serviceRevenueCode: string;
  otherRevenueCode: string;
  discountRevenueCode: string;
  // Expenses
  cogsCode: string;
  inventoryCode: string;
  discountCode: string;
  payrollCode: string;
  rentCode: string;
  governmentFeesCode: string;
  miscellaneousExpenseCode: string;
  // Assets/Liabilities
  cashCode: string;
  bankCode: string;
  receivablesCode: string;
  payablesCode: string;
  vatPayableCode: string;
  vatReceivableCode: string;
  vatCode: string;
  // Special
  equityCode: string;
  postInventory: boolean;
  postCogs: boolean;
  openingBalancesCode: string;
}

export interface DefaultPaymentMethod {
  key: string;
  label: string;
  enabled: boolean;
  accountCode: string;
  isIntermediary: boolean;
  intermediaryAccountCode?: string;
}

// ─── Yemen Standard COA Template ───
export const YEMEN_STANDARD_COA: COATemplate = {
  id: "yemen-standard",
  name: "المخطط المحاسبي المعياري اليمني",
  nameAr: "المخطط المحاسبي المعياري اليمني",
  country: "اليمن",
  currency: "ريال يمني (YER)",
  taxSystem: "none",
  vatRate: 0,
  accounts: [
    // Assets
    {
      code: "1010",
      name: "الصندوق الرئيسي",
      type: "asset",
      category: "الأصول المتداولة",
      description: "صندوق النقدية الرئيسي",
      isSystem: true,
    },
    {
      code: "1020",
      name: "الحسابات البنكية",
      type: "asset",
      category: "الأصول المتداولة",
      description: "جميع الحسابات البنكية",
      isSystem: true,
    },
    {
      code: "1021",
      name: "حساب البطاقات",
      type: "asset",
      category: "الأصول المتداولة",
      description: "حساب مدفوعات البطاقات البنكية",
      isSystem: true,
    },
    {
      code: "1022",
      name: "حساب التحويلات البنكية",
      type: "asset",
      category: "الأصول المتداولة",
      description: "حساب التحويلات البنكية الواردة والصادرة",
      isSystem: true,
    },
    {
      code: "1023",
      name: "حساب الدفع الإلكتروني",
      type: "asset",
      category: "الأصول المتداولة",
      description: "محفظة الدفع الإلكتروني",
      isSystem: true,
    },
    {
      code: "1030",
      name: "العملاء والمدينون",
      type: "asset",
      category: "الأصول المتداولة",
      description: "إجمالي المستحقات لدى العملاء",
      isSystem: true,
    },
    {
      code: "1040",
      name: "المستحقات الضريبية",
      type: "asset",
      category: "الأصول المتداولة",
      description: "الضريبة المستردة من الدولة",
      isSystem: true,
    },
    {
      code: "1050",
      name: "المتطلبات والمدفوعات المسبقة",
      type: "asset",
      category: "الأصول المتداولة",
      description: "المدفوعات المسبقة للموردين والخدمات",
      isSystem: true,
    },
    {
      code: "1060",
      name: "مخزون البضاعة",
      type: "asset",
      category: "الأصول المتداولة",
      description: "قيمة البضائع المتاحة للبيع",
      isSystem: true,
    },
    {
      code: "1070",
      name: "المعدات والمركبات",
      type: "asset",
      category: "الأصول الثابتة",
      description: "المعدات والمركبات المستخدمة",
      isSystem: true,
    },
    {
      code: "1080",
      name: "الأجهزة والتقنيات",
      type: "asset",
      category: "الأصول الثابتة",
      description: "أجهزة الكمبيوتر والطابعات وغيرها",
      isSystem: true,
    },
    {
      code: "1090",
      name: "الخصومات المسموح بها",
      type: "asset",
      category: "الأصول المتداولة",
      description: "الخصومات المسموح بها على المبيعات",
      isSystem: true,
    },
    // Liabilities
    {
      code: "2010",
      name: "الموردون والدائنون",
      type: "liability",
      category: "الخصوم المتداولة",
      description: "إجمالي الالتزامات تجاه الموردين",
      isSystem: true,
    },
    {
      code: "2020",
      name: "الضرائب والرسوم المستحقة",
      type: "liability",
      category: "الخصوم المتداولة",
      description: "الضرائب والرسوم المستحقة للدولة",
      isSystem: true,
    },
    {
      code: "2030",
      name: "القروض والتمويل",
      type: "liability",
      category: "الخصوم طويلة الأجل",
      description: "القروض والتمويلات البنكية",
      isSystem: true,
    },
    // Equity
    {
      code: "3010",
      name: "رأس المال",
      type: "equity",
      category: "حقوق الملكية",
      description: "رأس مال المؤسسة",
      isSystem: true,
    },
    {
      code: "3020",
      name: "الأرباح المحتجزة",
      type: "equity",
      category: "حقوق الملكية",
      description: "الأرباح غير الموزعة",
      isSystem: true,
    },
    // Revenue
    {
      code: "4010",
      name: "إيرادات الخدمات",
      type: "revenue",
      category: "الإيرادات التشغيلية",
      description: "إيرادات تقديم الخدمات",
      isSystem: true,
    },
    {
      code: "4011",
      name: "إيرادات بيع البضائع",
      type: "revenue",
      category: "الإيرادات التشغيلية",
      description: "إيرادات بيع البضائع والمنتجات",
      isSystem: true,
    },
    {
      code: "4020",
      name: "إيرادات متنوعة",
      type: "revenue",
      category: "الإيرادات الأخرى",
      description: "إيرادات أخرى غير تشغيلية",
      isSystem: true,
    },
    // Expenses
    {
      code: "5010",
      name: "مصروفات الرواتب والأجور",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "رواتب الموظفين وأجورهم",
      isSystem: true,
    },
    {
      code: "5020",
      name: "مصروفات الإيجار والخدمات",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "إيجار المقر وفواتير الكهرباء والماء والإنترنت",
      isSystem: true,
    },
    {
      code: "5030",
      name: "مصروفات حكومية ورسوم",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "الرسوم الحكومية والتراخيص",
      isSystem: true,
    },
    {
      code: "5040",
      name: "مصروفات التسويق والإعلان",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "تكاليف التسويق والإعلان",
      isSystem: true,
    },
    {
      code: "5050",
      name: "تكلفة البضاعة المباعة",
      type: "expense",
      category: "تكلفة المبيعات",
      description: "تكلفة البضاعة المباعة",
      isSystem: true,
    },
    {
      code: "5060",
      name: "مصروفات النقل واللوجستيات",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "تكاليف الشحن والنقل",
      isSystem: true,
    },
    {
      code: "5070",
      name: "مصروفات الصيانة والتطوير",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "صيانة المعدات والتطوير التقني",
      isSystem: true,
    },
    {
      code: "5080",
      name: "مصروفات متنوعة",
      type: "expense",
      category: "المصروفات الإدارية",
      description: "مصروفات عامة ومتنوعة",
      isSystem: true,
    },
    {
      code: "5090",
      name: "مصروفات الضرائب",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "الضرائب المستحقة",
      isSystem: true,
    },
  ],
  defaultPostingRules: {
    goodsRevenueCode: "4011",
    serviceRevenueCode: "4010",
    otherRevenueCode: "4020",
    discountRevenueCode: "1090",
    cogsCode: "5050",
    inventoryCode: "1060",
    discountCode: "1090",
    payrollCode: "5010",
    rentCode: "5020",
    governmentFeesCode: "5030",
    miscellaneousExpenseCode: "5080",
    cashCode: "1010",
    bankCode: "1020",
    receivablesCode: "1030",
    payablesCode: "2010",
    vatPayableCode: "2020",
    vatReceivableCode: "1040",
    vatCode: "5090",
    equityCode: "3010",
    postInventory: true,
    postCogs: true,
    openingBalancesCode: "1000",
  },
  defaultPaymentMethods: [
    {
      key: "cash",
      label: "نقدي",
      enabled: true,
      accountCode: "1010",
      isIntermediary: false,
    },
    {
      key: "card",
      label: "بطاقة بنكية",
      enabled: true,
      accountCode: "1020",
      isIntermediary: true,
      intermediaryAccountCode: "1021",
    },
    {
      key: "transfer",
      label: "تحويل بنكي",
      enabled: true,
      accountCode: "1020",
      isIntermediary: true,
      intermediaryAccountCode: "1022",
    },
    {
      key: "online",
      label: "دفع إلكتروني",
      enabled: true,
      accountCode: "1020",
      isIntermediary: true,
      intermediaryAccountCode: "1023",
    },
    {
      key: "credit",
      label: "آجل (ائتمان)",
      enabled: true,
      accountCode: "1030",
      isIntermediary: false,
    },
  ],
};

// ─── Saudi Arabia Standard COA Template ───
export const SAUDI_STANDARD_COA: COATemplate = {
  id: "saudi-standard",
  name: "المخطط المحاسبي المعياري السعودي",
  nameAr: "المخطط المحاسبي المعياري السعودي",
  country: "السعودية",
  currency: "ريال سعودي (SAR)",
  taxSystem: "ztca",
  vatRate: 15,
  accounts: [
    // Assets
    {
      code: "1010",
      name: "الصندوق",
      type: "asset",
      category: "الأصول المتداولة",
      description: "صندوق النقدية",
    },
    {
      code: "1020",
      name: "الحسابات البنكية",
      type: "asset",
      category: "الأصول المتداولة",
      description: "الحسابات البنكية",
    },
    {
      code: "1030",
      name: "العملاء",
      type: "asset",
      category: "الأصول المتداولة",
      description: "ذمم العملاء المدينة",
    },
    {
      code: "1040",
      name: "الضريبة المستحقة القبض",
      type: "asset",
      category: "الأصول المتداولة",
      description: "ضريبة القيمة المضافة المستحقة القبض",
    },
    {
      code: "1050",
      name: "المتطلبات",
      type: "asset",
      category: "الأصول المتداولة",
      description: "المتطلبات والمدفوعات المسبقة",
    },
    {
      code: "1060",
      name: "المخزون",
      type: "asset",
      category: "الأصول المتداولة",
      description: "مخزون البضائع",
    },
    {
      code: "1070",
      name: "المعدات",
      type: "asset",
      category: "الأصول الثابتة",
      description: "المعدات والمركبات",
    },
    {
      code: "1080",
      name: "الأجهزة",
      type: "asset",
      category: "الأصول الثابتة",
      description: "الأجهزة والتقنيات",
    },
    {
      code: "1090",
      name: "الخصومات",
      type: "asset",
      category: "الأصول المتداولة",
      description: "الخصومات المسموح بها",
    },
    // Liabilities
    {
      code: "2010",
      name: "الموردون",
      type: "liability",
      category: "الخصوم المتداولة",
      description: "ذمم الموردين الدائنة",
    },
    {
      code: "2020",
      name: "الضريبة المستحقة الدفع",
      type: "liability",
      category: "الخصوم المتداولة",
      description: "ضريبة القيمة المضافة المستحقة الدفع",
    },
    {
      code: "2030",
      name: "القروض",
      type: "liability",
      category: "الخصوم طويلة الأجل",
      description: "القروض والتمويلات",
    },
    {
      code: "2040",
      name: "الزكاة",
      type: "liability",
      category: "الخصوم طويلة الأجل",
      description: "الزكاة المستحقة",
    },
    // Equity
    {
      code: "3010",
      name: "رأس المال",
      type: "equity",
      category: "حقوق الملكية",
      description: "رأس المال",
    },
    {
      code: "3020",
      name: "الأرباح المحتجزة",
      type: "equity",
      category: "حقوق الملكية",
      description: "الأرباح غير الموزعة",
    },
    // Revenue
    {
      code: "4010",
      name: "إيرادات الخدمات",
      type: "revenue",
      category: "الإيرادات التشغيلية",
      description: "إيرادات الخدمات",
    },
    {
      code: "4011",
      name: "إيرادات البيع",
      type: "revenue",
      category: "الإيرادات التشغيلية",
      description: "إيرادات بيع البضائع",
    },
    {
      code: "4020",
      name: "إيرادات أخرى",
      type: "revenue",
      category: "الإيرادات الأخرى",
      description: "إيرادات متنوعة",
    },
    // Expenses
    {
      code: "5010",
      name: "الرواتب",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "رواتب العاملين",
    },
    {
      code: "5020",
      name: "الإيجار والخدمات",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "إيجار وفواتير",
    },
    {
      code: "5030",
      name: "الرسوم الحكومية",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "رسوم الزكاة والضريبة والتجارة",
    },
    {
      code: "5040",
      name: "التسويق",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "تكاليف التسويق",
    },
    {
      code: "5050",
      name: "تكلفة البيع",
      type: "expense",
      category: "تكلفة المبيعات",
      description: "تكلفة البضاعة المباعة",
    },
    {
      code: "5060",
      name: "النقل واللوجستيات",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "تكاليف الشحن",
    },
    {
      code: "5070",
      name: "الصيانة",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "صيانة المعدات",
    },
    {
      code: "5080",
      name: "مصروفات متنوعة",
      type: "expense",
      category: "المصروفات الإدارية",
      description: "مصروفات عامة",
    },
    {
      code: "5090",
      name: "الضريبة على القيمة المضافة",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "الضريبة المستحقة",
    },
  ],
  defaultPostingRules: {
    goodsRevenueCode: "4011",
    serviceRevenueCode: "4010",
    otherRevenueCode: "4020",
    discountRevenueCode: "1090",
    cogsCode: "5050",
    inventoryCode: "1060",
    discountCode: "1090",
    payrollCode: "5010",
    rentCode: "5020",
    governmentFeesCode: "5030",
    miscellaneousExpenseCode: "5080",
    cashCode: "1010",
    bankCode: "1020",
    receivablesCode: "1030",
    payablesCode: "2010",
    vatPayableCode: "2020",
    vatReceivableCode: "1040",
    vatCode: "5090",
    equityCode: "3010",
    postInventory: true,
    postCogs: true,
    openingBalancesCode: "1000",
  },
  defaultPaymentMethods: [
    {
      key: "cash",
      label: "نقدي",
      enabled: true,
      accountCode: "1010",
      isIntermediary: false,
    },
    {
      key: "card",
      label: "بطاقة",
      enabled: true,
      accountCode: "1020",
      isIntermediary: true,
      intermediaryAccountCode: "1020",
    },
    {
      key: "transfer",
      label: "تحويل",
      enabled: true,
      accountCode: "1020",
      isIntermediary: true,
      intermediaryAccountCode: "1020",
    },
    {
      key: "online",
      label: "أونلاين",
      enabled: true,
      accountCode: "1020",
      isIntermediary: true,
      intermediaryAccountCode: "1020",
    },
    {
      key: "credit",
      label: "آجل",
      enabled: true,
      accountCode: "1030",
      isIntermediary: false,
    },
  ],
};

// ─── UAE Standard COA Template ───
export const UAE_STANDARD_COA: COATemplate = {
  id: "uae-standard",
  name: "المخطط المحاسبي المعياري الإماراتي",
  nameAr: "المخطط المحاسبي المعياري الإماراتي",
  country: "الإمارات",
  currency: "درهم إماراتي (AED)",
  taxSystem: "vat",
  vatRate: 5,
  accounts: [
    {
      code: "1010",
      name: "الصندوق",
      type: "asset",
      category: "الأصول المتداولة",
      description: "صندوق النقدية",
    },
    {
      code: "1020",
      name: "الحسابات البنكية",
      type: "asset",
      category: "الأصول المتداولة",
      description: "الحسابات البنكية",
    },
    {
      code: "1030",
      name: "العملاء",
      type: "asset",
      category: "الأصول المتداولة",
      description: "ذمم العملاء",
    },
    {
      code: "1040",
      name: "الضريبة المستحقة القبض",
      type: "asset",
      category: "الأصول المتداولة",
      description: "ضريبة القيمة المضافة المستحقة القبض",
    },
    {
      code: "1050",
      name: "المتطلبات",
      type: "asset",
      category: "الأصول المتداولة",
      description: "المتطلبات",
    },
    {
      code: "1060",
      name: "المخزون",
      type: "asset",
      category: "الأصول المتداولة",
      description: "مخزون البضائع",
    },
    {
      code: "2010",
      name: "الموردون",
      type: "liability",
      category: "الخصوم المتداولة",
      description: "ذمم الموردين",
    },
    {
      code: "2020",
      name: "الضريبة المستحقة الدفع",
      type: "liability",
      category: "الخصوم المتداولة",
      description: "ضريبة القيمة المضافة المستحقة الدفع",
    },
    {
      code: "3010",
      name: "رأس المال",
      type: "equity",
      category: "حقوق الملكية",
      description: "رأس المال",
    },
    {
      code: "4010",
      name: "إيرادات الخدمات",
      type: "revenue",
      category: "الإيرادات التشغيلية",
      description: "إيرادات الخدمات",
    },
    {
      code: "4011",
      name: "إيرادات البيع",
      type: "revenue",
      category: "الإيرادات التشغيلية",
      description: "إيرادات البيع",
    },
    {
      code: "5010",
      name: "الرواتب",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "الرواتب",
    },
    {
      code: "5020",
      name: "الإيجار والخدمات",
      type: "expense",
      category: "المصروفات التشغيلية",
      description: "الإيجار والخدمات",
    },
    {
      code: "5050",
      name: "تكلفة البيع",
      type: "expense",
      category: "تكلفة المبيعات",
      description: "تكلفة البضاعة",
    },
    {
      code: "5080",
      name: "مصروفات متنوعة",
      type: "expense",
      category: "المصروفات الإدارية",
      description: "مصروفات عامة",
    },
  ],
  defaultPostingRules: {
    goodsRevenueCode: "4011",
    serviceRevenueCode: "4010",
    otherRevenueCode: "4020",
    discountRevenueCode: "1090",
    cogsCode: "5050",
    inventoryCode: "1060",
    discountCode: "1090",
    payrollCode: "5010",
    rentCode: "5020",
    governmentFeesCode: "5030",
    miscellaneousExpenseCode: "5080",
    cashCode: "1010",
    bankCode: "1020",
    receivablesCode: "1030",
    payablesCode: "2010",
    vatPayableCode: "2020",
    vatReceivableCode: "1040",
    vatCode: "5090",
    equityCode: "3010",
    postInventory: true,
    postCogs: true,
    openingBalancesCode: "1000",
  },
  defaultPaymentMethods: [
    {
      key: "cash",
      label: "نقدي",
      enabled: true,
      accountCode: "1010",
      isIntermediary: false,
    },
    {
      key: "card",
      label: "بطاقة",
      enabled: true,
      accountCode: "1020",
      isIntermediary: true,
      intermediaryAccountCode: "1020",
    },
    {
      key: "transfer",
      label: "تحويل",
      enabled: true,
      accountCode: "1020",
      isIntermediary: true,
      intermediaryAccountCode: "1020",
    },
    {
      key: "credit",
      label: "آجل",
      enabled: true,
      accountCode: "1030",
      isIntermediary: false,
    },
  ],
};

// ─── Template registry ───
export const COA_TEMPLATES: Record<string, COATemplate> = {
  "yemen-standard": YEMEN_STANDARD_COA,
  "saudi-standard": SAUDI_STANDARD_COA,
  "uae-standard": UAE_STANDARD_COA,
};

export function getCOATemplate(
  templateId?: string,
  country?: string
): COATemplate {
  if (templateId && COA_TEMPLATES[templateId]) return COA_TEMPLATES[templateId];
  if (country) {
    const normalized = country.trim().toLowerCase();
    if (normalized.includes("السعودية") || normalized.includes("SA"))
      return SAUDI_STANDARD_COA;
    if (normalized.includes("الإمارات") || normalized.includes("AE"))
      return UAE_STANDARD_COA;
    return YEMEN_STANDARD_COA;
  }
  return YEMEN_STANDARD_COA;
}

export function getTemplateByCode(code: string): COAAccount | undefined {
  for (const template of Object.values(COA_TEMPLATES)) {
    const account = template.accounts.find(a => a.code === code);
    if (account) return account;
  }
  return undefined;
}
