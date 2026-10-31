/**
 * Seed a dedicated, low-risk E2E runner user in the production-check tenant.
 *
 * - Idempotent: creates the user once, or updates ONLY its password hash
 *   if it already exists. Real team accounts are never touched.
 * - Password source: E2E_PASSWORD env (falls back to a strong default that
 *   is only meaningful inside this repo's test tenant).
 *
 * Usage: node --env-file=.env scripts/seed-e2e-user.mjs
 */
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { neon } from "@neondatabase/serverless";

const scryptAsync = promisify(scrypt);

const USERNAME = process.env.E2E_USERNAME || "e2e_runner";
const PASSWORD = process.env.E2E_PASSWORD || "E2e#Runner#2026!Secure";
const TENANT_ID = Number(process.env.E2E_TENANT_ID || 4); // "منشأة فحص الإنتاج"

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL missing — run with: node --env-file=.env scripts/seed-e2e-user.mjs"
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const passwordHash = await hashPassword(PASSWORD);

const existing =
  await sql`select id from users where username = ${USERNAME} limit 1`;

if (existing.length > 0) {
  await sql`update users set "passwordHash" = ${passwordHash}, "updatedAt" = now() where id = ${existing[0].id}`;
  console.log(
    `[seed-e2e-user] password refreshed for "${USERNAME}" (id=${existing[0].id})`
  );
} else {
  const openId = `e2e_${randomBytes(6).toString("hex")}`;
  const inserted = await sql`
    insert into users ("openId", "tenantId", name, email, username, "passwordHash", role)
    values (${openId}, ${TENANT_ID}, ${"E2E Runner"}, ${"e2e@husseiniya.local"}, ${USERNAME}, ${passwordHash}, ${"admin"})
    returning id`;
  console.log(
    `[seed-e2e-user] created "${USERNAME}" (id=${inserted[0].id}, tenant=${TENANT_ID})`
  );
}

console.log(
  "[seed-e2e-user] done — set E2E_USERNAME / E2E_PASSWORD in .env to run the authenticated journey."
);
