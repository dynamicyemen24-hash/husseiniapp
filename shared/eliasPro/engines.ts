/**
 * Elias Pro — engine catalog.
 * ============================================================
 * Single source of truth for every maintenance engine the platform can drive.
 *
 * The catalog is DECLARATIVE: the platform never hard-codes engine logic, it
 * only declares what exists, how risky it is, and how to reach it. The node
 * agent (`server/eliasPro/adapters/httpAgentAdapter`) maps `agentRoute` onto the
 * EliasPro REST surface; engines without a dedicated route are invoked through
 * the generic runner (`POST /api/v1/engine/:id/run`).
 *
 * Engine codes mirror `EliasPro/Scripts/Engines/<CODE>-Engine.ps1`.
 */
import type { EliasEngineDescriptor } from "./types";

export const ELIAS_ENGINE_CATALOG: readonly EliasEngineDescriptor[] = [
  // ── Hardware ────────────────────────────────────────────────────
  {
    id: "hdr",
    code: "HDR",
    labelAr: "التشخيص العميق",
    labelEn: "Deep Hardware Diagnostics",
    category: "hardware",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: "/api/v1/shop/diagnostics",
    descriptionAr:
      "مسح كامل للمعدن: المعالج والذاكرة والتخزين والحرارة والبطارية.",
  },
  {
    id: "batt",
    code: "BATT",
    labelAr: "تشخيص البطارية",
    labelEn: "Battery Diagnostics",
    category: "hardware",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: "/api/v1/device/battery",
    descriptionAr:
      "قراءة تقرير powercfg الحقيقي: السعة التصميمية، دورات الشحن، الحرارة.",
  },
  {
    id: "storage",
    code: "STORAGE",
    labelAr: "فحص التخزين",
    labelEn: "Storage Inspection",
    category: "hardware",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: "/api/v1/device/storage",
    descriptionAr:
      "قراءة SMART: تآكل القرص، أخطاء القراءة والكتابة، делеت SMART.",
  },
  {
    id: "stress",
    code: "STRESS",
    labelAr: "اختبار الإجهاد",
    labelEn: "Stress Benchmark",
    category: "hardware",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "ضغط المعالج والذاكرة لمدة محددة لكشف الثبات الحراري.",
  },
  {
    id: "hwd",
    code: "HWD",
    labelAr: "أجهزة العتاد",
    labelEn: "Hardware Suite",
    category: "hardware",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "سلسلة اختبارات عتاد: SMART، الذاكرة، PCIe، 수준 التسرب.",
  },
  {
    id: "recovery",
    code: "RECOVERY",
    labelAr: "استعادة الملفات",
    labelEn: "File Recovery",
    category: "hardware",
    risk: "high",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr:
      "فحص الأقراص واستعادة الملفات التالفة — عملية عالية الخطورة.",
  },

  // ── Network ────────────────────────────────────────────────────
  {
    id: "netdiag",
    code: "NETDIAG",
    labelAr: "تشخيص الشبكة",
    labelEn: "Network Diagnostics",
    category: "network",
    risk: "read",
    requiresAgent: true,
    portable: true,
    agentRoute: null,
    descriptionAr:
      "ping وmtr وتتبع المسار وتحليل زمن الاستجابة — قابل للقياس من المتصفح أيضاً.",
  },
  {
    id: "net",
    code: "NET",
    labelAr: "ضبط الشبكة",
    labelEn: "Network Tuning",
    category: "network",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "تحسين TCP وضبط بروتوكولات الشبكة وفق ملف المعيار.",
  },
  {
    id: "dax",
    code: "DAX",
    labelAr: "التحليل التشخيصي",
    labelEn: "Diagnostic Analytics",
    category: "network",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr:
      "تحليل إحصائي وبايزي للسلوك التشخيصي مع خط أساس وتحديث تلقائي.",
  },
  {
    id: "ivt",
    code: "IVT",
    labelAr: "استكشاف الشبكة",
    labelEn: "Network Discovery",
    category: "network",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "اكتشاف الأجهزة والعلاقات بينها عبر عدة طرق مسح.",
  },
  {
    id: "heal",
    code: "HEAL",
    labelAr: "العلاج الذكي",
    labelEn: "Self-Healing",
    category: "system",
    risk: "low",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr:
      "إصلاح ذاتي للانحرافات عبر مستويات أمان متدرجة (AUTO/Balanced).",
  },

  // ── System ──────────────────────────────────────────────────────
  {
    id: "sce",
    code: "SCE",
    labelAr: "التنظيف الآمن",
    labelEn: "Safe Cleanup",
    category: "system",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: "/api/v1/clean",
    descriptionAr:
      "تنظيف بقائمة سماح لا يحذف ملفات النظام — يدعم المعاينة قبل التنفيذ.",
  },
  {
    id: "oce",
    code: "OCE",
    labelAr: "محسّن التشغيل",
    labelEn: "Operations Optimizer",
    category: "system",
    risk: "low",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr:
      "تحسين جدولة العمليات واستهلاك الموارد وفق استراتيجية باريتو.",
  },
  {
    id: "error",
    code: "ERROR",
    labelAr: "مراقبة الأخطاء",
    labelEn: "Error Intelligence",
    category: "system",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "تجميع الأخطاء وتصنيفها وبناء أنماط التكرار.",
  },
  {
    id: "security",
    code: "SECURITY",
    labelAr: "إطار الأمن",
    labelEn: "Security Framework",
    category: "system",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "تقييم Security-Framework المؤسسي: سياسات، تشفير، تدقيق.",
  },

  // ── Shop ────────────────────────────────────────────────────────
  {
    id: "repair",
    code: "REPAIR",
    labelAr: "إدارة أوامر الصيانة",
    labelEn: "Repair Orders",
    category: "shop",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: "/api/v1/shop/tickets",
    descriptionAr: "تذاكر الصيانة من الاستلام حتى التسليم مع سجل حالة كامل.",
  },
  {
    id: "crm",
    code: "CRM",
    labelAr: "إدارة العملاء",
    labelEn: "Customer Records",
    category: "shop",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: "/api/v1/shop/customers",
    descriptionAr:
      "بطاقات العملاء: سجل الزيارات، الولاء، الرصيد، القائمة السوداء.",
  },
  {
    id: "parts",
    code: "PARTS",
    labelAr: "قطع الغيار",
    labelEn: "Parts Inventory",
    category: "shop",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: "/api/v1/shop/inventory",
    descriptionAr: "مخزون القطع بباركود EAN13 مع تنبيه إعادة الطلب.",
  },
  {
    id: "pos",
    code: "POS",
    labelAr: "فوترة الصيانة",
    labelEn: "Service Billing",
    category: "shop",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "فواتير خدمة الصيانة وربطها بأوامر الصيانة.",
  },

  // ── Enterprise ──────────────────────────────────────────────────
  {
    id: "ast",
    code: "AST",
    labelAr: "الأصول المؤسسية",
    labelEn: "Asset Registry",
    category: "enterprise",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "سجل الأصول مع الاهلاك والتقارير المالية وربط CMDB.",
  },
  {
    id: "mdm",
    code: "MDM",
    labelAr: "إدارة أجهزة الموبايل",
    labelEn: "Mobile Device Management",
    category: "enterprise",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "تسجيل الأجهزة الط móveis وقياس الامتثال وربط Intune.",
  },
  {
    id: "iot",
    code: "IOT",
    labelAr: "إنترنت الأشياء",
    labelEn: "IoT Fleet",
    category: "enterprise",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "اكتشاف أجهزة IoT عبر البروتوكولات والتحقق من الشهادات.",
  },
  {
    id: "fw",
    code: "FW",
    labelAr: "إدارة الفيرموير",
    labelEn: "Firmware Management",
    category: "enterprise",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "مسح ثغرات الفيرموير ونشر التحديثات مع التراجع عند الفشل.",
  },
  {
    id: "dr",
    code: "DR",
    labelAr: "النسخ والتعافي",
    labelEn: "Disaster Recovery",
    category: "enterprise",
    risk: "high",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "مجموعات الحماية وRPO/RTO واختبار التعافي.",
  },
  {
    id: "cicd",
    code: "CICD",
    labelAr: "خط الإصدار",
    labelEn: "Release Pipeline",
    category: "enterprise",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "مراحل النشر وتوليد SBOM والتوقيع الرقمي للمنتجات.",
  },
  {
    id: "deploy",
    code: "DEPLOY",
    labelAr: "النشر والإصدارات",
    labelEn: "Deployment",
    category: "enterprise",
    risk: "high",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "نشر استراتيجيات Canary وBlueGreen مع تراجع فوري عند الفشل.",
  },
  {
    id: "rpt",
    code: "RPT",
    labelAr: "مولّد التقارير",
    labelEn: "Report Factory",
    category: "enterprise",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "تقارير آلية بصيغ متعددة مع تسليم بالبريد أو Webhook.",
  },
  {
    id: "str",
    code: "STR",
    labelAr: "منصة البث",
    labelEn: "Streaming Platform",
    category: "enterprise",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "طبقات بث WebSocket/SSE/gRPC/MQTT ومقاييس حية.",
  },
  {
    id: "xpl",
    code: "XPL",
    labelAr: "نظام الإضافات",
    labelEn: "Extension Runtime",
    category: "enterprise",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "تشغيل إضافات المنظومة في بيئة معزولة.",
  },

  // ── AI ──────────────────────────────────────────────────────────
  {
    id: "ai-premium",
    code: "AI-PREMIUM",
    labelAr: "المحرك الذكي",
    labelEn: "Premium Intelligence",
    category: "ai",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "عزل أنماط الشذوذ والتنبؤ الزمني من بيانات القياس.",
  },
  {
    id: "ml",
    code: "ML",
    labelAr: "التعلم الآلي",
    labelEn: "Machine Learning",
    category: "ai",
    risk: "medium",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "تدريب نماذج التنبؤ بحدود الشذوذ وضبط المعاملات.",
  },
  {
    id: "predict",
    code: "PREDICT",
    labelAr: "التنبؤ بالأعطال",
    labelEn: "Failure Prediction",
    category: "ai",
    risk: "read",
    requiresAgent: true,
    portable: false,
    agentRoute: null,
    descriptionAr: "تنبؤ ARIMA/LSTM بالفشل المتوقع مع فاصل ثقة.",
  },

  // ── Platform-native portable engine ────────────────────────────
  {
    id: "probe",
    code: "PROBE",
    labelAr: "استكشاف الجهاز",
    labelEn: "Device Self-Probe",
    category: "hardware",
    risk: "read",
    requiresAgent: false,
    portable: true,
    agentRoute: null,
    descriptionAr:
      "محرك محمول يعمل داخل المتصفح: يستكشف الجهاز الحالي عبر واجهات المعيار دون تثبيت.",
  },
] as const;

const ENGINE_INDEX = new Map(ELIAS_ENGINE_CATALOG.map(e => [e.id, e]));
const ENGINE_BY_CODE = new Map(ELIAS_ENGINE_CATALOG.map(e => [e.code, e]));

export function getEliasEngine(id: string): EliasEngineDescriptor | undefined {
  return ENGINE_INDEX.get(id);
}

export function getEliasEngineByCode(
  code: string
): EliasEngineDescriptor | undefined {
  return ENGINE_BY_CODE.get(code.toUpperCase());
}

export function listEliasEngines(
  category?: EliasEngineDescriptor["category"]
): EliasEngineDescriptor[] {
  if (!category) return [...ELIAS_ENGINE_CATALOG];
  return ELIAS_ENGINE_CATALOG.filter(e => e.category === category);
}

/** Engines that can run without a Windows node agent. */
export function listPortableEngines(): EliasEngineDescriptor[] {
  return ELIAS_ENGINE_CATALOG.filter(e => e.portable);
}

/** Engines whose dedicated REST route exists on the node agent. */
export function listRoutedEngines(): EliasEngineDescriptor[] {
  return ELIAS_ENGINE_CATALOG.filter(e => e.agentRoute !== null);
}
