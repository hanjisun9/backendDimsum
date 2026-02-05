// db.js - FIXED VERSION
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

console.log('🔍 Initializing database connection...');
console.log('NEON_DATABASE_URL set:', !!process.env.NEON_DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function untuk test connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL database');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('📅 Database time:', result.rows[0].now);
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
};

// Function untuk create tables
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

// Initialize database async
const initDatabase = async () => {
  console.log('🔄 Initializing database...');
  
  const connected = await testConnection();
  if (connected) {
    await createTables();
    
    // Create default admin jika belum ada
    try {
      const adminCheck = await pool.query('SELECT COUNT(*) FROM admin');
      if (parseInt(adminCheck.rows[0].count) === 0) {
        // Create default admin (password: admin123)
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash('admin123', 10);
        
        await pool.query(
          'INSERT INTO admin (username, password) VALUES ($1, $2)',
          ['admin', hashedPassword]
        );
        console.log('👑 Default admin created: username=admin, password=admin123');
      }
    } catch (error) {
      console.log('⚠️ Could not check/create default admin:', error.message);
    }
  } else {
    console.log('🔄 Retrying database connection in 10 seconds...');
    setTimeout(initDatabase, 10000);
  }
};

// Start initialization (tapi jangan block main thread)
initDatabase().catch(console.error);

export default pool;