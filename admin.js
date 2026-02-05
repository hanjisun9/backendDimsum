// admin.js - PERBAIKI query
import express from 'express';
import pool from './db.js';

const router = express.Router();

// GET all admins - GUNAKAN COLUMNS YANG ADA
router.get('/', async (req, res) => {
  console.log('GET /api/admin');
  
  try {
    // Coba query tanpa created_at dulu
    const admins = await pool.query(
      'SELECT id, username FROM admin ORDER BY id DESC'
    );
    
    console.log(`Found ${admins.rows.length} admins`);
    res.json({
      success: true,
      count: admins.rows.length,
      data: admins.rows
    });
  } catch (error) {
    console.error('Error:', error);
    
    // Coba lihat columns yang ada
    try {
      const columns = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'admin'
      `);
      
      res.status(500).json({ 
        error: 'Query failed',
        message: error.message,
        available_columns: columns.rows.map(c => c.column_name),
        suggestion: 'Update query to use available columns'
      });
    } catch (colError) {
      res.status(500).json({ 
        error: 'Server error',
        message: error.message
      });
    }
  }
});

// Login - tanpa created_at
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  try {
    const admin = await pool.query(
      'SELECT id, username, password FROM admin WHERE username = $1',
      [username]
    );
    
    if (admin.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Simple password check (nanti ganti dengan bcrypt)
    if (admin.rows[0].password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Return tanpa password
    const { password: _, ...adminData } = admin.rows[0];
    
    res.json({
      success: true,
      message: 'Login successful',
      admin: adminData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message
    });
  }
});

// Register admin
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  try {
    // Cek jika username sudah ada
    const existing = await pool.query(
      'SELECT id FROM admin WHERE username = $1',
      [username]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Insert tanpa created_at (biar database handle default)
    const newAdmin = await pool.query(
      'INSERT INTO admin (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, password]
    );
    
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: newAdmin.rows[0]
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message
    });
  }
});

export default router;