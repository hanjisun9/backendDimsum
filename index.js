import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Dynamic imports to handle any export issues
let pool;
let adminRoutes;
let productRoutes;

(async () => {
  dotenv.config();
  
  console.log('=== APP STARTING ===');
  console.log('PORT:', process.env.PORT || 5000);
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('NEON_DATABASE_URL:', process.env.NEON_DATABASE_URL ? 'SET' : 'NOT SET');
  
  try {
    // Import db
    const dbModule = await import('./db.js');
    pool = dbModule.default;
    console.log('✅ Database module loaded');
  } catch (error) {
    console.error('❌ Failed to load database module:', error.message);
    process.exit(1);
  }
  
  try {
    // Import admin routes
    const adminModule = await import('./admin.js');
    adminRoutes = adminModule.default;
    console.log('✅ Admin routes loaded');
  } catch (error) {
    console.error('❌ Failed to load admin routes:', error.message);
    // Create empty router as fallback
    const express = await import('express');
    adminRoutes = express.Router();
    adminRoutes.get('/', (req, res) => {
      res.json({ error: 'Admin routes failed to load', message: error.message });
    });
  }
  
  try {
    // Import product routes
    const productModule = await import('./products.js');
    productRoutes = productModule.default;
    console.log('✅ Product routes loaded');
  } catch (error) {
    console.error('❌ Failed to load product routes:', error.message);
    // Create empty router as fallback
    const express = await import('express');
    productRoutes = express.Router();
    productRoutes.get('/', (req, res) => {
      res.json({ error: 'Product routes failed to load', message: error.message });
    });
  }
})();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes (use wrapper to handle async loading)
app.use('/api/admin', (req, res, next) => {
  if (!adminRoutes) {
    return res.status(503).json({ 
      error: 'Admin routes not loaded yet',
      message: 'Please wait for initialization' 
    });
  }
  adminRoutes(req, res, next);
});

app.use('/api/products', (req, res, next) => {
  if (!productRoutes) {
    return res.status(503).json({ 
      error: 'Product routes not loaded yet',
      message: 'Please wait for initialization' 
    });
  }
  productRoutes(req, res, next);
});

// Debug endpoints
app.get('/debug', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as time');
    
    res.json({
      status: 'running',
      time: new Date().toISOString(),
      database: {
        connected: true,
        time: dbResult.rows[0].time
      },
      routes: {
        admin: adminRoutes ? 'loaded' : 'loading',
        products: productRoutes ? 'loaded' : 'loading'
      },
      env: {
        node_env: process.env.NODE_ENV,
        port: PORT,
        neon_url_set: !!process.env.NEON_DATABASE_URL
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      database: 'disconnected'
    });
  }
});

// Check table structure
app.get('/debug/tables', async (req, res) => {
  try {
    const adminStructure = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'admin'
      ORDER BY ordinal_position
    `);
    
    const productsStructure = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `);
    
    res.json({
      admin: adminStructure.rows,
      products: productsStructure.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fix missing columns
app.post('/fix-tables', async (req, res) => {
  try {
    console.log('Fixing tables...');
    
    // Add created_at to admin if not exists
    await pool.query(`
      ALTER TABLE admin 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Added created_at to admin table');
    
    // Add timestamps to products if not exists
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Added timestamps to products table');
    
    res.json({
      success: true,
      message: 'Tables fixed successfully'
    });
  } catch (error) {
    console.error('Error fixing tables:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Server error',
      error: error.message,
      database: 'disconnected'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Dimsum Backend API',
    endpoints: {
      admin: '/api/admin',
      products: '/api/products',
      health: '/health',
      debug: '/debug',
      'debug-tables': '/debug/tables',
      'fix-tables': '/fix-tables (POST)'
    },
    note: 'If tables missing columns, POST to /fix-tables first'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  res.status(500).json({ 
    error: 'Server error',
    message: err.message,
    fix: 'Check if database tables have correct columns'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available: [
      '/', 
      '/health', 
      '/debug', 
      '/debug/tables',
      '/api/products', 
      '/api/admin'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log('=== ENDPOINTS ===');
  console.log('GET  /              - Welcome');
  console.log('GET  /health        - Health check');
  console.log('GET  /debug         - Debug info');
  console.log('GET  /debug/tables  - Check table structure');
  console.log('POST /fix-tables    - Fix missing columns');
  console.log('GET  /api/products  - Products API');
  console.log('GET  /api/admin     - Admin API');
});