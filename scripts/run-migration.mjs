import { Pool } from 'pg';
import fs from 'fs';

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error('NEON_DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString.includes('sslmode') ? connectionString : `${connectionString}?sslmode=require`,
  max: 1,
});

async function runMigration(migrationFile) {
  const sql = fs.readFileSync(migrationFile, 'utf-8');
  const statements = sql.split('--> statement-breakpoint\n').filter(s => s.trim());
  
  const client = await pool.connect();
  try {
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        console.log(`Executing: ${trimmed.substring(0, 50)}...`);
        await client.query(trimmed);
      }
    }
  } finally {
    client.release();
  }
}

async function main() {
  try {
    const client = await pool.connect();
    const res = await client.query(`SELECT * FROM information_schema.tables WHERE table_name = 'ai_agents'`);
    client.release();
    
    if (res.rows.length > 0) {
      console.log('ai_agents table already exists');
      process.exit(0);
    }
    
    console.log('Running migration 0002...');
    await runMigration('./drizzle/0002_condemned_karma.sql');
    console.log('Migration complete!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
