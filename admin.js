// admin.js - LENGKAP dengan CRUD + Logout
import express from 'express';
import pool from './db.js';

const router = express.Router();

// ==================== GET ALL ADMINS ====================
router.get('/', async (req, res) => {
  console.log('GET /api/admin');
  
  try {
    const admins = await pool.query(
      'SELECT id, username, created_at FROM admin ORDER BY id DESC'
    );
    
    console.log(`Found ${admins.rows.length} admins`);
    res.json({
      success: true,
      count: admins.rows.length,
      data: admins.rows
    });
  } catch (error) {
    console.error('Error:', error);
    
    // Fallback tanpa created_at
    try {
      const admins = await pool.query(
        'SELECT id, username FROM admin ORDER BY id DESC'
      );
      
      res.json({
        success: true,
        count: admins.rows.length,
        data: admins.rows
      });
    } catch (retryError) {
      res.status(500).json({ 
        success: false,
        error: 'Server error',
        message: retryError.message
      });
    }
  }
});

// ==================== GET SINGLE ADMIN ====================
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`GET /api/admin/${id}`);
  
  try {
    const admin = await pool.query(
      'SELECT id, username, created_at FROM admin WHERE id = $1',
      [id]
    );
    
    if (admin.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Admin not found' 
      });
    }
    
    res.json({
      success: true,
      admin: admin.rows[0]
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

// ==================== LOGIN ====================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('POST /api/admin/login');
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Username and password required' 
    });
  }
  
  try {
    const admin = await pool.query(
      'SELECT id, username, password FROM admin WHERE username = $1',
      [username]
    );
    
    if (admin.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }
    
    // Simple password check (nanti ganti dengan bcrypt)
    if (admin.rows[0].password !== password) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }
    
    // Return tanpa password
    const { password: _, ...adminData } = admin.rows[0];
    
    // Generate simple token (untuk production gunakan JWT)
    const token = Buffer.from(`${adminData.id}:${adminData.username}:${Date.now()}`).toString('base64');
    
    res.json({
      success: true,
      message: 'Login successful',
      admin: adminData,
      token: token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// ==================== LOGOUT ====================
router.post('/logout', async (req, res) => {
  console.log('POST /api/admin/logout');
  
  // Untuk logout sederhana, cukup return success
  // Client harus hapus token dari localStorage/sessionStorage
  // Untuk production, bisa implement token blacklist di database
  
  res.json({
    success: true,
    message: 'Logout successful',
    instruction: 'Please remove token from client storage'
  });
});

// ==================== REGISTER ====================
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  console.log('POST /api/admin/register');
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Username and password required' 
    });
  }
  
  // Validasi username
  if (username.length < 3) {
    return res.status(400).json({ 
      success: false,
      error: 'Username must be at least 3 characters' 
    });
  }
  
  // Validasi password
  if (password.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: 'Password must be at least 6 characters' 
    });
  }
  
  try {
    // Cek jika username sudah ada
    const existing = await pool.query(
      'SELECT id FROM admin WHERE username = $1',
      [username]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Username already exists' 
      });
    }
    
    // Insert admin baru
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
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// ==================== EDIT/UPDATE ADMIN ====================
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, new_password } = req.body;
  console.log(`PUT /api/admin/${id}`);
  
  try {
    // Cek apakah admin exists
    const existing = await pool.query(
      'SELECT id, username, password FROM admin WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Admin not found' 
      });
    }
    
    const currentAdmin = existing.rows[0];
    
    // Jika update username, cek duplikat
    if (username && username !== currentAdmin.username) {
      const duplicate = await pool.query(
        'SELECT id FROM admin WHERE username = $1 AND id != $2',
        [username, id]
      );
      
      if (duplicate.rows.length > 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Username already taken by another admin' 
        });
      }
    }
    
    // Siapkan data update
    const updatedUsername = username || currentAdmin.username;
    let updatedPassword = currentAdmin.password;
    
    // Jika ada new_password, validasi old password dulu
    if (new_password) {
      if (!password) {
        return res.status(400).json({ 
          success: false,
          error: 'Current password required to change password' 
        });
      }
      
      if (password !== currentAdmin.password) {
        return res.status(401).json({ 
          success: false,
          error: 'Current password is incorrect' 
        });
      }
      
      if (new_password.length < 6) {
        return res.status(400).json({ 
          success: false,
          error: 'New password must be at least 6 characters' 
        });
      }
      
      updatedPassword = new_password;
    }
    
    // Update admin
    const updated = await pool.query(
      'UPDATE admin SET username = $1, password = $2 WHERE id = $3 RETURNING id, username',
      [updatedUsername, updatedPassword, id]
    );
    
    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: updated.rows[0]
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// ==================== DELETE ADMIN ====================
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`DELETE /api/admin/${id}`);
  
  try {
    // Cek apakah admin exists
    const existing = await pool.query(
      'SELECT id, username FROM admin WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Admin not found' 
      });
    }
    
    // Cek jangan hapus admin terakhir
    const countResult = await pool.query('SELECT COUNT(*) FROM admin');
    const adminCount = parseInt(countResult.rows[0].count);
    
    if (adminCount <= 1) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot delete the last admin' 
      });
    }
    
    // Delete admin
    const deleted = await pool.query(
      'DELETE FROM admin WHERE id = $1 RETURNING id, username',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Admin deleted successfully',
      deletedAdmin: deleted.rows[0]
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// ==================== CHANGE PASSWORD (Alternative) ====================
router.post('/change-password', async (req, res) => {
  const { id, current_password, new_password } = req.body;
  console.log('POST /api/admin/change-password');
  
  if (!id || !current_password || !new_password) {
    return res.status(400).json({ 
      success: false,
      error: 'id, current_password, and new_password are required' 
    });
  }
  
  if (new_password.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: 'New password must be at least 6 characters' 
    });
  }
  
  try {
    // Cek admin dan password
    const admin = await pool.query(
      'SELECT id, password FROM admin WHERE id = $1',
      [id]
    );
    
    if (admin.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Admin not found' 
      });
    }
    
    if (admin.rows[0].password !== current_password) {
      return res.status(401).json({ 
        success: false,
        error: 'Current password is incorrect' 
      });
    }
    
    // Update password
    await pool.query(
      'UPDATE admin SET password = $1 WHERE id = $2',
      [new_password, id]
    );
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

export default router;