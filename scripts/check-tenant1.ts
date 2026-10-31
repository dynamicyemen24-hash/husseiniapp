import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Check warehouses for tenant 1
    const warehouses = await db.execute(sql`SELECT id, "isActive" FROM warehouses WHERE "tenantId" = 1`);
    console.log('Tenant 1 warehouses:', warehouses.rows);
    
    // Check products for tenant 1 with currentStock > 0
    const products = await db.execute(sql`SELECT id, "currentStock" FROM products WHERE "tenantId" = 1 AND "currentStock" > 0`);
    console.log('Tenant 1 products with stock:', products.rows.length);
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

check().catch(console.error);