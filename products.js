import express from 'express';
import pool from './db.js';

const router = express.Router();

// GET all products
router.get('/', async (req, res) => {
  console.log('GET /api/products');
  
  try {
    const products = await pool.query(
      'SELECT id, nama_produk, harga, image_url, deskripsi FROM products ORDER BY id DESC'
    );
    
    res.json({
      success: true,
      count: products.rows.length,
      data: products.rows
    });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`GET /api/products/${id}`);
  
  try {
    const product = await pool.query(
      'SELECT id, nama_produk, harga, image_url, deskripsi FROM products WHERE id = $1',
      [id]
    );
    
    if (product.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }
    
    res.json({
      success: true,
      product: product.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// CREATE product
router.post('/', async (req, res) => {
  console.log('POST /api/products', req.body);
  
  const { nama_produk, harga, image_url, deskripsi } = req.body;
  
  if (!nama_produk || harga === undefined) {
    return res.status(400).json({ 
      success: false,
      error: 'nama_produk and harga are required' 
    });
  }
  
  try {
    const newProduct = await pool.query(
      `INSERT INTO products (nama_produk, harga, image_url, deskripsi) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, nama_produk, harga, image_url, deskripsi`,
      [nama_produk, parseFloat(harga), image_url || null, deskripsi || null]
    );
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: newProduct.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create product',
      message: error.message
    });
  }
});

// UPDATE product
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nama_produk, harga, image_url, deskripsi } = req.body;
  console.log(`PUT /api/products/${id}`);
  
  try {
    const existing = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }
    
    const current = existing.rows[0];
    
    const updated = await pool.query(
      `UPDATE products 
       SET nama_produk = $1, harga = $2, image_url = $3, deskripsi = $4
       WHERE id = $5 
       RETURNING id, nama_produk, harga, image_url, deskripsi`,
      [
        nama_produk || current.nama_produk,
        harga !== undefined ? harga : current.harga,
        image_url !== undefined ? image_url : current.image_url,
        deskripsi !== undefined ? deskripsi : current.deskripsi,
        id
      ]
    );
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updated.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update product',
      message: error.message
    });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`DELETE /api/products/${id}`);
  
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully',
      deletedId: result.rows[0].id
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete product',
      message: error.message
    });
  }
});

export default router;