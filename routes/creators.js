// creators.js — handles content creator register and login
// Each creator picks a unique public creator_name, separate from their private name and email

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

// POST /api/creators/register — creator creates account
router.post('/register', async (req, res) => {
  try {
    const { creator_name, name, email, password } = req.body;

    if (!creator_name || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check creator_name uniqueness (case-insensitive) — this is the public identity check
    const [existingName] = await db.query(
      'SELECT id FROM content_creators WHERE LOWER(creator_name) = LOWER(?)', [creator_name]
    );
    if (existingName.length > 0) {
      return res.status(400).json({ error: 'This creator name is already taken. Please choose another.' });
    }

    // Check email uniqueness separately — this is the login/account identity check
    const [existingEmail] = await db.query(
      'SELECT id FROM content_creators WHERE email = ?', [email]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the creator
    const [result] = await db.query(
      'INSERT INTO content_creators (creator_name, name, email, password) VALUES (?, ?, ?, ?)',
      [creator_name, name, email, hashedPassword]
    );

    res.json({
      message: 'Creator account created successfully',
      creatorId: result.insertId,
      creatorName: creator_name
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/creators/login — creator logs in
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM content_creators WHERE email = ?', [email]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Email not found' });
    }

    const creator = rows[0];

    const isMatch = await bcrypt.compare(password, creator.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Wrong password' });
    }

    // JWT includes creatorId and creatorName — every video upload will be tagged with this
    const token = jwt.sign(
      { creatorId: creator.id, creatorName: creator.creator_name, email: creator.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      creator: { id: creator.id, creatorName: creator.creator_name, name: creator.name, email: creator.email }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;