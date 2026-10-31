import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, ilike } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function verify() {
  const tid = 2; // Library tenant

  // 1. Chart of accounts count
  const accts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.tenantId, tid));
  console.log("=== Chart of Accounts:", accts.length, "accounts ===");
  accts
    .slice(0, 20)
    .forEach(a => console.log(" ", a.code, a.name, "|", a.type));

  // 2. Products (goods + services)
  const prods = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.tenantId, tid));
  console.log("\n=== Products/Services:", prods.length, "items ===");
  const goods = prods.filter(p => p.type === "goods");
  const services = prods.filter(p => p.type === "service");
  console.log("Goods:", goods.length);
  console.log("Services:", services.length);
  services
    .slice(0, 20)
    .forEach(s =>
      console.log("  [Service]", s.code, s.name, s.category, s.salePrice)
    );
  goods
    .slice(0, 20)
    .forEach(g =>
      console.log("  [Good]", g.code, g.name, g.currentStock, g.salePrice)
    );

  // 3. Opening balances
  const openings = await db
    .select()
    .from(schema.openingBalances)
    .where(eq(schema.openingBalances.tenantId, tid));
  console.log("\n=== Opening Balances:", openings.length, "entries ===");
  openings.forEach(o =>
    console.log(" ", o.accountId, o.periodName, o.type, o.amount)
  );

  // 4. Users
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.tenantId, tid));
  console.log("\n=== Users:", users.length, "users ===");
  users.forEach(u => console.log(" ", u.username, u.name, u.role, u.email));

  // 5. Branches
  const branches = await db
    .select()
    .from(schema.branches)
    .where(eq(schema.branches.tenantId, tid));
  console.log("\n=== Branches:", branches.length, "branches ===");
  branches.forEach(b => console.log(" ", b.name, b.code, b.city));

  // 6. POS Sessions
  const pos = await db
    .select()
    .from(schema.posSessions)
    .where(eq(schema.posSessions.tenantId, tid));
  console.log("\n=== POS Sessions:", pos.length, "sessions ===");
  pos.forEach(p =>
    console.log(
      " ",
      p.status,
      p.openedAt,
      "branch:",
      p.branchId,
      "user:",
      p.openedById
    )
  );
}

verify()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
