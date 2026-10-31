import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

async function fixInventory() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    console.log('🔧 Fixing inventory data inconsistencies (optimized)...\n');
    
    // Get all products for tenant 2 that have currentStock > 0
    const products = await db.execute(sql`
      SELECT id, "currentStock" FROM products 
      WHERE "tenantId" = 2 AND "currentStock" > 0
    `);
    console.log(`Found ${products.rows.length} products with currentStock > 0`);
    
    // Get warehouses for tenant 2
    const warehouses = await db.execute(sql`
      SELECT id FROM warehouses WHERE "tenantId" = 2 AND "isActive" = true
    `);
    console.log(`Found ${warehouses.rows.length} active warehouses`);
    
    if (warehouses.rows.length === 0) {
      console.log('❌ No active warehouses found for tenant 2. Creating default warehouse...');
      const newWarehouse = await db.execute(sql`
        INSERT INTO warehouses ("tenantId", code, name, "isActive", "createdAt", "updatedAt")
        VALUES (2, 'MAIN', 'المستودع الرئيسي', true, NOW(), NOW())
        RETURNING id
      `);
      console.log('Created warehouse:', newWarehouse.rows[0]);
      warehouses.rows.push(newWarehouse.rows[0]);
    }
    
    const defaultWarehouseId = warehouses.rows[0].id;
    console.log(`Using warehouse ID: ${defaultWarehouseId}`);
    
    // Batch insert/update using single SQL statements
    // First, get existing warehouse_stock records
    const existing = await db.execute(sql`
      SELECT "productId", id, quantity FROM warehouse_stock 
      WHERE "tenantId" = 2 AND "warehouseId" = ${defaultWarehouseId}
    `);
    
    const existingMap = new Map(existing.rows.map(r => [r.productId, { id: r.id, qty: r.quantity }]));
    console.log(`Found ${existingMap.size} existing warehouse_stock records`);
    
    // Prepare batch operations
    const toInsert = [];
    const toUpdate = [];
    
    for (const product of products.rows) {
      const existingRecord = existingMap.get(product.id);
      if (existingRecord) {
        toUpdate.push({
          id: existingRecord.id,
          qty: product.currentStock,
          availableQty: product.currentStock - 0 // reservedQty is 0 for now
        });
      } else {
        toInsert.push({
          tenantId: 2,
          productId: product.id,
          warehouseId: defaultWarehouseId,
          quantity: product.currentStock,
          reservedQty: 0,
          availableQty: product.currentStock,
        });
      }
    }
    
    console.log(`To insert: ${toInsert.length}, To update: ${toUpdate.length}`);
    
    // Batch insert
    if (toInsert.length > 0) {
      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const values = batch.map(r => 
          `(${r.tenantId}, ${r.productId}, ${r.warehouseId}, ${r.quantity}, ${r.reservedQty}, ${r.availableQty}, NOW(), NOW(), NOW())`
        ).join(', ');
        
        await db.execute(sql`
          INSERT INTO warehouse_stock ("tenantId", "productId", "warehouseId", quantity, "reservedQty", "availableQty", "lastMovementAt", "createdAt", "updatedAt")
          VALUES ${sql.raw(values)}
          ON CONFLICT ("tenantId", "productId", "warehouseId") DO NOTHING
        `);
      }
      console.log(`Inserted ${toInsert.length} records`);
    }
    
    // Batch update
    if (toUpdate.length > 0) {
      // Use CASE statement for batch update
      const caseStatements = toUpdate.map(r => 
        `WHEN id = ${r.id} THEN ${r.qty}`
      ).join(' ');
      
      const caseAvailable = toUpdate.map(r => 
        `WHEN id = ${r.id} THEN ${r.availableQty}`
      ).join(' ');
      
      const ids = toUpdate.map(r => r.id).join(',');
      
      await db.execute(sql`
        UPDATE warehouse_stock 
        SET quantity = CASE ${sql.raw(caseStatements)} ELSE quantity END,
            "availableQty" = CASE ${sql.raw(caseAvailable)} ELSE "availableQty" END,
            "lastMovementAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id IN (${sql.raw(ids)})
      `);
      console.log(`Updated ${toUpdate.length} records`);
    }
    
    // Now sync product.currentStock with warehouse_stock sum
    const syncResult = await db.execute(sql`
      UPDATE products p
      SET "currentStock" = COALESCE((
        SELECT SUM(ws.quantity) FROM warehouse_stock ws 
        WHERE ws."tenantId" = 2 AND ws."productId" = p.id
      ), 0),
      "updatedAt" = NOW()
      WHERE p."tenantId" = 2
    `);
    console.log(`Synced products currentStock with warehouse_stock`);
    
    // Verify the fix
    const verify = await db.execute(sql`
      SELECT p.id, p.name, p."currentStock", COALESCE(SUM(ws.quantity), 0) as ws_sum
      FROM products p
      LEFT JOIN warehouse_stock ws ON ws."productId" = p.id AND ws."tenantId" = 2
      WHERE p."tenantId" = 2
      GROUP BY p.id, p.name, p."currentStock"
      HAVING p."currentStock" != COALESCE(SUM(ws.quantity), 0)
    `);
    console.log(`\nRemaining mismatches: ${verify.rows.length}`);
    if (verify.rows.length > 0) {
      console.table(verify.rows.slice(0, 10));
    }
    
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await pool.end();
  }
}

fixInventory().catch(console.error);