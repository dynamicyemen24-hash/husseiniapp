import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Check products tenant distribution
    const result = await db.execute(sql`SELECT "tenantId", COUNT(*) as cnt FROM products GROUP BY "tenantId"`);
    console.log('Products by tenant:', result.rows);
    
    // Check warehouse_stock tenant distribution
    const wsResult = await db.execute(sql`SELECT "tenantId", COUNT(*) as cnt FROM warehouse_stock GROUP BY "tenantId"`);
    console.log('Warehouse stock by tenant:', wsResult.rows);
    
    // Check inventory_movements tenant distribution
    const imResult = await db.execute(sql`SELECT "tenantId", COUNT(*) as cnt FROM inventory_movements GROUP BY "tenantId"`);
    console.log('Inventory movements by tenant:', imResult.rows);
    
    // Check inventory_batches tenant distribution
    const ibResult = await db.execute(sql`SELECT "tenantId", COUNT(*) as cnt FROM inventory_batches GROUP BY "tenantId"`);
    console.log('Inventory batches by tenant:', ibResult.rows);
    
    // Check inventory_valuation_layers tenant distribution
    const vlResult = await db.execute(sql`SELECT "tenantId", COUNT(*) as cnt FROM inventory_valuation_layers GROUP BY "tenantId"`);
    console.log('Valuation layers by tenant:', vlResult.rows);
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

check().catch(console.error);