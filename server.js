require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Password Hashing Helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Multer in-memory storage configuration
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit
});

// Helper to upload memory buffer to Cloudinary
async function uploadToCloudinary(file) {
  if (!file) return null;
  const dataURI = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  const result = await cloudinary.uploader.upload(dataURI, {
    resource_type: 'auto',
    folder: 'nandyal-times'
  });
  return result.secure_url;
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: 'nandyal-times-community-secret-98765',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day session
}));

// Disable caching for API routes
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middlewares
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    // Check if user is active in DB
    pool.query("SELECT status FROM users WHERE id = $1", [req.session.userId], (err, result) => {
      if (err || result.rows.length === 0 || result.rows[0].status !== 'active') {
        req.session.destroy();
        return res.status(401).json({ error: 'Unauthorized: Account is suspended or inactive.' });
      }
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized: Please log in.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }
}

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// Login User
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const hashedPassword = hashPassword(password);
  pool.query(
    "SELECT id, name, username, role, status FROM users WHERE username = $1 AND password = $2",
    [username, hashedPassword],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid username or password.' });
      }
      const row = result.rows[0];
      if (row.status !== 'active') {
        return res.status(403).json({ error: `Login failed: Your account status is currently '${row.status}'.` });
      }

      // Set session details
      req.session.userId = row.id;
      req.session.username = row.username;
      req.session.role = row.role;
      req.session.name = row.name;

      res.json({
        success: true,
        message: 'Logged in successfully.',
        user: { id: row.id, name: row.name, username: row.username, role: row.role }
      });
    }
  );
});

// Get Session Status
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        name: req.session.name,
        username: req.session.username,
        role: req.session.role
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed.' });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// Public Reporter Registration Form (Become a Reporter)
app.post('/api/auth/register-reporter', (req, res) => {
  const { name, mobile, location, username, password } = req.body;

  if (!name || !mobile || !location || !username || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const hashedPassword = hashPassword(password);

  pool.query(
    "INSERT INTO users (name, mobile, location, username, password, role, status) VALUES ($1, $2, $3, $4, $5, 'reporter', 'pending')",
    [name, mobile, location, username, hashedPassword],
    (err, result) => {
      if (err) {
        if (err.code === '23505') { // Postgres Unique Violation
          return res.status(400).json({ error: 'Username already exists. Please choose another one.' });
        }
        return res.status(500).json({ error: 'Failed to submit application.' });
      }
      res.status(201).json({
        success: true,
        message: 'Your application has been submitted! Admin will verify and activate your account shortly.'
      });
    }
  );
});

// Change Password
app.put('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  const hashedCurrent = hashPassword(currentPassword);
  pool.query("SELECT id FROM users WHERE id = $1 AND password = $2", [req.session.userId, hashedCurrent], (err, result) => {
    if (err || result.rows.length === 0) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const hashedNew = hashPassword(newPassword);
    pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedNew, req.session.userId], (err, updateResult) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update password.' });
      }
      res.json({ success: true, message: 'Password updated successfully!' });
    });
  });
});

// ==========================================
// 2. NEWS PORTAL ENDPOINTS
// ==========================================

// Get Published News (Public)
app.get('/api/news', (req, res) => {
  const { category, search, mandal } = req.query;
  let query = `
    SELECT n.*, u.name as reporter_name, u.location as reporter_location,
           (SELECT COUNT(*)::int FROM comments WHERE news_id = n.id) as comment_count
    FROM news n 
    LEFT JOIN users u ON n.reporter_id = u.id 
    WHERE n.status = 'published'
  `;
  const params = [];
  let pIndex = 1;

  // Limit feed to the last 30 days unless searching history
  if (!search) {
    query += ` AND n.created_at >= NOW() - INTERVAL '30 days'`;
  }

  if (category && category !== 'All') {
    query += ` AND n.category = $${pIndex++}`;
    params.push(category);
  }

  if (mandal && mandal !== 'All') {
    query += ` AND n.mandal = $${pIndex++}`;
    params.push(mandal);
  }

  if (search) {
    query += ` AND (n.title ILIKE $${pIndex} OR n.content ILIKE $${pIndex})`;
    pIndex++;
    params.push(`%${search}%`);
  }

  query += ` ORDER BY n.created_at DESC`;

  pool.query(query, params, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error fetching news.' });
    }
    res.json(result.rows);
  });
});

