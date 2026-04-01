const { Client } = require('pg');
require('dotenv').config();

const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
  try {
    await db.connect();
    const result = await db.query("SELECT id, name, email, password FROM users");
    console.log('Users:', result.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await db.end();
  }
}

checkUsers();