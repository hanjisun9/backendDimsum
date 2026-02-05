// products.js - VERSION WITH DEBUGGING
import express from 'express';
import pool from './db.js';

const router = express.Router();

// MIDDLEWARE: Log semua request ke product routes
router.use((req, res, next) => {
  console.log(`[PRODUCTS] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// SIMPLE GET tanpa error
router.get('/', async (req, res) => {
  console.log('GET /api/products - Handling request');
  
  try {
    console.log('Executing products query...');
    const products = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );
    
    console.log(`Query successful, found ${products.rows.length} products`);
    
    // Return empty array jika tidak ada data (INI NORMAL)
    res.json({
      success: true,
      count: products.rows.length,
      data: products.rows
    });
    
  } catch (error) {
    console.error('❌ ERROR in GET /api/products:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: 'Check if products table exists and has correct columns'
    });
  }
});

// SIMPLE CREATE product
router.post('/', async (req, res) => {
  console.log('POST /api/products', req.body);
  
  const { nama_produk, harga, image_url, deskripsi } = req.body;
  
  // Simple validation
  if (!nama_produk || !harga) {
    return res.status(400).json({ 
      error: 'nama_produk and harga are required'
    });
  }
  
  try {
    const newProduct = await pool.query(
      `INSERT INTO products (nama_produk, harga, image_url, deskripsi) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [nama_produk, parseFloat(harga), image_url || null, deskripsi || null]
    );

    console.log('Product created:', newProduct.rows[0].id);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: newProduct.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create product',
      message: error.message,
      detail: error.detail
    });
  }
});

export default router;