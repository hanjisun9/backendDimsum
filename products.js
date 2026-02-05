import express from 'express';

// Dynamic import for pool
let pool;

(async () => {
  try {
    const dbModule = await import('./db.js');
    pool = dbModule.default;
  } catch (error) {
    console.error('Failed to import pool in products.js:', error);
  }
})();

const router = express.Router();

// Simple GET products - works with or without timestamps
router.get('/', async (req, res) => {
  console.log('GET /api/products');
  
  if (!pool) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    // First try with all columns
    const products = await pool.query(
      'SELECT id, nama_produk, harga, image_url, deskripsi, created_at, updated_at FROM products ORDER BY id DESC'
    );
    
    res.json({
      success: true,
      count: products.rows.length,
      data: products.rows
    });
  } catch (error) {
    // If error, try without timestamps
    console.log('Retrying query without timestamps...');
    
    try {
      const products = await pool.query(
        'SELECT id, nama_produk, harga, image_url, deskripsi FROM products ORDER BY id DESC'
      );
      
      res.json({
        success: true,
        count: products.rows.length,
        data: products.rows,
        note: 'timestamp columns might be missing'
      });
    } catch (retryError) {
      console.error('Error fetching products:', retryError);
      res.status(500).json({ 
        error: 'Server error',
        message: retryError.message
      });
    }
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`GET /api/products/${id}`);
  
  if (!pool) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    const product = await pool.query(
      'SELECT id, nama_produk, harga, image_url, deskripsi FROM products WHERE id = $1',
      [id]
    );
    
    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({
      success: true,
      product: product.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message
    });
  }
});

// CREATE product
router.post('/', async (req, res) => {
  console.log('POST /api/products', req.body);
  
  if (!pool) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  const { nama_produk, harga, image_url, deskripsi } = req.body;
  
  if (!nama_produk || !harga) {
    return res.status(400).json({ error: 'nama_produk and harga are required' });
  }
  
  try {
    const newProduct = await pool.query(
      `INSERT INTO products (nama_produk, harga, image_url, deskripsi) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, nama_produk, harga, image_url, deskripsi`,
      [nama_produk, parseFloat(harga), image_url || null, deskripsi || null]
    );
    
    console.log('Product created:', newProduct.rows[0].id);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: newProduct.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to create product',
      message: error.message
    });
  }
});

// UPDATE product
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  console.log(`PUT /api/products/${id}`, updates);
  
  if (!pool) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    // Get existing product
    const existing = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Merge updates
    const merged = {
      nama_produk: updates.nama_produk || existing.rows[0].nama_produk,
      harga: updates.harga || existing.rows[0].harga,
      image_url: updates.image_url !== undefined ? updates.image_url : existing.rows[0].image_url,
      deskripsi: updates.deskripsi !== undefined ? updates.deskripsi : existing.rows[0].deskripsi
    };
    
    const updated = await pool.query(
      `UPDATE products 
       SET nama_produk = $1, harga = $2, image_url = $3, deskripsi = $4
       WHERE id = $5 
       RETURNING id, nama_produk, harga, image_url, deskripsi`,
      [merged.nama_produk, merged.harga, merged.image_url, merged.deskripsi, id]
    );
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updated.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to update product',
      message: error.message
    });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`DELETE /api/products/${id}`);
  
  if (!pool) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully',
      deletedId: result.rows[0].id
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to delete product',
      message: error.message
    });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Products API is working',
    endpoints: {
      'GET /': 'Get all products',
      'GET /:id': 'Get single product',
      'POST /': 'Create product',
      'PUT /:id': 'Update product',
      'DELETE /:id': 'Delete product'
    }
  });
});

export default router;