const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/videos — fetch videos with optional filters
router.get('/', async (req, res) => {
  try {
    const { age, category } = req.query;

    let query = 'SELECT * FROM videos WHERE is_approved = 1';
    let params = [];

    if (age) {
      query += ' AND age_min <= ? AND age_max >= ?';
      params.push(age, age);
    }

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const [videos] = await db.query(query, params);
    res.json(videos);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/videos/history — log a video play
router.post('/history', async (req, res) => {
  try {
    const { child_id, video_id, duration_watched } = req.body;

    await db.query(
      'INSERT INTO watch_history (child_id, video_id, duration_watched) VALUES (?, ?, ?)',
      [child_id, video_id, duration_watched || 0]
    );

    res.json({ message: 'Watch history saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/videos/history/:parentId — get watch history for parent
router.get('/history/:parentId', async (req, res) => {
  try {
    const { parentId } = req.params;

    const [history] = await db.query(`
       SELECT 
        wh.id,
        wh.watched_at,
        wh.duration_watched,
        v.title,
        v.category,
        v.duration,
        v.url,
        c.name as child_name
      FROM watch_history wh
      JOIN videos v ON wh.video_id = v.id
      JOIN children c ON wh.child_id = c.id
      WHERE c.parent_id = ?
      ORDER BY wh.watched_at DESC
    `, [parentId]);

    res.json(history);
  } catch (error) {
    console.log('HISTORY ERROR:', error.message);
res.status(500).json({ error: error.message });
  }
});

// GET /api/videos/screentime/:childId — get screen time for today
router.get('/screentime/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await db.query(
      'SELECT * FROM screen_time WHERE child_id = ? AND date = ?',
      [childId, today]
    );

    if (rows.length === 0) {
      // Create today's record if not exists
      await db.query(
        'INSERT INTO screen_time (child_id, date, total_seconds, limit_seconds) VALUES (?, ?, 0, 2700)',
        [childId, today]
      );
      res.json({ total_seconds: 0, limit_seconds: 2700 });
    } else {
      res.json(rows[0]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/videos/screentime/:childId — update screen time limit
router.put('/screentime/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    const { limit_seconds } = req.body;
    const today = new Date().toISOString().split('T')[0];

    await db.query(
      `INSERT INTO screen_time (child_id, date, total_seconds, limit_seconds) 
       VALUES (?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE limit_seconds = ?`,
      [childId, today, limit_seconds, limit_seconds]
    );

    res.json({ message: 'Screen time limit updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// GET /api/videos/school/:schoolId/:standardId — get school videos by standard ID
router.get('/school/:schoolId/:standardId', async (req, res) => {
  try {
    const { schoolId, standardId } = req.params;

    const [videos] = await db.query(`
      SELECT * FROM school_videos 
      WHERE school_id = ? AND standard_id = ? AND is_approved = 1
      ORDER BY created_at DESC
    `, [schoolId, standardId]);

    // ✅ If no videos found — invalid code
    if (videos.length === 0) {
      return res.status(404).json({ error: 'Invalid school or class code' });
    }

    res.json(videos);
  } catch (error) {
    console.log('SCHOOL VIDEOS ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/videos/school/link — link child to school standard
router.post('/school/link', async (req, res) => {
  try {
    const { child_id, standard_id } = req.body;

    await db.query(
      'UPDATE children SET standard_id = ? WHERE id = ?',
      [standard_id, child_id]
    );

    res.json({ message: 'School linked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/videos/creator-upload — content creator uploads a video
// The video file was already uploaded to Cloudinary by the React portal;
// this route just saves the returned URL + metadata into MySQL
router.post('/creator-upload', async (req, res) => {
  try {
    const { title, url, category, age_min, age_max, duration, is_short, creator_id } = req.body;

    if (!title || !url || !category || !creator_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await db.query(
      `INSERT INTO videos (title, url, category, age_min, age_max, duration, is_short, is_approved, creator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [title, url, category, age_min, age_max, duration, is_short, creator_id]
    );

    res.json({
      message: 'Video uploaded successfully',
      videoId: result.insertId
    });
  } catch (error) {
    console.log('CREATOR UPLOAD ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/videos/teacher-upload — teacher uploads a video for their school
// The video file was already uploaded to Cloudinary by the React portal;
// this route just saves the returned URL + metadata into MySQL
router.post('/teacher-upload', async (req, res) => {
  try {
    const { title, url, category, school_id, standard_id, duration, teacher_id } = req.body;

    if (!title || !url || !category || !school_id || !standard_id || !teacher_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await db.query(
      `INSERT INTO school_videos (title, url, category, school_id, standard_id, duration, is_approved, teacher_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [title, url, category, school_id, standard_id, duration, teacher_id]
    );

    res.json({
      message: 'Video uploaded successfully',
      videoId: result.insertId
    });
  } catch (error) {
    console.log('TEACHER UPLOAD ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});
// GET /api/videos/my-uploads/:creatorId — list a creator's own uploaded videos
router.get('/my-uploads/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    const [videos] = await db.query(
      'SELECT * FROM videos WHERE creator_id = ? ORDER BY created_at DESC',
      [creatorId]
    );

    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/videos/my-uploads/:creatorId/:videoId — creator deletes their own video
router.delete('/my-uploads/:creatorId/:videoId', async (req, res) => {
  try {
    const { creatorId, videoId } = req.params;

    // Only delete if this video actually belongs to this creator —
    // prevents a creator from deleting someone else's video by guessing an ID
    const [result] = await db.query(
      'DELETE FROM videos WHERE id = ? AND creator_id = ?',
      [videoId, creatorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Video not found or you do not have permission to delete it' });
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/videos/teacher-uploads/:teacherId — list a teacher's own uploaded videos
router.get('/teacher-uploads/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;

    const [videos] = await db.query(
      'SELECT * FROM school_videos WHERE teacher_id = ? ORDER BY created_at DESC',
      [teacherId]
    );

    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/videos/teacher-uploads/:teacherId/:videoId — teacher deletes their own video
router.delete('/teacher-uploads/:teacherId/:videoId', async (req, res) => {
  try {
    const { teacherId, videoId } = req.params;

    const [result] = await db.query(
      'DELETE FROM school_videos WHERE id = ? AND teacher_id = ?',
      [videoId, teacherId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Video not found or you do not have permission to delete it' });
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;