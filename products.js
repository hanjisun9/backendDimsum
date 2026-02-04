import express from 'express';
import pool from './db.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );
    res.json(products.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product
router.post('/', [
  body('nama_produk').notEmpty().withMessage('Product name is required'),
  body('harga').isDecimal().withMessage('Price must be a valid number'),
  body('image_url').optional().isURL().withMessage('Image URL must be valid'),
  body('deskripsi').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nama_produk, harga, image_url, deskripsi } = req.body;

  try {
    const newProduct = await pool.query(
      `INSERT INTO products (nama_produk, harga, image_url, deskripsi) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [nama_produk, harga, image_url || null, deskripsi || null]
    );

    res.status(201).json({
      message: 'Product created successfully',
      product: newProduct.rows[0]
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
router.put('/:id', [
  body('nama_produk').optional().notEmpty().withMessage('Product name cannot be empty'),
  body('harga').optional().isDecimal().withMessage('Price must be a valid number'),
  body('image_url').optional().isURL().withMessage('Image URL must be valid'),
  body('deskripsi').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { nama_produk, harga, image_url, deskripsi } = req.body;

  try {
    const existingProduct = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await pool.query(
      `UPDATE products 
       SET nama_produk = COALESCE($1, nama_produk),
           harga = COALESCE($2, harga),
           image_url = COALESCE($3, image_url),
           deskripsi = COALESCE($4, deskripsi),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [
        nama_produk || existingProduct.rows[0].nama_produk,
        harga || existingProduct.rows[0].harga,
        image_url || existingProduct.rows[0].image_url,
        deskripsi || existingProduct.rows[0].deskripsi,
        id
      ]
    );

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct.rows[0]
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search products
router.get('/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const products = await pool.query(
      `SELECT * FROM products 
       WHERE nama_produk ILIKE $1 
       ORDER BY created_at DESC`,
      [`%${keyword}%`]
    );

    res.json(products.rows);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;