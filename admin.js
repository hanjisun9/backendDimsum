import express from 'express';
import bcrypt from 'bcryptjs';
import pool from './db.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Register admin
router.post('/register', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const existingAdmin = await pool.query(
      'SELECT * FROM admin WHERE username = $1',
      [username]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await pool.query(
      'INSERT INTO admin (username, password) VALUES ($1, $2) RETURNING id, username, created_at',
      [username, hashedPassword]
    );

    res.status(201).json({
      message: 'Admin created successfully',
      admin: newAdmin.rows[0]
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login admin
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const admin = await pool.query(
      'SELECT * FROM admin WHERE username = $1',
      [username]
    );

    if (admin.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.rows[0].password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password: _, ...adminData } = admin.rows[0];

    res.json({
      message: 'Login successful',
      admin: adminData
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all admins
router.get('/', async (req, res) => {
  try {
    const admins = await pool.query(
      'SELECT id, username, created_at FROM admin ORDER BY created_at DESC'
    );
    res.json(admins.rows);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;