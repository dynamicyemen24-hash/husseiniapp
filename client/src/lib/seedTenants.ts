/**
 * seedTenants — Corrected Multi-Tenant Seeding for Dr. Saddam Hussein Pharmacy & Al-Hussein Library (6 specific users: هايِل, محمد, عماد, عبدالجبار, عبدالرزاق, أدمن).
 */

export interface TenantUserAccount {
  name: string;
  email: string;
  role: string;
  tempToken: string;
}

export interface TenantClientAccount {
  clientName: string;
  tenantCode: string;
  branch: string;
  users: TenantUserAccount[];
  directLoginUrl: string;
}

export function provisionTestTenants(): TenantClientAccount[] {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://alhusainiaye.vercel.app";

  return [
    {
      clientName: "صيدلية الدكتور صدام حسين",
      tenantCode: "SADDAM-PHARMA-01",
      branch: "الفرع الرئيسي - العاصمة",
      users: [
        {
          name: "د. صدام حسين (المدير العام والمالك)",
          email: "dr.saddam@pharma-husseiniya.com",
          role: "Executive Owner (مدير عام)",
          tempToken: "tok_saddam_owner_001",
        },
        {
          name: "مسؤول النظام (Admin)",
          email: "admin@pharma-husseiniya.com",
          role: "System Administrator (مسؤول النظام)",
          tempToken: "tok_saddam_admin_002",
        },
      ],
      directLoginUrl: `${baseUrl}/app?tenant=SADDAM-PHARMA-01&token=tok_saddam_owner_001`,
    },
    {
      clientName: "مكتبة الحسينية (المستخدمون الستة)",
      tenantCode: "HUSSEIN-LIB-01",
      branch: "المركز الرئيسي والخدمات الطلابية",
      users: [
        {
          name: "هايل (Hayel)",
          email: "hayel@hussein-library.com",
          role: "Senior Accountant (محاسب أول)",
          tempToken: "tok_lib_hayel_102",
        },
        {
          name: "محمد (Mohammed)",
          email: "mohammed@hussein-library.com",
          role: "Warehouse Keeper (أمين المستودع)",
          tempToken: "tok_lib_mohammed_103",
        },
        {
          name: "عماد (Emad)",
          email: "emad@hussein-library.com",
          role: "POS Sales Agent (مسؤول مبيعات)",
          tempToken: "tok_lib_emad_104",
        },
        {
          name: "عبدالجبار (Abduljabar)",
          email: "abduljabar@hussein-library.com",
          role: "Auditor (مراجع داخلي)",
          tempToken: "tok_lib_abduljabar_105",
        },
        {
          name: "عبدالرزاق (Abdulrazzaq)",
          email: "abdulrazzaq@hussein-library.com",
          role: "Administrator (إداري)",
          tempToken: "tok_lib_abdulrazzaq_106",
        },
        {
          name: "أدمن (Admin)",
          email: "admin@hussein-library.com",
          role: "System Administrator (مسؤول النظام)",
          tempToken: "tok_lib_admin_107",
        },
      ],
      directLoginUrl: `${baseUrl}/app?tenant=HUSSEIN-LIB-01&token=tok_lib_admin_107`,
    },
  ];
}
