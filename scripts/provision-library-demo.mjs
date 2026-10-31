import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, or, ilike } from "drizzle-orm";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import * as schema from "../drizzle/schema.js";
import {
  libraryAccounts,
  libraryGoods,
  libraryServices,
  libraryInventoryValue,
  LIBRARY_TENANT_CODE,
  LIBRARY_TENANT_NAME,
} from "../server/seed/libraryTenantData.js";

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const scryptAsync = promisify(scrypt);
const PREFIX = "scrypt$";

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${PREFIX}${salt}$${derived.toString("hex")}`;
}

async function provisionLibraryDemo() {
  console.log("🚀 Provisioning Library Demo Tenant...");

  // 1) Check if tenant already exists
  let tenantRow = (
    await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.code, LIBRARY_TENANT_CODE))
      .limit(1)
  )[0];
  let alreadyProvisioned = false;

  if (!tenantRow) {
    const [created] = await db
      .insert(schema.tenants)
      .values({
        name: LIBRARY_TENANT_NAME,
        code: LIBRARY_TENANT_CODE,
        currency: "YER",
        country: "اليمن",
        subscriptionPlan: "standard",
      })
      .returning();
    tenantRow = created;
    console.log(
      "✅ Created tenant:",
      tenantRow.name,
      "(id:",
      tenantRow.id,
      ")"
    );
  } else {
    alreadyProvisioned = true;
    console.log(
      "ℹ️ Tenant already exists:",
      tenantRow.name,
      "(id:",
      tenantRow.id,
      ")"
    );
  }
  const tid = tenantRow.id;

  // 2) Branch (idempotent)
  const existingBranch = await db
    .select()
    .from(schema.branches)
    .where(eq(schema.branches.tenantId, tid))
    .limit(1);
  if (existingBranch.length === 0) {
    await db.insert(schema.branches).values({
      tenantId: tid,
      name: "الفرع الرئيسي — مكتبة الحسينية",
      code: "MAIN",
      city: "صنعاء",
      isMain: true,
    });
    console.log("✅ Created main branch");
  }

  // 3) Settings (idempotent)
  const existingSettings = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.tenantId, tid))
    .limit(1);
  if (existingSettings.length === 0) {
    await db.insert(schema.settings).values({
      tenantId: tid,
      institutionName: LIBRARY_TENANT_NAME,
      currency: "ريال يمني (YER)",
      accountingPeriod: "2026",
      managerName: "إدارة مكتبة الحسينية",
    });
    console.log("✅ Created settings");
  }

  // 4) Chart of accounts (idempotent by count)
  const acctCount = await db.$count(
    schema.accounts,
    eq(schema.accounts.tenantId, tid)
  );
  if (acctCount === 0) {
    const inserted = await db
      .insert(schema.accounts)
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
      .returning({ id: schema.accounts.id, code: schema.accounts.code });
    const codeToId = new Map(inserted.map(r => [r.code, r.id]));
    for (const a of libraryAccounts) {
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
  }

  // 5) Products (goods + services)
  const prodCount = await db.$count(
    schema.products,
    eq(schema.products.tenantId, tid)
  );
  if (prodCount === 0) {
    const all = [
      ...libraryGoods.map(g => ({
        tenantId: tid,
        code: g.code,
        name: g.name,
        type: "goods",
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
        type: "service",
        category: s.category,
        unit: s.unit,
        purchasePrice: s.purchasePrice,
        salePrice: s.salePrice,
        currentStock: 0,
        isActive: true,
        description: s.description || null,
      })),
    ];
    const inserted = await db.insert(schema.products).values(all).returning();
    console.log("✅ Seeded products:", inserted.length, "items");
  }

  // 6) Opening balances (inventory value)
  const openingCount = await db.$count(
    schema.openingBalances,
    and(
      eq(schema.openingBalances.tenantId, tid),
      eq(schema.openingBalances.periodName, "السنة المالية 2026")
    )
  );
  if (openingCount === 0 && libraryInventoryValue > 0) {
    const value = libraryInventoryValue.toFixed(2);

    let inventoryAccount = (
      await db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.tenantId, tid),
            eq(schema.accounts.type, "asset"),
            or(
              ilike(schema.accounts.name, "%مخزون%"),
              ilike(schema.accounts.name, "%بضاعة%"),
              ilike(schema.accounts.name, "%جرد%")
            )
          )
        )
        .limit(1)
    )[0];

    if (!inventoryAccount) {
      const firstAsset = (
        await db
          .select()
          .from(schema.accounts)
          .where(
            and(
              eq(schema.accounts.tenantId, tid),
              eq(schema.accounts.type, "asset")
            )
          )
          .limit(1)
      )[0];
      const [created] = await db
        .insert(schema.accounts)
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
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.tenantId, tid),
            eq(schema.accounts.type, "equity")
          )
        )
        .limit(1)
    )[0];
    if (!capitalAccount) {
      const [created] = await db
        .insert(schema.accounts)
        .values({
          tenantId: tid,
          code: "3000",
          name: "رأس المال",
          type: "equity",
          isActive: true,
          isCustom: true,
          parentAccountId: null,
        })
        .returning();
      capitalAccount = created;
    }

    await db.insert(schema.openingBalances).values([
      {
        tenantId: tid,
        accountId: inventoryAccount.id,
        periodName: "السنة المالية 2026",
        amount: value,
        type: "debit",
        currency: "YER",
        exchangeRate: "1.0000",
        baseAmount: value,
        notes: "رصيد افتتاحي للمخزون - مكتبة الحسينية",
      },
      {
        tenantId: tid,
        accountId: capitalAccount.id,
        periodName: "السنة المالية 2026",
        amount: value,
        type: "credit",
        currency: "YER",
        exchangeRate: "1.0000",
        baseAmount: value,
        notes: "رصيد افتتاحي لرأس المال - مكتبة الحسينية",
      },
    ]);
    console.log(
      "✅ Created opening balances: Inventory",
      value,
      "→ Capital",
      value
    );
  }

  // 7) Demo user
  const demoUsername = "library_owner";
  const existingUser = (
    await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, demoUsername))
      .limit(1)
  )[0];
  if (!existingUser) {
    const passwordHash = await hashPassword("Library@2024");
    const [userRow] = await db
      .insert(schema.users)
      .values({
        openId: `local:${demoUsername}`,
        tenantId: tid,
        name: "أ. أحمد الحسيني",
        email: "library@husseiniya-demo.com",
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
      "(id:",
      userRow.id,
      ")"
    );

    await db
      .update(schema.tenants)
      .set({ ownerUserId: userRow.id })
      .where(eq(schema.tenants.id, tid));
  } else {
    console.log("ℹ️ Demo user already exists:", existingUser.username);
  }

  // 8) POS session for demo
  const posSessionCount = await db.$count(
    schema.posSessions,
    eq(schema.posSessions.tenantId, tid)
  );
  if (posSessionCount === 0) {
    const branch = (
      await db
        .select()
        .from(schema.branches)
        .where(eq(schema.branches.tenantId, tid))
        .limit(1)
    )[0];
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
        branchId: branch.id,
        openedById: user.id,
        status: "open",
        openedAt: new Date(),
        openingFloat: "0",
      });
      console.log("✅ Created POS session");
    }
  }

  console.log("\n🎉 Library Demo Tenant Provisioned Successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Tenant:", LIBRARY_TENANT_NAME);
  console.log("Code:", LIBRARY_TENANT_CODE);
  console.log("Demo Login: library_owner / Library@2024");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

provisionLibraryDemo()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Failed:", err);
    process.exit(1);
  });
