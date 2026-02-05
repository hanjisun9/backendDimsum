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

// Test connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL database');
    
    const result = await client.query('SELECT NOW()');
    console.log('📅 Database time:', result.rows[0].now);
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
};

// Create tables with all columns
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
    console.log('✅ Admin table ready');

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
    console.log('✅ Products table ready');

    // FIX MISSING COLUMNS - Tambahkan jika belum ada
    await fixMissingColumns();
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
};

// Fix missing columns
const fixMissingColumns = async () => {
  try {
    // Fix admin table
    await pool.query(`
      ALTER TABLE admin 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `).catch(() => console.log('created_at already exists in admin'));

    // Fix products table
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `).catch(() => console.log('created_at already exists in products'));

    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `).catch(() => console.log('updated_at already exists in products'));

    console.log('✅ All columns verified');
  } catch (error) {
    console.log('⚠️ Column fix warning:', error.message);
  }
};

// Initialize database
const initDatabase = async () => {
  console.log('🔄 Initializing database...');
  
  const connected = await testConnection();
  if (connected) {
    await createTables();
    
    // Check if admin exists
    try {
      const adminCheck = await pool.query('SELECT COUNT(*) FROM admin');
      if (parseInt(adminCheck.rows[0].count) === 0) {
        await pool.query(
          'INSERT INTO admin (username, password) VALUES ($1, $2)',
          ['admin', 'admin123']
        );
        console.log('👑 Default admin created: username=admin, password=admin123');
      } else {
        console.log('👑 Admin exists:', adminCheck.rows[0].count, 'user(s)');
      }
    } catch (error) {
      console.log('⚠️ Note: Could not check/create default admin:', error.message);
    }
    
    return true;
  }
  return false;
};

// Export pool dan initDatabase
export default pool;
export { initDatabase };