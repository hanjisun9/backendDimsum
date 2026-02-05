import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Variables untuk routes
let pool = null;
let adminRoutes = null;
let productRoutes = null;
let isReady = false;

// Initialize function
const initialize = async () => {
  console.log('=== APP STARTING ===');
  console.log('PORT:', PORT);
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('NEON_DATABASE_URL:', process.env.NEON_DATABASE_URL ? 'SET' : 'NOT SET');
  
  try {
    // Import dan init database
    const dbModule = await import('./db.js');
    pool = dbModule.default;
    
    // Jalankan initDatabase untuk fix columns
    if (dbModule.initDatabase) {
      await dbModule.initDatabase();
    }
    console.log('✅ Database module loaded and initialized');
  } catch (error) {
    console.error('❌ Failed to load database module:', error.message);
    throw error;
  }
  
  try {
    // Import admin routes
    const adminModule = await import('./admin.js');
    adminRoutes = adminModule.default;
    console.log('✅ Admin routes loaded');
  } catch (error) {
    console.error('❌ Failed to load admin routes:', error.message);
    adminRoutes = express.Router();
    adminRoutes.all('*', (req, res) => {
      res.status(500).json({ error: 'Admin routes failed to load', message: error.message });
    });
  }
  
  try {
    // Import product routes
    const productModule = await import('./products.js');
    productRoutes = productModule.default;
    console.log('✅ Product routes loaded');
  } catch (error) {
    console.error('❌ Failed to load product routes:', error.message);
    productRoutes = express.Router();
    productRoutes.all('*', (req, res) => {
      res.status(500).json({ error: 'Product routes failed to load', message: error.message });
    });
  }
  
  isReady = true;
  console.log('✅ All modules loaded successfully');
};

// Middleware untuk cek readiness
const checkReady = (req, res, next) => {
  if (!isReady) {
    return res.status(503).json({ 
      error: 'Service not ready',
      message: 'Server is still initializing, please wait...'
    });
  }
  next();
};

// Routes dengan checkReady middleware
app.use('/api/admin', checkReady, (req, res, next) => {
  if (!adminRoutes) {
    return res.status(503).json({ error: 'Admin routes not loaded' });
  }
  adminRoutes(req, res, next);
});

app.use('/api/products', checkReady, (req, res, next) => {
  if (!productRoutes) {
    return res.status(503).json({ error: 'Product routes not loaded' });
  }
  productRoutes(req, res, next);
});

// Debug endpoint
app.get('/debug', async (req, res) => {
  if (!pool) {
    return res.json({
      status: 'initializing',
      isReady,
      database: 'not connected'
    });
  }
  
  try {
    const dbResult = await pool.query('SELECT NOW() as time');
    
    res.json({
      status: 'running',
      isReady,
      time: new Date().toISOString(),
      database: {
        connected: true,
        time: dbResult.rows[0].time
      },
      routes: {
        admin: adminRoutes ? 'loaded' : 'loading',
        products: productRoutes ? 'loaded' : 'loading'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Check table structure
app.get('/debug/tables', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  
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

// Health check (selalu jalan)
app.get('/health', async (req, res) => {
  const response = { 
    status: isReady ? 'OK' : 'INITIALIZING',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    ready: isReady
  };
  
  if (pool) {
    try {
      await pool.query('SELECT 1');
      response.database = 'connected';
    } catch (error) {
      response.database = 'disconnected';
      response.dbError = error.message;
    }
  } else {
    response.database = 'not initialized';
  }
  
  res.json(response);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Dimsum Backend API',
    ready: isReady,
    endpoints: {
      admin: '/api/admin',
      products: '/api/products',
      health: '/health',
      debug: '/debug',
      'debug-tables': '/debug/tables'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  res.status(500).json({ 
    error: 'Server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available: ['/', '/health', '/debug', '/api/products', '/api/admin']
  });
});

// Start server SETELAH initialize
const startServer = async () => {
  try {
    await initialize();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 http://localhost:${PORT}`);
      console.log('=== READY TO SERVE ===');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    
    // Start server anyway untuk debugging
    app.listen(PORT, () => {
      console.log(`⚠️ Server running on port ${PORT} (with errors)`);
    });
  }
};

startServer();  