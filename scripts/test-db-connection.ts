import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

async function testConnection() {
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query('SELECT NOW() as now, version() as version');
    console.log('✅ DB connected successfully!');
    console.log('Time:', result.rows[0].now);
    console.log('Version:', result.rows[0].version);
    await pool.end();
  } catch (e) {
    console.error('❌ DB connection failed:', e.message);
    process.exit(1);
  }
}

testConnection();