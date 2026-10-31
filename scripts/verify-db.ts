import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

async function verify() {
  console.log('🔍 Starting comprehensive database verification...\n');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    console.log('✅ DB connected');
    
    // Check journal entries
    const jeCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM journal_entries`);
    console.log('Journal entries:', jeCount.rows[0].cnt);
    
    // Check transactions
    const txCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM transactions`);
    console.log('Transactions:', txCount.rows[0].cnt);
    
    // Check accounts
    const accCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM accounts`);
    console.log('Accounts:', accCount.rows[0].cnt);
    
    // Check fiscal periods
    const fpCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM fiscal_periods`);
    console.log('Fiscal periods:', fpCount.rows[0].cnt);
    
    // Check inventory
    const prodCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM products`);
    console.log('Products:', prodCount.rows[0].cnt);
    
    const wsCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM warehouse_stock`);
    console.log('Warehouse stock:', wsCount.rows[0].cnt);
    
    const invMovCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM inventory_movements`);
    console.log('Inventory movements:', invMovCount.rows[0].cnt);
    
    const batchCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM inventory_batches`);
    console.log('Inventory batches:', batchCount.rows[0].cnt);
    
    const valLayerCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM inventory_valuation_layers`);
    console.log('Valuation layers:', valLayerCount.rows[0].cnt);
    
    // Check for double-entry integrity
    const unbalanced = await db.execute(sql`
      SELECT je.id, je."referenceNo", SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE -t.amount END) as imbalance
      FROM journal_entries je
      JOIN transactions t ON t."journalEntryId" = je.id
      GROUP BY je.id, je."referenceNo"
      HAVING ABS(SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE -t.amount END)) > 0.01
    `);
    console.log('\n🔍 Unbalanced journals:', unbalanced.rows.length);
    if (unbalanced.rows.length > 0) {
      console.table(unbalanced.rows.slice(0, 10));
    }
    
// Check inventory balances consistency for all tenants
    const invIssues = await db.execute(sql`
      SELECT p."tenantId", p.id, p.name, p."currentStock", COALESCE(SUM(ws.quantity), 0) as ws_sum
      FROM products p
      LEFT JOIN warehouse_stock ws ON ws."productId" = p.id AND ws."tenantId" = p."tenantId"
      GROUP BY p."tenantId", p.id, p.name, p."currentStock"
      HAVING p."currentStock" != COALESCE(SUM(ws.quantity), 0)
    `);
    console.log('\n🔍 Product stock mismatches:', invIssues.rows.length);
    if (invIssues.rows.length > 0) {
      console.table(invIssues.rows.slice(0, 10));
    }
    
    // Check valuation layers
    const valIssues = await db.execute(sql`
      SELECT vl.id, vl."productId", vl.quantity, vl."remainingQty", vl."unitCost",
             vl.quantity - vl."remainingQty" as consumed
      FROM inventory_valuation_layers vl
      WHERE vl."remainingQty" > vl.quantity
    `);
    console.log('\n🔍 Valuation layer issues:', valIssues.rows.length);
    if (valIssues.rows.length > 0) {
      console.table(valIssues.rows.slice(0, 10));
    }
    
    // Check for orphaned records
    const orphanMovements = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM inventory_movements im
      LEFT JOIN products p ON p.id = im."productId"
      WHERE p.id IS NULL
    `);
    console.log('\n🔍 Orphan inventory movements:', orphanMovements.rows[0].cnt);
    
    const orphanBatches = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM inventory_batches ib
      LEFT JOIN products p ON p.id = ib."productId"
      WHERE p.id IS NULL
    `);
    console.log('Orphan batches:', orphanBatches.rows[0].cnt);
    
    const orphanValuation = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM inventory_valuation_layers vl
      LEFT JOIN products p ON p.id = vl."productId"
      WHERE p.id IS NULL
    `);
    console.log('Orphan valuation layers:', orphanValuation.rows[0].cnt);
    
    // Check warehouse stock consistency
    const wsIssues = await db.execute(sql`
      SELECT ws.id, ws."productId", ws."warehouseId", ws.quantity, ws."reservedQty", ws."availableQty",
             (ws.quantity - ws."reservedQty" - ws."availableQty") as diff
      FROM warehouse_stock ws
      WHERE (ws.quantity - ws."reservedQty" - ws."availableQty") != 0
    `);
    console.log('\n🔍 Warehouse stock inconsistencies:', wsIssues.rows.length);
    if (wsIssues.rows.length > 0) {
      console.table(wsIssues.rows.slice(0, 10));
    }
    
    // Check batch quantities
    const batchIssues = await db.execute(sql`
      SELECT ib.id, ib."productId", ib."warehouseId", ib."batchNumber", ib.quantity, ib."reservedQty",
             (ib.quantity - ib."reservedQty") as available_calc
      FROM inventory_batches ib
      WHERE ib.quantity < ib."reservedQty" OR ib.quantity < 0 OR ib."reservedQty" < 0
    `);
    console.log('\n🔍 Batch quantity issues:', batchIssues.rows.length);
    if (batchIssues.rows.length > 0) {
      console.table(batchIssues.rows.slice(0, 10));
    }
    
    // Check valuation layer consistency
    const valLayerIssues = await db.execute(sql`
      SELECT vl.id, vl."productId", vl."warehouseId", vl."batchId", vl.quantity, vl."remainingQty", vl."unitCost",
             (vl.quantity - vl."remainingQty") as consumed
      FROM inventory_valuation_layers vl
      WHERE vl."remainingQty" > vl.quantity OR vl.quantity < 0 OR vl."remainingQty" < 0
    `);
    console.log('\n🔍 Valuation layer issues:', valLayerIssues.rows.length);
    if (valLayerIssues.rows.length > 0) {
      console.table(valLayerIssues.rows.slice(0, 10));
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (e) {
    console.error('❌ Verification failed:', e);
  } finally {
    await pool.end();
  }
}

verify().catch(console.error);