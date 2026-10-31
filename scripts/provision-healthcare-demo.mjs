/**
 * Healthcare Demo Tenant Provisioning Script
 * ===========================================
 * Provisions Husseiniya Healthcare Platform with:
 * - Tenant, Branch, Settings
 * - ICD-10 Medical Codes
 * - Healthcare Facilities (departments, clinics, labs, etc.)
 * - Healthcare Providers (doctors, specialists, nurses)
 * - Patients with medical history
 * - Demo user for testing
 *
 * Usage: node scripts/provision-healthcare-demo.mjs
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import * as schema from "../drizzle/schema.js";
import {
  HEALTHCARE_TENANT_CODE,
  HEALTHCARE_TENANT_NAME,
  HEALTHCARE_TENANT_CURRENCY,
} from "../server/seed/healthcareTenantData.js";
import { icd10Codes } from "../server/seed/icd10Codes.js";
import { healthcareFacilities } from "../server/seed/healthcareFacilities.js";
import { healthcareProviders } from "../server/seed/healthcareProviders.js";
import { healthcarePatients } from "../server/seed/healthcarePatients.js";

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const scryptAsync = promisify(scrypt);
const PREFIX = "scrypt$";

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${PREFIX}${salt}$${derived.toString("hex")}`;
}

// ─── Healthcare Chart of Accounts ──────────────────────────────────────────────
const healthcareAccounts = [
  // Assets
  {
    code: "1100",
    name: "النقدية",
    nameAr: "Cash",
    type: "asset",
    parentCode: null,
  },
  {
    code: "1110",
    name: "البنك",
    nameAr: "Bank",
    type: "asset",
    parentCode: "1100",
  },
  {
    code: "1120",
    name: "صندوق الطوارئ الطبية",
    nameAr: "Medical Emergency Fund",
    type: "asset",
    parentCode: "1100",
  },
  {
    code: "1200",
    name: "حسابات المدينة",
    nameAr: "Accounts Receivable",
    type: "asset",
    parentCode: null,
  },
  {
    code: "1210",
    name: "مستحقات المرضى",
    nameAr: "Patient Receivables",
    type: "asset",
    parentCode: "1200",
  },
  {
    code: "1220",
    name: "التأمين الصحي المستحق",
    nameAr: "Health Insurance Receivable",
    type: "asset",
    parentCode: "1200",
  },
  {
    code: "1300",
    name: "المخزون الطبي",
    nameAr: "Medical Inventory",
    type: "asset",
    parentCode: null,
  },
  {
    code: "1310",
    name: "الأدوية والمستهلكات",
    nameAr: "Medications & Consumables",
    type: "asset",
    parentCode: "1300",
  },
  {
    code: "1320",
    name: "المعدات الطبية",
    nameAr: "Medical Equipment",
    type: "asset",
    parentCode: "1300",
  },
  {
    code: "1400",
    name: "أصول ثابتة",
    nameAr: "Fixed Assets",
    type: "asset",
    parentCode: null,
  },
  {
    code: "1410",
    name: "معدات طبية ثابتة",
    nameAr: "Fixed Medical Equipment",
    type: "asset",
    parentCode: "1400",
  },
  // Liabilities
  {
    code: "2100",
    name: "حسابات الدائنة",
    nameAr: "Accounts Payable",
    type: "liability",
    parentCode: null,
  },
  {
    code: "2110",
    name: "مستحقات الموردين",
    nameAr: "Supplier Payables",
    type: "liability",
    parentCode: "2100",
  },
  {
    code: "2120",
    name: "رواتب مستحقة",
    nameAr: "Accrued Salaries",
    type: "liability",
    parentCode: "2100",
  },
  {
    code: "2200",
    name: "ضرائب مستحقة",
    nameAr: "Taxes Payable",
    type: "liability",
    parentCode: null,
  },
  {
    code: "2300",
    name: "قروض طويلة الأجل",
    nameAr: "Long-term Loans",
    type: "liability",
    parentCode: null,
  },
  // Equity
  {
    code: "3100",
    name: "رأس المال",
    nameAr: "Capital",
    type: "equity",
    parentCode: null,
  },
  {
    code: "3200",
    name: "الأرباح المحتجزة",
    nameAr: "Retained Earnings",
    type: "equity",
    parentCode: null,
  },
  {
    code: "3300",
    name: "احتياطيات طبية",
    nameAr: "Medical Reserves",
    type: "equity",
    parentCode: null,
  },
  // Revenue
  {
    code: "4100",
    name: "إيرادات الخدمات الطبية",
    nameAr: "Medical Services Revenue",
    type: "revenue",
    parentCode: null,
  },
  {
    code: "4110",
    name: "إيرادات العيادات",
    nameAr: "Clinic Revenue",
    type: "revenue",
    parentCode: "4100",
  },
  {
    code: "4120",
    name: "إيرادات الطوارئ",
    nameAr: "Emergency Revenue",
    type: "revenue",
    parentCode: "4100",
  },
  {
    code: "4130",
    name: "إيرادات العمليات",
    nameAr: "Surgery Revenue",
    type: "revenue",
    parentCode: "4100",
  },
  {
    code: "4140",
    name: "إيرادات المختبر",
    nameAr: "Lab Revenue",
    type: "revenue",
    parentCode: "4100",
  },
  {
    code: "4150",
    name: "إيرادات الأشعة",
    nameAr: "Radiology Revenue",
    type: "revenue",
    parentCode: "4100",
  },
  {
    code: "4160",
    name: "إيرادات الصيدلية",
    nameAr: "Pharmacy Revenue",
    type: "revenue",
    parentCode: "4100",
  },
  {
    code: "4200",
    name: "إيرادات التأمين الصحي",
    nameAr: "Health Insurance Revenue",
    type: "revenue",
    parentCode: null,
  },
  // Expenses
  {
    code: "5100",
    name: "تكاليف الموظفين",
    nameAr: "Personnel Costs",
    type: "expense",
    parentCode: null,
  },
  {
    code: "5110",
    name: "رواتب الأطباء",
    nameAr: "Doctors Salaries",
    type: "expense",
    parentCode: "5100",
  },
  {
    code: "5120",
    name: "رواتب التمريض",
    nameAr: "Nurses Salaries",
    type: "expense",
    parentCode: "5100",
  },
  {
    code: "5130",
    name: "رواتب الموظفين",
    nameAr: "Staff Salaries",
    type: "expense",
    parentCode: "5100",
  },
  {
    code: "5200",
    name: "تكلفة الأدوية والمستهلكات",
    nameAr: "Medications & Supplies Cost",
    type: "expense",
    parentCode: null,
  },
  {
    code: "5300",
    name: "مصاريف تشغيلية",
    nameAr: "Operating Expenses",
    type: "expense",
    parentCode: null,
  },
  {
    code: "5310",
    name: "الكهرباء والمياه",
    nameAr: "Utilities",
    type: "expense",
    parentCode: "5300",
  },
  {
    code: "5320",
    name: "الصيانة",
    nameAr: "Maintenance",
    type: "expense",
    parentCode: "5300",
  },
  {
    code: "5330",
    name: "التأمين الطبي",
    nameAr: "Medical Insurance",
    type: "expense",
    parentCode: "5300",
  },
  {
    code: "5400",
    name: "مصاريف إدارية",
    nameAr: "Administrative Expenses",
    type: "expense",
    parentCode: null,
  },
];

async function provisionHealthcareDemo() {
  console.log("🏥 Provisioning Healthcare Demo Tenant...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ─── 1) Create Tenant ──────────────────────────────────────────────────────
  let tenantRow = (
    await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.code, HEALTHCARE_TENANT_CODE))
      .limit(1)
  )[0];
  let alreadyProvisioned = !!tenantRow;

  if (!tenantRow) {
    const [created] = await db
      .insert(schema.tenants)
      .values({
        name: HEALTHCARE_TENANT_NAME,
        code: HEALTHCARE_TENANT_CODE,
        currency: HEALTHCARE_TENANT_CURRENCY,
        country: "اليمن",
        subscriptionPlan: "enterprise",
      })
      .returning();
    tenantRow = created;
    console.log("✅ Created tenant:", tenantRow.name, `(id: ${tenantRow.id})`);
  } else {
    console.log(
      "ℹ️  Tenant already exists:",
      tenantRow.name,
      `(id: ${tenantRow.id})`
    );
  }
  const tid = tenantRow.id;

  // ─── 2) Create Branch ───────────────────────────────────────────────────────
  let branch = (
    await db
      .select()
      .from(schema.branches)
      .where(eq(schema.branches.tenantId, tid))
      .limit(1)
  )[0];

  if (!branch) {
    [branch] = await db
      .insert(schema.branches)
      .values({
        tenantId: tid,
        name: "المجمع الطبي الرئيسي - الحسينية",
        code: "HOSP-MAIN",
        city: "صنعاء",
        address: "شارع حدادة، حي60",
        isMain: true,
      })
      .returning();
    console.log("✅ Created main branch:", branch.name);
  } else {
    console.log("ℹ️  Branch already exists:", branch.name);
  }
  const bid = branch.id;

  // ─── 3) Create Settings ────────────────────────────────────────────────────
  const existingSettings = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.tenantId, tid))
    .limit(1);

  if (existingSettings.length === 0) {
    await db.insert(schema.settings).values({
      tenantId: tid,
      institutionName: HEALTHCARE_TENANT_NAME,
      currency: "ريال يمني (YER)",
      accountingPeriod: "2026",
      managerName: "إدارة المجمع الطبي",
    });
    console.log("✅ Created settings");
  } else {
    console.log("ℹ️  Settings already exist");
  }

  // ─── 4) Create Chart of Accounts ──────────────────────────────────────────
  const acctCount = await db.$count(
    schema.accounts,
    eq(schema.accounts.tenantId, tid)
  );
  if (acctCount === 0) {
    const inserted = await db
      .insert(schema.accounts)
      .values(
        healthcareAccounts.map(a => ({
          tenantId: tid,
          code: a.code,
          name: a.name,
          nameAr: a.nameAr,
          type: a.type,
          isActive: true,
          isCustom: false,
          parentAccountId: null,
        }))
      )
      .returning({ id: schema.accounts.id, code: schema.accounts.code });

    const codeToId = new Map(inserted.map(r => [r.code, r.id]));

    // Set parent relationships
    for (const a of healthcareAccounts) {
      if (a.parentCode && codeToId.has(a.parentCode)) {
        await db
          .update(schema.accounts)
          .set({ parentAccountId: codeToId.get(a.parentCode) })
          .where(
            and(
              eq(schema.accounts.tenantId, tid),
              eq(schema.accounts.code, a.code)
            )
          );
      }
    }
    console.log("✅ Seeded chart of accounts:", inserted.length, "accounts");
  } else {
    console.log("ℹ️  Chart of accounts already exists:", acctCount, "accounts");
  }

  // ─── 5) Create ICD-10 Codes ────────────────────────────────────────────────
  const icdCount = await db.$count(
    schema.icdCodes,
    eq(schema.icdCodes.tenantId, tid)
  );
  if (icdCount === 0) {
    const icdValues = icd10Codes.map(c => ({
      tenantId: tid,
      code: c.code,
      system: "ICD10",
      description: c.description,
      descriptionAr: c.descriptionAr,
      category: c.category,
      subCategory: c.subCategory || null,
    }));

    await db.insert(schema.icdCodes).values(icdValues);
    console.log("✅ Seeded ICD-10 codes:", icd10Codes.length, "codes");
  } else {
    console.log("ℹ️  ICD-10 codes already exist:", icdCount, "codes");
  }

  // ─── 6) Create Healthcare Facilities ───────────────────────────────────────
  const facCount = await db.$count(
    schema.healthcareFacilities,
    eq(schema.healthcareFacilities.tenantId, tid)
  );
  if (facCount === 0) {
    const facValues = healthcareFacilities.map(f => ({
      tenantId: tid,
      branchId: bid,
      code: f.code,
      name: f.name,
      nameAr: f.nameAr,
      type: f.type,
      specialty: f.specialty || null,
      department: f.department || null,
      floor: f.floor || null,
      building: f.building || null,
      acceptsInsurance: f.acceptsInsurance,
      insuranceProviders: f.insuranceProviders || [],
      operatingHours: f.operatingHours || {},
      contactPhone: f.contactPhone || null,
      contactEmail: f.contactEmail || null,
      notes: f.notes || null,
    }));

    await db.insert(schema.healthcareFacilities).values(facValues);
    console.log(
      "✅ Seeded healthcare facilities:",
      healthcareFacilities.length,
      "facilities"
    );
  } else {
    console.log(
      "ℹ️  Healthcare facilities already exist:",
      facCount,
      "facilities"
    );
  }

  // ─── 7) Create Healthcare Providers ───────────────────────────────────────
  const provCount = await db.$count(
    schema.healthcareProviders,
    eq(schema.healthcareProviders.tenantId, tid)
  );
  if (provCount === 0) {
    // First, get facility IDs for mapping
    const facilities = await db
      .select({
        id: schema.healthcareFacilities.id,
        code: schema.healthcareFacilities.code,
      })
      .from(schema.healthcareFacilities)
      .where(eq(schema.healthcareFacilities.tenantId, tid));
    const facilityCodeToId = new Map(facilities.map(f => [f.code, f.id]));

    const provValues = healthcareProviders.map(p => ({
      tenantId: tid,
      facilityId: facilityCodeToId.get(p.facilityCode) || null,
      licenseNumber: p.licenseNumber,
      specialization: p.specialization,
      title: p.title || null,
      qualifications: p.qualifications || [],
      yearsExperience: p.yearsExperience || null,
      consultationFee: p.consultationFee || null,
      followUpFee: p.followUpFee || null,
      scheduleTemplate: p.scheduleTemplate || {},
      isActive: true,
      isAcceptingPatients: true,
    }));

    await db.insert(schema.healthcareProviders).values(provValues);
    console.log(
      "✅ Seeded healthcare providers:",
      healthcareProviders.length,
      "providers"
    );
  } else {
    console.log(
      "ℹ️  Healthcare providers already exist:",
      provCount,
      "providers"
    );
  }

  // ─── 8) Create Patients ────────────────────────────────────────────────────
  const patCount = await db.$count(
    schema.patients,
    eq(schema.patients.tenantId, tid)
  );
  if (patCount === 0) {
    // Get provider IDs for mapping
    const providers = await db
      .select({
        id: schema.healthcareProviders.id,
        licenseNumber: schema.healthcareProviders.licenseNumber,
      })
      .from(schema.healthcareProviders)
      .where(eq(schema.healthcareProviders.tenantId, tid));
    const licenseToProviderId = new Map(
      providers.map(p => [p.licenseNumber, p.id])
    );

    // Get facility IDs
    const facilities = await db
      .select({
        id: schema.healthcareFacilities.id,
        code: schema.healthcareFacilities.code,
      })
      .from(schema.healthcareFacilities)
      .where(eq(schema.healthcareFacilities.tenantId, tid));
    const facilityCodeToId = new Map(facilities.map(f => [f.code, f.id]));

    const patValues = healthcarePatients.map(p => {
      // Find a random provider for primary provider
      const providerIds = Array.from(licenseToProviderId.values());
      const randomProviderId =
        providerIds.length > 0
          ? providerIds[Math.floor(Math.random() * providerIds.length)]
          : null;

      return {
        tenantId: tid,
        patientNumber: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`,
        localFirstName: p.localFirstName || null,
        localLastName: p.localLastName || null,
        gender: p.gender,
        dateOfBirth: new Date(p.dateOfBirth),
        age: p.age || null,
        bloodType: p.bloodType || null,
        nationality: p.nationality || "اليمني",
        nationalId: p.nationalId || null,
        passportNumber: p.passportNumber || null,
        maritalStatus: p.maritalStatus || null,
        occupation: p.occupation || null,
        email: p.email || null,
        phone: p.phone,
        mobile: p.mobile || null,
        address: p.address || null,
        city: p.city || null,
        region: p.region || null,
        country: p.country || "اليمن",
        emergencyContactName: p.emergencyContactName || null,
        emergencyContactPhone: p.emergencyContactPhone || null,
        emergencyContactRelation: p.emergencyContactRelation || null,
        insuranceProvider: p.insuranceProvider || null,
        insurancePolicyNumber: p.insurancePolicyNumber || null,
        insuranceCardNumber: p.insuranceCardNumber || null,
        insuranceExpiry: p.insuranceExpiry ? new Date(p.insuranceExpiry) : null,
        coPaymentPercent: p.coPaymentPercent || null,
        primaryProviderId: randomProviderId,
        primaryFacilityId: null,
        allergies: p.allergies || [],
        chronicConditions: p.chronicConditions || [],
        medications: p.medications || [],
        familyHistory: p.familyHistory || null,
        notes: null,
        isActive: true,
        isVIP: p.isVIP || false,
        blacklist: false,
        blacklistReason: null,
      };
    });

    await db.insert(schema.patients).values(patValues);
    console.log("✅ Seeded patients:", healthcarePatients.length, "patients");
  } else {
    console.log("ℹ️  Patients already exist:", patCount, "patients");
  }

  // ─── 9) Create Demo User ───────────────────────────────────────────────────
  const demoUsername = "healthcare_admin";
  const existingUser = (
    await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, demoUsername))
      .limit(1)
  )[0];

  if (!existingUser) {
    const passwordHash = await hashPassword("Healthcare@2024");
    const [userRow] = await db
      .insert(schema.users)
      .values({
        openId: `local:${demoUsername}`,
        tenantId: tid,
        name: "د. أحمد محمد الحسيني",
        email: "healthcare@husseiniya-demo.com",
        loginMethod: "local",
        username: demoUsername,
        passwordHash,
        role: "owner",
        lastSignedIn: new Date(),
      })
      .returning();

    console.log(
      "✅ Created demo user:",
      userRow.username,
      `(id: ${userRow.id})`
    );

    await db
      .update(schema.tenants)
      .set({ ownerUserId: userRow.id })
      .where(eq(schema.tenants.id, tid));
  } else {
    console.log("ℹ️  Demo user already exists:", existingUser.username);
  }

  // ─── 10) Create POS Session ────────────────────────────────────────────────
  const posSessionCount = await db.$count(
    schema.posSessions,
    eq(schema.posSessions.tenantId, tid)
  );
  if (posSessionCount === 0) {
    const user = (
      await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, demoUsername))
        .limit(1)
    )[0];

    if (branch && user) {
      await db.insert(schema.posSessions).values({
        tenantId: tid,
        branchId: bid,
        openedById: user.id,
        status: "open",
        openedAt: new Date(),
        openingFloat: "0",
      });
      console.log("✅ Created POS session");
    }
  } else {
    console.log("ℹ️  POS session already exists");
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "━".repeat(50));
  console.log("🎉 Healthcare Demo Tenant Provisioned Successfully!");
  console.log("━".repeat(50));
  console.log("Tenant:", HEALTHCARE_TENANT_NAME);
  console.log("Code:", HEALTHCARE_TENANT_CODE);
  console.log("Currency:", HEALTHCARE_TENANT_CURRENCY);
  console.log("━".repeat(50));
  console.log("Demo Login: healthcare_admin / Healthcare@2024");
  console.log("━".repeat(50));
  console.log("\nData Seeded:");
  console.log("  • ICD-10 Codes:", icd10Codes.length);
  console.log("  • Healthcare Facilities:", healthcareFacilities.length);
  console.log("  • Healthcare Providers:", healthcareProviders.length);
  console.log("  • Patients:", healthcarePatients.length);
  console.log("\n");
}

provisionHealthcareDemo()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Failed:", err);
    process.exit(1);
  });
