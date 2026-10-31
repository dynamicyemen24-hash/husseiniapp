import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

async function fixTenant1Inventory() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    console.log('🔧 Fixing tenant 1 inventory...\n');
    
    // Check products for tenant 1 with currentStock > 0
    const products = await db.execute(sql`
      SELECT id, "currentStock" FROM products 
      WHERE "tenantId" = 1 AND "currentStock" > 0
    `);
    console.log(`Found ${products.rows.length} products with currentStock > 0 for tenant 1`);
    
    // Create warehouse for tenant 1
    const newWarehouse = await db.execute(sql`
      INSERT INTO warehouses ("tenantId", code, name, "isActive", "createdAt", "updatedAt")
      VALUES (1, 'MAIN', 'المستودع الرئيسي', true, NOW(), NOW())
      RETURNING id
    `);
    console.log('Created warehouse for tenant 1:', newWarehouse.rows[0]);
    const warehouseId = newWarehouse.rows[0].id;
    
    // Create warehouse_stock for each product
    let created = 0;
    for (const product of products.rows) {
      await db.execute(sql`
        INSERT INTO warehouse_stock ("tenantId", "productId", "warehouseId", quantity, "reservedQty", "availableQty", "lastMovementAt", "createdAt", "updatedAt")
        VALUES (1, ${product.id}, ${newWarehouse.rows[0].id}, ${product.currentStock}, 0, ${product.currentStock}, NOW(), NOW(), NOW())
      `);
      created++;
    }
    
    console.log(`Created ${created} warehouse_stock records for tenant 1`);
    
    // Sync product.currentStock with warehouse_stock sum
    await db.execute(sql`
      UPDATE products p
      SET "currentStock" = COALESCE((
        SELECT SUM(ws.quantity) FROM warehouse_stock ws 
        WHERE ws."tenantId" = 1 AND ws."productId" = p.id
      ), 0),
      "updatedAt" = NOW()
      WHERE p."tenantId" = 1
    `);
    console.log('Synced tenant 1 products currentStock with warehouse_stock');
    
    // Verify
    const verify = await db.execute(sql`
      SELECT p.id, p.name, p."currentStock", COALESCE(SUM(ws.quantity), 0) as ws_sum
      FROM products p
      LEFT JOIN warehouse_stock ws ON ws."productId" = p.id AND ws."tenantId" = 1
      WHERE p."tenantId" = 1
      GROUP BY p.id, p.name, p."currentStock"
      HAVING p."currentStock" != COALESCE(SUM(ws.quantity), 0)
    `);
    console.log(`\nRemaining mismatches for tenant 1: ${verify.rows.length}`);
    
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await pool.end();
  }
}

fixTenant1Inventory().catch(console.error);