import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, ilike } from "drizzle-orm";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import * as schema from "../drizzle/schema.js";

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const scryptAsync = promisify(scrypt);
const PREFIX = "scrypt$";

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${PREFIX}${salt}$${derived.toString("hex")}`;
}

async function addAccountingManager() {
  console.log("🚀 Adding Accounting Manager User...");

  const tid = 2; // Library tenant

  const user = {
    username: "mohamed_accounting",
    name: "محمد مدير الحسابات",
    email: "mohamed@husseiniya-demo.com",
    role: "accountant",
    password: "Mohamed@2024",
  };

  const existing = (
    await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, user.username))
      .limit(1)
  )[0];
  if (!existing) {
    const passwordHash = await hashPassword(user.password);
    const [userRow] = await db
      .insert(schema.users)
      .values({
        openId: `local:${user.username}`,
        tenantId: tid,
        name: user.name,
        email: user.email,
        loginMethod: "local",
        username: user.username,
        passwordHash,
        role: user.role,
        lastSignedIn: new Date(),
      })
      .returning();
    console.log(
      "✅ Created user:",
      userRow.username,
      "(",
      userRow.name,
      ")",
      "role:",
      userRow.role
    );
  } else {
    console.log(
      "ℹ️ User already exists:",
      existing.username,
      "(",
      existing.name,
      ")"
    );
  }

  // Verify all users
  const allUsers = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.tenantId, tid));
  console.log("\n=== All Library Users:", allUsers.length, "users ===");
  allUsers.forEach(u => console.log(" ", u.username, u.name, u.role, u.email));

  console.log("\n🎉 Accounting Manager Added Successfully!");
}

addAccountingManager()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Failed:", err);
    process.exit(1);
  });
