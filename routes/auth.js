// auth.js — handles parent register and login

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

// POST /api/auth/register — parent creates account
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const [existing] = await db.query(
      'SELECT id FROM parents WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash the password — never store plain text passwords
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into database
    const [result] = await db.query(
      'INSERT INTO parents (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    res.json({
  message: 'Account created successfully',
  parentId: result.insertId,
  name: name   // ✅ add this line
});

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login — parent logs in
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find parent by email
    const [rows] = await db.query(
      'SELECT * FROM parents WHERE email = ?', [email]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Email not found' });
    }

    const parent = rows[0];

    // Compare password with hashed password in database
    const isMatch = await bcrypt.compare(password, parent.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Wrong password' });
    }

    // Create JWT token — this is like a login pass
    const token = jwt.sign(
      { parentId: parent.id, email: parent.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Login successful',
      token: token,
      parent: { id: parent.id, name: parent.name, email: parent.email }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;