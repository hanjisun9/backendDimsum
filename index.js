import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
import adminRoutes from './admin.js';
import productRoutes from './products.js';

dotenv.config();

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

// ==================== ROUTES ====================
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);

// ==================== DEBUG ENDPOINTS ====================
app.get('/debug', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as time');
    res.json({
      status: 'running',
      time: new Date().toISOString(),
      database: {
        connected: true,
        time: dbResult.rows[0].time
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

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

// ==================== HEALTH CHECK ====================
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
      database: 'disconnected',
      error: error.message
    });
  }
});

// ==================== ROOT ====================
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Dimsum Backend API',
    endpoints: {
      admin: {
        'GET /api/admin': 'Get all admins',
        'GET /api/admin/:id': 'Get single admin',
        'POST /api/admin/register': 'Register new admin',
        'POST /api/admin/login': 'Login',
        'POST /api/admin/logout': 'Logout',
        'PUT /api/admin/:id': 'Update admin',
        'DELETE /api/admin/:id': 'Delete admin',
        'POST /api/admin/change-password': 'Change password'
      },
      products: {
        'GET /api/products': 'Get all products',
        'GET /api/products/:id': 'Get single product',
        'POST /api/products': 'Create product',
        'PUT /api/products/:id': 'Update product',
        'DELETE /api/products/:id': 'Delete product'
      },
      utility: {
        'GET /health': 'Health check',
        'GET /debug': 'Debug info',
        'GET /debug/tables': 'Check table structure'
      }
    }
  });
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  res.status(500).json({ 
    success: false,
    error: 'Server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    hint: 'Check the correct path at GET /'
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log('=================================');
  console.log('Available endpoints:');
  console.log('  GET  /');
  console.log('  GET  /health');
  console.log('  GET  /api/admin');
  console.log('  POST /api/admin/login');
  console.log('  POST /api/admin/register');
  console.log('  GET  /api/products');
  console.log('=================================');
});