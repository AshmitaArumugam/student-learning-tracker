const { Client } = require('pg');
require('dotenv').config();

const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    await db.connect();
    const result = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', result.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await db.end();
  }
}

checkTables();