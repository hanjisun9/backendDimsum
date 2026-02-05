// admin.js - VERSION WITH DEBUGGING
import express from 'express';
import pool from './db.js';

const router = express.Router();

// MIDDLEWARE: Log semua request ke admin routes
router.use((req, res, next) => {
  console.log(`[ADMIN] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// SIMPLE GET without bcrypt/validator
router.get('/', async (req, res) => {
  console.log('GET /api/admin - Handling request');
  
  try {
    console.log('Executing query...');
    const admins = await pool.query(
      'SELECT id, username, created_at FROM admin ORDER BY created_at DESC'
    );
    
    console.log(`Query successful, found ${admins.rows.length} admins`);
    res.json({
      success: true,
      count: admins.rows.length,
      data: admins.rows
    });
    
  } catch (error) {
    console.error('❌ ERROR in GET /api/admin:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  }
});

// SIMPLE LOGIN without bcrypt
router.post('/login-simple', async (req, res) => {
  console.log('POST /api/admin/login-simple', req.body);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      error: 'Username and password required'
    });
  }
  
  try {
    // Simple query tanpa bcrypt
    const admin = await pool.query(
      'SELECT id, username FROM admin WHERE username = $1 AND password = $2',
      [username, password] // Warning: plain text password!
    );
    
    if (admin.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({
      success: true,
      message: 'Login successful (simple version)',
      admin: admin.rows[0]
    });
    
  } catch (error) {
    console.error('Error in simple login:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export (simpan routes dengan bcrypt/validator untuk nanti)
export default router;