// Increment Views of an article
app.post('/api/news/view/:id', (req, res) => {
  const { id } = req.params;
  pool.query("UPDATE news SET views = views + 1 WHERE id = $1", [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging view.' });
    }
    res.json({ success: true });
  });
});

// Add News Post (Admin / Reporter)
app.post('/api/news', requireAuth, upload.single('media'), async (req, res) => {
  const { title, content, category, mandal } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Title, content, and category are required.' });
  }

  let mediaPath = req.body.existing_media_path || null;
  let mediaType = req.body.existing_media_type || 'none';

  if (req.file) {
    try {
      mediaPath = await uploadToCloudinary(req.file);
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    } catch (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ error: 'Failed to upload media to Cloudinary.' });
    }
  }

  const targetMandal = mandal || 'Nandyal Town';

  // Admin posts go live instantly. Reporter posts require approval.
  const status = (req.session.role === 'admin') ? 'published' : 'pending';

  const query = "INSERT INTO news (title, content, media_path, media_type, category, reporter_id, status, mandal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id";
  pool.query(query, [title, content, mediaPath, mediaType, category, req.session.userId, status, targetMandal], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create news post.' });
    }
    res.status(201).json({
      success: true,
      message: (status === 'published') ? 'News published successfully!' : 'News submitted successfully for Admin approval.',
      postId: result.rows[0].id,
      status: status
    });
  });
});

// Get articles written by the logged-in Reporter (Reporter Dashboard) or ALL news (Admin Dashboard)
app.get('/api/admin/news', requireAuth, (req, res) => {
  let query = `
    SELECT n.*, u.name as reporter_name,
           (SELECT COUNT(*)::int FROM comments WHERE news_id = n.id) as comment_count
    FROM news n 
    LEFT JOIN users u ON n.reporter_id = u.id
  `;
  const params = [];

  if (req.session.role === 'reporter') {
    query += ` WHERE n.reporter_id = $1`;
    params.push(req.session.userId);
  }

  query += ` ORDER BY n.created_at DESC`;

  pool.query(query, params, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching dashboard news.' });
    }
    res.json(result.rows);
  });
});

// Approve/Publish a news article (Admin Only)
app.put('/api/admin/news/publish/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'published' or 'pending'

  if (status !== 'published' && status !== 'pending') {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  pool.query("UPDATE news SET status = $1 WHERE id = $2", [status, id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database update failed.' });
    }
    res.json({ success: true, message: `News status set to ${status}.` });
  });
});

// Delete a news article
app.delete('/api/news/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  if (req.session.role === 'admin') {
    // Admin can delete anything
    pool.query("DELETE FROM news WHERE id = $1", [id], (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to delete post.' });
      res.json({ success: true, message: 'News article deleted.' });
    });
  } else {
    // Reporter can only delete their own PENDING articles
    pool.query(
      "DELETE FROM news WHERE id = $1 AND reporter_id = $2 AND status = 'pending'",
      [id, req.session.userId],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to delete post.' });
        if (result.rowCount === 0) {
          return res.status(403).json({ error: 'Cannot delete: Article either published or belongs to someone else.' });
        }
        res.json({ success: true, message: 'Draft deleted.' });
      }
    );
  }
});

// ==========================================
// 3. AD MANAGER ENDPOINTS
// ==========================================

// Get Active Advertisements (Public)
app.get('/api/ads', (req, res) => {
  pool.query("SELECT id, advertiser_name, image_path, link_url, position, status FROM ads WHERE status = 'active'", [], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error loading ads.' });
    }
    res.json(result.rows);
  });
});

// Get All Ads (Admin Only)
app.get('/api/admin/ads', requireAdmin, (req, res) => {
  pool.query("SELECT * FROM ads ORDER BY created_at DESC", [], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error loading ads for dashboard.' });
    }
    res.json(result.rows);
  });
});

