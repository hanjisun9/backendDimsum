// index.js - FIXED VERSION
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import pool untuk test
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('=== APP STARTING ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('NEON_DATABASE_URL:', process.env.NEON_DATABASE_URL ? 'SET' : 'NOT SET');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Import routes dengan dynamic import untuk error handling
let adminRoutes, productRoutes;

(async () => {
  try {
    // Dynamic import untuk handle missing dependencies
    const adminModule = await import('./admin.js');
    adminRoutes = adminModule.default;
    console.log('✅ Admin routes loaded');
  } catch (error) {
    console.error('❌ Failed to load admin routes:', error.message);
    
    // Fallback route
    const express = await import('express');
    adminRoutes = express.Router();
    adminRoutes.get('/', (req, res) => {
      res.json({ error: 'Admin routes failed to load', message: error.message });
    });
  }

  try {
    const productModule = await import('./products.js');
    productRoutes = productModule.default;
    console.log('✅ Product routes loaded');
  } catch (error) {
    console.error('❌ Failed to load product routes:', error.message);
    
    // Fallback route
    const express = await import('express');
    productRoutes = express.Router();
    productRoutes.get('/', (req, res) => {
      res.json({ error: 'Product routes failed to load', message: error.message });
    });
  }
})();

// Routes
app.use('/api/admin', (req, res, next) => {
  if (!adminRoutes) {
    return res.status(503).json({ 
      error: 'Admin routes not loaded yet',
      message: 'Please wait for routes to initialize' 
    });
  }
  adminRoutes(req, res, next);
});

app.use('/api/products', (req, res, next) => {
  if (!productRoutes) {
    return res.status(503).json({ 
      error: 'Product routes not loaded yet',
      message: 'Please wait for routes to initialize' 
    });
  }
  productRoutes(req, res, next);
});

// Debug endpoints
app.get('/debug', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as time, version() as version');
    
    res.json({
      status: 'running',
      time: new Date().toISOString(),
      database: {
        connected: true,
        time: dbResult.rows[0].time,
        version: dbResult.rows[0].version
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
      debug: '/debug'
    },
    note: 'If endpoints return error, check if bcryptjs and express-validator are installed'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  
  // Check if it's a missing module error
  let errorMessage = 'Server error';
  let errorDetails = err.message;
  
  if (err.message.includes('bcryptjs')) {
    errorMessage = 'Dependency missing: bcryptjs';
    errorDetails = 'Run: npm install bcryptjs express-validator';
  } else if (err.message.includes('express-validator')) {
    errorMessage = 'Dependency missing: express-validator';
    errorDetails = 'Run: npm install bcryptjs express-validator';
  }
  
  res.status(500).json({ 
    error: errorMessage,
    message: errorDetails,
    fix: 'Install missing dependencies: npm install bcryptjs express-validator'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available: ['/', '/health', '/debug', '/api/products', '/api/admin']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log('=== ENDPOINTS ===');
  console.log('GET  /              - Welcome');
  console.log('GET  /health        - Health check');
  console.log('GET  /debug         - Debug info');
  console.log('GET  /api/products  - Products API');
  console.log('GET  /api/admin     - Admin API');
});