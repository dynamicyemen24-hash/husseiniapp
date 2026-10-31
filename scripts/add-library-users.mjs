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

async function addLibraryUsers() {
  console.log("🚀 Adding Library Demo Users...");

  const tid = 2; // Library tenant

  const users = [
    {
      username: "hail_manager",
      name: "هايل المدير",
      email: "hail@husseiniya-demo.com",
      role: "admin",
      password: "Hail@2024",
    },
    {
      username: "abduljabbar_sales",
      name: "عبدالجبار مبيعات وحسابات",
      email: "abduljabbar@husseiniya-demo.com",
      role: "accountant",
      password: "Abdujabbar@2024",
    },
    {
      username: "imad_support",
      name: "عماد الدعم والصيانة والعملاء",
      email: "imad@husseiniya-demo.com",
      role: "user",
      password: "Imad@2024",
    },
    {
      username: "sami_sales",
      name: "سامي مبيعات وخدمة عملاء",
      email: "sami@husseiniya-demo.com",
      role: "user",
      password: "Sami@2024",
    },
    {
      username: "abdulrazzaq_audit",
      name: "عبدالرزاق مراجعة داخلية",
      email: "abdulrazzaq@husseiniya-demo.com",
      role: "auditor",
      password: "Abdurazzaq@2024",
    },
  ];

  for (const u of users) {
    const existing = (
      await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, u.username))
        .limit(1)
    )[0];
    if (!existing) {
      const passwordHash = await hashPassword(u.password);
      const [userRow] = await db
        .insert(schema.users)
        .values({
          openId: `local:${u.username}`,
          tenantId: tid,
          name: u.name,
          email: u.email,
          loginMethod: "local",
          username: u.username,
          passwordHash,
          role: u.role,
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
  }

  // Verify all users
  const allUsers = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.tenantId, tid));
  console.log("\n=== All Library Users:", allUsers.length, "users ===");
  allUsers.forEach(u => console.log(" ", u.username, u.name, u.role, u.email));

  console.log("\n🎉 Library Demo Users Added Successfully!");
}

addLibraryUsers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Failed:", err);
    process.exit(1);
  });
