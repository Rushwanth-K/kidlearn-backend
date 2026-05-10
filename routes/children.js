const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /api/children/add — parent adds a child profile
router.post('/add', async (req, res) => {
  try {
    const { parent_id, name, age, pin } = req.body;

    const [result] = await db.query(
      'INSERT INTO children (parent_id, name, age, pin) VALUES (?, ?, ?, ?)',
      [parent_id, name, age, pin || '0000']
    );

    res.json({
      message: 'Child profile created',
      childId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/children/:parentId — get all children for a parent
router.get('/:parentId', async (req, res) => {
  try {
    const [children] = await db.query(
      'SELECT * FROM children WHERE parent_id = ?',
      [req.params.parentId]
    );
    res.json(children);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;