// Add Advertisement (Admin Only)
app.post('/api/admin/ads', requireAdmin, upload.single('media'), async (req, res) => {
  const { advertiser_name, link_url, position } = req.body;
  if (!advertiser_name || !link_url || !position) {
    return res.status(400).json({ error: 'Advertiser name, target URL, and position slot are required.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Ad banner image is required.' });
  }

  try {
    const imagePath = await uploadToCloudinary(req.file);
    pool.query(
      "INSERT INTO ads (advertiser_name, image_path, link_url, position, status) VALUES ($1, $2, $3, $4, 'active')",
      [advertiser_name, imagePath, link_url, position],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to save advertisement.' });
        res.status(201).json({ success: true, message: 'Ad created and activated successfully.' });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Cloudinary upload error' });
  }
});

// Toggle Ad Status (Admin Only)
app.put('/api/admin/ads/status/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' or 'inactive'

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  pool.query("UPDATE ads SET status = $1 WHERE id = $2", [status, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to update ad status.' });
    res.json({ success: true, message: `Ad status updated to ${status}.` });
  });
});

// Delete Ad (Admin Only)
app.delete('/api/admin/ads/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM ads WHERE id = $1", [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to delete advertisement.' });
    res.json({ success: true, message: 'Advertisement deleted.' });
  });
});

// Log click on Ad
app.post('/api/ads/click/:id', (req, res) => {
  const { id } = req.params;
  pool.query("UPDATE ads SET clicks = clicks + 1 WHERE id = $1", [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error logging click.' });
    res.json({ success: true });
  });
});

// ==========================================
// TICKER MANAGER ENDPOINTS
// ==========================================

// Get Active Ticker Items (Public)
app.get('/api/ticker', (req, res) => {
  pool.query("SELECT id, text FROM ticker WHERE active = 1 ORDER BY created_at DESC", [], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error loading ticker entries.' });
    }
    res.json(result.rows);
  });
});

// Get All Ticker Items (Admin Only)
app.get('/api/admin/ticker', requireAdmin, (req, res) => {
  pool.query("SELECT * FROM ticker ORDER BY created_at DESC", [], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error loading database ticker list.' });
    }
    res.json(result.rows);
  });
});

// Add Ticker Item (Admin Only)
app.post('/api/admin/ticker', requireAdmin, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Ticker text announcement is required.' });
  }

  pool.query("INSERT INTO ticker (text, active) VALUES ($1, 1)", [text.trim()], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to save ticker announcement.' });
    res.status(201).json({ success: true, message: 'Ticker announcement added successfully.' });
  });
});

// Toggle Ticker Status (Admin Only)
app.put('/api/admin/ticker/status/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { active } = req.body; // 1 or 0

  if (active !== 1 && active !== 0) {
    return res.status(400).json({ error: 'Invalid active status. Must be 1 or 0.' });
  }

  pool.query("UPDATE ticker SET active = $1 WHERE id = $2", [active, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to update ticker status.' });
    res.json({ success: true, message: 'Ticker announcement status updated.' });
  });
});

// Delete Ticker Item (Admin Only)
app.delete('/api/admin/ticker/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM ticker WHERE id = $1", [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to delete ticker announcement.' });
    res.json({ success: true, message: 'Ticker announcement deleted.' });
  });
});

// ==========================================
// 4. REPORTER MANAGEMENT ENDPOINTS (Admin Only)
// ==========================================

// Get All Reporters
app.get('/api/admin/reporters', requireAdmin, (req, res) => {
  pool.query("SELECT id, name, mobile, location, username, role, status, created_at FROM users WHERE role = 'reporter' ORDER BY created_at DESC", [], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error fetching reporters.' });
    res.json(result.rows);
  });
});

// Approve, Suspend, or Reject Reporter
app.put('/api/admin/reporters/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active', 'suspended', 'rejected'

  if (status !== 'active' && status !== 'suspended' && status !== 'rejected') {
    return res.status(400).json({ error: 'Invalid account status.' });
  }

  pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to update reporter status.' });
    res.json({ success: true, message: `Reporter status updated to ${status}.` });
  });
});

// Delete Reporter Account
app.delete('/api/admin/reporters/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM users WHERE id = $1 AND role = 'reporter'", [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to delete account.' });
    res.json({ success: true, message: 'Reporter account deleted.' });
  });
});

// ==========================================
// 5. LOCAL DIRECTORY ENDPOINTS
// ==========================================

// Get Directory Listings
app.get('/api/directory', (req, res) => {
  pool.query("SELECT * FROM directory ORDER BY is_featured DESC, business_name ASC", [], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json(result.rows);
  });
});

