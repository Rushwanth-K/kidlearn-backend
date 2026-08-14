// teachers.js — handles teacher register and login
// A teacher must belong to an already-registered school (see schools.js)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

// POST /api/teachers/register — teacher creates account under an existing school
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, school_id } = req.body;

    if (!name || !email || !password || !school_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Confirm the school actually exists (must be registered first via /api/schools/register)
    const [school] = await db.query(
      'SELECT id FROM schools WHERE LOWER(school_id) = LOWER(?)', [school_id]
    );
    if (school.length === 0) {
      return res.status(400).json({ error: 'School not found. Please register your school first.' });
    }

    // Check if email already exists
    const [existing] = await db.query(
      'SELECT id FROM teachers WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the teacher, linked to the school_id text
    const [result] = await db.query(
      'INSERT INTO teachers (name, email, password, school_id) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, school_id]
    );

    res.json({
      message: 'Teacher account created successfully',
      teacherId: result.insertId,
      name: name,
      schoolId: school_id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/teachers/login — teacher logs in
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM teachers WHERE email = ?', [email]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Email not found' });
    }

    const teacher = rows[0];

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Wrong password' });
    }

    // JWT includes teacherId and schoolId — every upload request will carry this
    const token = jwt.sign(
      { teacherId: teacher.id, schoolId: teacher.school_id, email: teacher.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email, schoolId: teacher.school_id }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;