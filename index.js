const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const adminRoutes = require('./admin');
const productRoutes = require('./products');

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Neon Backend API',
    endpoints: {
      admin: '/api/admin',
      products: '/api/products',
      health: '/health'
    },
    documentation: 'Use Postman to test endpoints'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log(`API endpoints available:`);
  console.log(`  GET  http://localhost:${PORT}/api/products`);
  console.log(`  POST http://localhost:${PORT}/api/admin/register`);
  console.log(`  POST http://localhost:${PORT}/api/admin/login`);
});