// Add Directory Entry (Admin Only)
app.post('/api/admin/directory', requireAdmin, upload.single('media'), async (req, res) => {
  const { business_name, description, category, phone, whatsapp, address, is_featured } = req.body;
  if (!business_name || !category) {
    return res.status(400).json({ error: 'Business name and category are required.' });
  }

  let imagePath = null;
  if (req.file) {
    try {
      imagePath = await uploadToCloudinary(req.file);
    } catch (err) {
      return res.status(500).json({ error: 'Cloudinary upload error' });
    }
  }

  const featured = is_featured === 'true' || is_featured === '1' ? 1 : 0;

  pool.query(
    "INSERT INTO directory (business_name, description, category, phone, whatsapp, address, image_path, is_featured) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [business_name, description, category, phone, whatsapp, address, imagePath, featured],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to add directory entry.' });
      res.status(201).json({ success: true, message: 'Directory entry added successfully.' });
    }
  );
});

// Delete Directory Entry (Admin Only)
app.delete('/api/admin/directory/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM directory WHERE id = $1", [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to delete directory entry.' });
    res.json({ success: true, message: 'Listing deleted.' });
  });
});

// ==========================================
// 6. COMMUNITY TIPS / SUBMISSIONS ENDPOINTS
// ==========================================

// User submits incident tip (Public)
app.post('/api/tips', upload.single('media'), async (req, res) => {
  const { name, contact, title, description } = req.body;
  if (!name || !contact || !title || !description) {
    return res.status(400).json({ error: 'Name, contact, title, and description are required.' });
  }

  let mediaPath = null;
  let mediaType = 'none';

  if (req.file) {
    try {
      mediaPath = await uploadToCloudinary(req.file);
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    } catch (err) {
      return res.status(500).json({ error: 'Failed to upload media.' });
    }
  }

  pool.query(
    "INSERT INTO tips (name, contact, title, description, media_path, media_type, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending')",
    [name, contact, title, description, mediaPath, mediaType],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to record tip.' });
      res.status(201).json({ success: true, message: 'Thank you! Your news tip has been successfully submitted to Nandyal Times admins.' });
    }
  );
});

// Admin get tips
app.get('/api/admin/tips', requireAdmin, (req, res) => {
  pool.query("SELECT * FROM tips ORDER BY created_at DESC", [], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error fetching tips.' });
    res.json(result.rows);
  });
});

// Admin update tip status (reviewed)
app.put('/api/admin/tips/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  pool.query("UPDATE tips SET status = 'reviewed' WHERE id = $1", [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database update failed.' });
    res.json({ success: true, message: 'Tip marked as reviewed.' });
  });
});

// Admin delete tip (Admin Only)
app.delete('/api/admin/tips/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM tips WHERE id = $1", [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to delete report.' });
    if (result.rowCount === 0) return res.status(404).json({ error: 'Report not found.' });
    res.json({ success: true, message: 'Report deleted successfully.' });
  });
});

// ==========================================
// 7. LIKES & COMMENTS ENDPOINTS
// ==========================================

// Get Reviewed Community Notices (Public)
app.get('/api/public-notices', (req, res) => {
  pool.query("SELECT id, title, description, media_path, media_type, created_at FROM tips WHERE status = 'reviewed' ORDER BY created_at DESC", [], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch community notices.' });
    }
    res.json(result.rows);
  });
});

// Add like to article
app.post('/api/news/like/:id', (req, res) => {
  const { id } = req.params;
  pool.query("UPDATE news SET likes = likes + 1 WHERE id = $1", [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to record like.' });
    res.json({ success: true });
  });
});

// Get comments for an article
app.get('/api/news/comments/:news_id', (req, res) => {
  const { news_id } = req.params;
  pool.query("SELECT * FROM comments WHERE news_id = $1 ORDER BY created_at DESC", [news_id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error fetching comments.' });
    res.json(result.rows);
  });
});

// Add comment to an article
app.post('/api/news/comments/:news_id', (req, res) => {
  const { news_id } = req.params;
  const { author, content } = req.body;
  if (!author || !content) {
    return res.status(400).json({ error: 'Author and comment text are required.' });
  }
  pool.query("INSERT INTO comments (news_id, author, content) VALUES ($1, $2, $3) RETURNING id", [news_id, author, content], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to save comment.' });
    res.status(201).json({ success: true, commentId: result.rows[0].id });
  });
});

// Global Error Handler for Multer errors and file validations
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Max allowed size is 200MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Start Server
app.listen(PORT, () => {
  console.log(`Nandyal Times dynamic server running on http://localhost:${PORT}`);
});
