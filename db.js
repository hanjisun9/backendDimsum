import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

console.log('🔍 Checking for NEON_DATABASE_URL...');
console.log('NEON_DATABASE_URL is set:', !!process.env.NEON_DATABASE_URL);

if (!process.env.NEON_DATABASE_URL) {
  console.error('❌ NEON_DATABASE_URL is not set in environment variables!');
  console.error('Please set it in Koyeb dashboard -> Variables');
}

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection dengan lebih banyak detail
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL database');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('📅 Database time:', result.rows[0].now);
    
    // Check if we can query
    const version = await client.query('SELECT version()');
    console.log('🔧 PostgreSQL version:', version.rows[0].version.split(',')[0]);
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('Full error:', err);
    console.log('📝 Connection string (partial):', 
      process.env.NEON_DATABASE_URL 
        ? process.env.NEON_DATABASE_URL.substring(0, 50) + '...'
        : 'Not set'
    );
    return false;
  }
};

// Create tables
const createTables = async () => {
  try {
    // Admin table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        nama_produk VARCHAR(100) NOT NULL,
        harga DECIMAL(10,2) NOT NULL,
        image_url TEXT,
        deskripsi TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tables checked/created');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
};

// Initialize database
const initDb = async () => {
  const connected = await testConnection();
  if (connected) {
    await createTables();
  } else {
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(initDb, 5000);
  }
};

// Start initialization
initDb();

export default pool;