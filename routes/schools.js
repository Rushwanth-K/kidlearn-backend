// schools.js — handles school registration for teachers
// A teacher must register their school here BEFORE they can sign up

const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /api/schools/register — register a new school
router.post('/register', async (req, res) => {
  try {
    const { school_id } = req.body;

    if (!school_id || school_id.trim() === '') {
      return res.status(400).json({ error: 'School ID is required' });
    }

    // Check if this school_id already exists (case-insensitive)
    // We use LOWER() on both sides so "Sevai School" and "sevai school" are treated as duplicates
    const [existing] = await db.query(
      'SELECT id FROM schools WHERE LOWER(school_id) = LOWER(?)', [school_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'This school ID is already taken by another school. Please choose a different one.' });
    }

    // Insert the new school
    const [result] = await db.query(
      'INSERT INTO schools (school_id) VALUES (?)', [school_id]
    );

    res.json({
      message: 'School registered successfully',
      schoolDbId: result.insertId,   // the auto-increment id (internal use)
      schoolId: school_id            // the actual school_id text they typed
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schools/check/:schoolId — check if a school_id is available (optional, used for live validation in the form)
router.get('/check/:schoolId', async (req, res) => {
  try {
    const { schoolId } = req.params;

    const [existing] = await db.query(
      'SELECT id FROM schools WHERE LOWER(school_id) = LOWER(?)', [schoolId]
    );

    res.json({ available: existing.length === 0 });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;