import "dotenv/config";
import { beforeAll, afterAll, vi } from "vitest";
import {
  StartedPostgreSqlContainer,
  PostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "./drizzle/schema";
import { Pool } from "pg";

let container: StartedPostgreSqlContainer;
let testPool: Pool;
export let testDb: ReturnType<typeof drizzle>;

beforeAll(async () => {
  console.warn("[Integration Setup] Starting PostgreSQL Testcontainer...");

  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("test_db")
    .withUsername("test_user")
    .withPassword("test_pass")
    .withExposedPorts(5432)
    .start();

  const connectionString = container.getConnectionUri();
  console.warn(`[Integration Setup] PostgreSQL started at ${connectionString}`);

  process.env.DATABASE_URL = connectionString;
  process.env.NODE_ENV = "test";

  testPool = new Pool({ connectionString });
  testDb = drizzle(testPool, { schema });

  console.warn("[Integration Setup] Running migrations...");
  await migrate(testDb, { migrationsFolder: "./drizzle/migrations" });
  console.warn("[Integration Setup] Migrations complete");

  vi.setConfig({ testTimeout: 120000 });
}, 180000);

afterAll(async () => {
  console.warn("[Integration Teardown] Stopping PostgreSQL Testcontainer...");
  if (testPool) {
    await testPool.end();
  }
  if (container) {
    await container.stop();
  }
  console.warn("[Integration Teardown] Complete");
}, 60000);

export function createTestTenant(
  db: ReturnType<typeof drizzle>,
  name: string = "Test Tenant"
) {
  return db
    .insert(schema.tenants)
    .values({
      name,
      code: `TEST${Date.now()}`,
      currency: "YER",
      country: "اليمن",
      subscriptionPlan: "standard",
      sector: "general",
    })
    .returning();
}

export function createTestUser(
  db: ReturnType<typeof drizzle>,
  tenantId: number,
  email: string = "test@example.com"
) {
  return db
    .insert(schema.users)
    .values({
      openId: `test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      tenantId,
      name: "Test User",
      email,
      loginMethod: "test",
      role: "admin",
      passwordHash: "test_hash",
      username: `testuser_${Date.now()}`,
      emailVerified: true,
    })
    .returning();
}

export function createTestContext(tenantId: number, userId: number = 1) {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "test",
      role: "admin",
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    tenantId,
    isSuperAdmin: true,
    req: { protocol: "https", headers: {} },
    res: { clearCookie: () => {} },
  };
}
