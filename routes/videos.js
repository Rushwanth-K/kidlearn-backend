const express = require('express');
const router = express.Router();
const db = require('../database');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your account credentials (server-side only, never exposed to frontend)
cloudinary.config({
  cloud_name: 'dh3whmccb',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
// Injects Cloudinary's automatic quality + format optimization into a video URL.
// This shrinks file size per view without a visible quality drop on phone screens.
function optimizeCloudinaryUrl(url) {
  if (!url) return url;
  return url.replace('/upload/', '/upload/q_auto,f_auto/');
}
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

// Apply automatic quality/format optimization to every video URL before sending
const optimizedVideos = videos.map(v => ({
  ...v,
  url: optimizeCloudinaryUrl(v.url)
}));

res.json(optimizedVideos);

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

    if (videos.length === 0) {
      return res.status(404).json({ error: 'Invalid school or class code' });
    }

    const optimizedVideos = videos.map(v => ({
  ...v,
  url: optimizeCloudinaryUrl(v.url)
}));

res.json(optimizedVideos);
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
router.post('/creator-upload', async (req, res) => {
  try {
    const { title, url, category, age_min, age_max, duration, is_short, creator_id, public_id } = req.body;

    if (!title || !url || !category || !creator_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await db.query(
      `INSERT INTO videos (title, url, category, age_min, age_max, duration, is_short, is_approved, creator_id, public_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [title, url, category, age_min, age_max, duration, is_short, creator_id, public_id]
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
router.post('/teacher-upload', async (req, res) => {
  try {
    const { title, url, category, school_id, standard_id, duration, teacher_id, public_id } = req.body;

    if (!title || !url || !category || !school_id || !standard_id || !teacher_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await db.query(
      `INSERT INTO school_videos (title, url, category, school_id, standard_id, duration, is_approved, teacher_id, public_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [title, url, category, school_id, standard_id, duration, teacher_id, public_id]
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

    // First, look up the video to get its Cloudinary public_id before deleting the row
    const [rows] = await db.query(
      'SELECT public_id FROM videos WHERE id = ? AND creator_id = ?',
      [videoId, creatorId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Video not found or you do not have permission to delete it' });
    }

    const publicId = rows[0].public_id;

    // Delete the database row
    await db.query(
      'DELETE FROM videos WHERE id = ? AND creator_id = ?',
      [videoId, creatorId]
    );

    // Delete the actual file from Cloudinary too, so storage doesn't pile up unused
    // resource_type: 'video' is required — Cloudinary defaults to 'image' otherwise
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      } catch (cloudinaryError) {
        // The database row is already deleted — log this but don't fail the whole request,
        // since the video is already gone from the app either way
        console.log('CLOUDINARY DELETE ERROR:', cloudinaryError.message);
      }
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

    const [rows] = await db.query(
      'SELECT public_id FROM school_videos WHERE id = ? AND teacher_id = ?',
      [videoId, teacherId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Video not found or you do not have permission to delete it' });
    }

    const publicId = rows[0].public_id;

    await db.query(
      'DELETE FROM school_videos WHERE id = ? AND teacher_id = ?',
      [videoId, teacherId]
    );

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      } catch (cloudinaryError) {
        console.log('CLOUDINARY DELETE ERROR:', cloudinaryError.message);
      }
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;