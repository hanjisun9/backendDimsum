// di db.js, update createTables function
const createTables = async () => {
  try {
    // Admin table dengan created_at
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Admin table checked/created');

    // Products table dengan timestamps
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
    console.log('✅ Products table checked/created');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
};