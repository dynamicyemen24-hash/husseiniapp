import { neon } from "@neondatabase/serverless";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load .env manually (scripts do not go through Vite's env loading)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Check .env file.");
  process.exit(1);
}

const scryptAsync = promisify(scrypt);
const sql = neon(process.env.DATABASE_URL);

async function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith("scrypt$")) return false;
  const parts = stored.split("$");
  const salt = parts[1];
  const hash = parts[2];
  if (!salt || !hash) return false;
  const derived = await scryptAsync(password, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function main() {
  const rows =
    await sql`select id, username, "passwordHash", role, "tenantId" from users where username = 'e2e_runner'`;
  console.log("Users found:", rows.length);
  if (rows[0]) {
    console.log("id:", rows[0].id);
    console.log("username:", rows[0].username);
    console.log("role:", rows[0].role);
    console.log("tenantId:", rows[0].tenantId);
    console.log("passwordHash:", rows[0].passwordHash);
    console.log("hash length:", rows[0].passwordHash?.length);

    const testPassword = process.env.E2E_PASSWORD || "E2e#Runner#2026!Secure";
    const ok = await verifyPassword(testPassword, rows[0].passwordHash);
    console.log("verifyPassword for E2E_PASSWORD:", ok);

    if (!ok) {
      console.log("Password doesn't match - re-seeding...");
      const testHash = await hashPassword(testPassword);
      await sql`update users set "passwordHash" = ${testHash} where id = ${rows[0].id}`;
      console.log("Updated hash:", testHash);
      const ok2 = await verifyPassword(testPassword, testHash);
      console.log("verifyPassword after reseed:", ok2);
    }
  } else {
    console.log("User not found! Creating...");
    const hash = await hashPassword(
      process.env.E2E_PASSWORD || "E2e#Runner#2026!Secure"
    );
    const result =
      await sql`insert into users ("openId", "tenantId", name, email, username, "passwordHash", role) values ('e2e_test', 4, 'E2E Runner', 'e2e@husseiniya.local', 'e2e_runner', ${hash}, 'admin') returning id`;
    console.log("Created user id:", result[0]?.id);
  }
}
main().catch(console.error);
