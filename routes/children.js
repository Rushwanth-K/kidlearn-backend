const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /api/children/add — parent adds a child profile
router.post('/add', async (req, res) => {
  try {
    const { parent_id, name, age, pin, interests, avatar } = req.body;

    const [result] = await db.query(
      'INSERT INTO children (parent_id, name, age, pin, interests, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [parent_id, name, age, pin || '0000', interests || '', avatar || 1]
    );

    res.json({
      message: 'Child profile created successfully',
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

// PUT /api/children/:childId — update child profile
router.put('/:childId', async (req, res) => {
  try {
    const { name, age, interests, avatar } = req.body;

    await db.query(
      'UPDATE children SET name = ?, age = ?, interests = ?, avatar = ? WHERE id = ?',
      [name, age, interests, avatar, req.params.childId]
    );

    res.json({ message: 'Child profile updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/children/:childId — delete child profile
router.delete('/:childId', async (req, res) => {
  try {
    await db.query('DELETE FROM children WHERE id = ?', [req.params.childId]);
    res.json({ message: 'Child profile deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;