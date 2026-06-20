const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Database connection
const dbDir = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'database.db');
const db = new sqlite3.Database(dbPath);

// Migration check: Ensure mandal column exists in news table
db.serialize(() => {
  db.run("ALTER TABLE news ADD COLUMN mandal TEXT DEFAULT 'Nandyal Town'", (err) => {
    // Ignore error if column already exists
  });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: dbDir }),
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
app.use('/uploads', express.static(uploadsDir));

// Password Hashing Helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Configure Multer for File Uploads (Images and Videos)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Allow only images and videos
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed!'), false);
  }
};

// Multer instance for Admins/Reporters (200MB limit)
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 } 
});

// Multer instance for Public Tips (100MB limit to prevent disk fill-up attacks)
const tipUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Authentication Middlewares
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    // Check if user is active in DB
    db.get("SELECT status FROM users WHERE id = ?", [req.session.userId], (err, row) => {
      if (err || !row || row.status !== 'active') {
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
  db.get("SELECT id, name, username, role, status FROM users WHERE username = ? AND password = ?", [username, hashedPassword], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }
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
  });
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

  db.run(
    "INSERT INTO users (name, mobile, location, username, password, role, status) VALUES (?, ?, ?, ?, ?, 'reporter', 'pending')",
    [name, mobile, location, username, hashedPassword],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
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
  db.get("SELECT id FROM users WHERE id = ? AND password = ?", [req.session.userId, hashedCurrent], (err, row) => {
    if (err || !row) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const hashedNew = hashPassword(newPassword);
    db.run("UPDATE users SET password = ? WHERE id = ?", [hashedNew, req.session.userId], function(err) {
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
           (SELECT COUNT(*) FROM comments WHERE news_id = n.id) as comment_count
    FROM news n 
    LEFT JOIN users u ON n.reporter_id = u.id 
    WHERE n.status = 'published'
  `;
  const params = [];

  // Limit feed to the last 30 days unless searching history
  if (!search) {
    query += ` AND n.created_at >= datetime('now', '-30 days')`;
  }

  if (category && category !== 'All') {
    query += ` AND n.category = ?`;
    params.push(category);
  }

  if (mandal && mandal !== 'All') {
    query += ` AND n.mandal = ?`;
    params.push(mandal);
  }

  if (search) {
    query += ` AND (n.title LIKE ? OR n.content LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY n.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching news.' });
    }
    res.json(rows);
  });
});

// Increment Views of an article
app.post('/api/news/view/:id', (req, res) => {
  const { id } = req.params;
  db.run("UPDATE news SET views = views + 1 WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error logging view.' });
    }
    res.json({ success: true });
  });
});

// Add News Post (Admin / Reporter)
app.post('/api/news', requireAuth, upload.single('media'), (req, res) => {
  const { title, content, category, mandal } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Title, content, and category are required.' });
  }

  let mediaPath = null;
  let mediaType = 'none';

  if (req.file) {
    mediaPath = `/uploads/${req.file.filename}`;
    const mimetype = req.file.mimetype;
    if (mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (mimetype.startsWith('video/')) {
      mediaType = 'video';
    }
  } else if (req.body.existing_media_path) {
    mediaPath = req.body.existing_media_path;
    mediaType = req.body.existing_media_type || 'image';
  }

  const targetMandal = mandal || 'Nandyal Town';

  // Admin posts go live instantly. Reporter posts require approval.
  const status = (req.session.role === 'admin') ? 'published' : 'pending';

  const query = "INSERT INTO news (title, content, media_path, media_type, category, reporter_id, status, mandal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  db.run(query, [title, content, mediaPath, mediaType, category, req.session.userId, status, targetMandal], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create news post.' });
    }
    res.status(201).json({
      success: true,
      message: (status === 'published') ? 'News published successfully!' : 'News submitted successfully for Admin approval.',
      postId: this.lastID,
      status: status
    });
  });
});

// Get articles written by the logged-in Reporter (Reporter Dashboard) or ALL news (Admin Dashboard)
app.get('/api/admin/news', requireAuth, (req, res) => {
  let query = `
    SELECT n.*, u.name as reporter_name,
           (SELECT COUNT(*) FROM comments WHERE news_id = n.id) as comment_count
    FROM news n 
    LEFT JOIN users u ON n.reporter_id = u.id
  `;
  const params = [];

  if (req.session.role === 'reporter') {
    query += ` WHERE n.reporter_id = ?`;
    params.push(req.session.userId);
  }

  query += ` ORDER BY n.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching dashboard news.' });
    }
    res.json(rows);
  });
});

// Approve/Publish a news article (Admin Only)
app.put('/api/admin/news/publish/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'published' or 'pending'

  if (status !== 'published' && status !== 'pending') {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  db.run("UPDATE news SET status = ? WHERE id = ?", [status, id], function(err) {
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
    db.run("DELETE FROM news WHERE id = ?", [id], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to delete post.' });
      res.json({ success: true, message: 'News article deleted.' });
    });
  } else {
    // Reporter can only delete their own PENDING articles
    db.run("DELETE FROM news WHERE id = ? AND reporter_id = ? AND status = 'pending'", [id, req.session.userId], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to delete post.' });
      if (this.changes === 0) {
        return res.status(403).json({ error: 'Cannot delete: Article either published or belongs to someone else.' });
      }
      res.json({ success: true, message: 'Draft deleted.' });
    });
  }
});

// ==========================================
// 3. AD MANAGER ENDPOINTS
// ==========================================

// Get Active Advertisements (Public)
app.get('/api/ads', (req, res) => {
  db.all("SELECT id, advertiser_name, image_path, link_url, position FROM ads WHERE status = 'active'", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error loading ads.' });
    }
    res.json(rows);
  });
});

// Get All Ads (Admin Only)
app.get('/api/admin/ads', requireAdmin, (req, res) => {
  db.all("SELECT * FROM ads ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error loading ads for dashboard.' });
    }
    res.json(rows);
  });
});

// Add Advertisement (Admin Only)
app.post('/api/admin/ads', requireAdmin, upload.single('media'), (req, res) => {
  const { advertiser_name, link_url, position } = req.body;
  if (!advertiser_name || !link_url || !position) {
    return res.status(400).json({ error: 'Advertiser name, target URL, and position slot are required.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Ad banner image is required.' });
  }

  const imagePath = `/uploads/${req.file.filename}`;

  db.run(
    "INSERT INTO ads (advertiser_name, image_path, link_url, position, status) VALUES (?, ?, ?, ?, 'active')",
    [advertiser_name, imagePath, link_url, position],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to save advertisement.' });
      res.status(201).json({ success: true, message: 'Ad created and activated successfully.' });
    }
  );
});

// Toggle Ad Status (Admin Only)
app.put('/api/admin/ads/status/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' or 'inactive'

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  db.run("UPDATE ads SET status = ? WHERE id = ?", [status, id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update ad status.' });
    res.json({ success: true, message: `Ad status updated to ${status}.` });
  });
});

// Delete Ad (Admin Only)
app.delete('/api/admin/ads/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM ads WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete advertisement.' });
    res.json({ success: true, message: 'Advertisement deleted.' });
  });
});

// Log click on Ad
app.post('/api/ads/click/:id', (req, res) => {
  const { id } = req.params;
  db.run("UPDATE ads SET clicks = clicks + 1 WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Error logging click.' });
    res.json({ success: true });
  });
});

// ==========================================
// TICKER MANAGER ENDPOINTS
// ==========================================

// Get Active Ticker Items (Public)
app.get('/api/ticker', (req, res) => {
  db.all("SELECT id, text FROM ticker WHERE active = 1 ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error loading ticker entries.' });
    }
    res.json(rows);
  });
});

// Get All Ticker Items (Admin Only)
app.get('/api/admin/ticker', requireAdmin, (req, res) => {
  db.all("SELECT * FROM ticker ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error loading database ticker list.' });
    }
    res.json(rows);
  });
});

// Add Ticker Item (Admin Only)
app.post('/api/admin/ticker', requireAdmin, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Ticker text announcement is required.' });
  }

  db.run("INSERT INTO ticker (text, active) VALUES (?, 1)", [text.trim()], function(err) {
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

  db.run("UPDATE ticker SET active = ? WHERE id = ?", [active, id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update ticker status.' });
    res.json({ success: true, message: 'Ticker announcement status updated.' });
  });
});

// Delete Ticker Item (Admin Only)
app.delete('/api/admin/ticker/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM ticker WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete ticker announcement.' });
    res.json({ success: true, message: 'Ticker announcement deleted.' });
  });
});

// ==========================================
// 4. REPORTER MANAGEMENT ENDPOINTS (Admin Only)
// ==========================================

// Get All Reporters
app.get('/api/admin/reporters', requireAdmin, (req, res) => {
  db.all("SELECT id, name, mobile, location, username, role, status, created_at FROM users WHERE role = 'reporter' ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error fetching reporters.' });
    res.json(rows);
  });
});

// Approve, Suspend, or Reject Reporter
app.put('/api/admin/reporters/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active', 'suspended', 'rejected'

  if (status !== 'active' && status !== 'suspended' && status !== 'rejected') {
    return res.status(400).json({ error: 'Invalid account status.' });
  }

  db.run("UPDATE users SET status = ? WHERE id = ?", [status, id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update reporter status.' });
    res.json({ success: true, message: `Reporter status updated to ${status}.` });
  });
});

// Delete Reporter Account
app.delete('/api/admin/reporters/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM users WHERE id = ? AND role = 'reporter'", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete account.' });
    res.json({ success: true, message: 'Reporter account deleted.' });
  });
});

// ==========================================
// 5. LOCAL DIRECTORY ENDPOINTS
// ==========================================

// Get Directory Listings
app.get('/api/directory', (req, res) => {
  db.all("SELECT * FROM directory ORDER BY is_featured DESC, business_name ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json(rows);
  });
});

// Add Directory Entry (Admin Only)
app.post('/api/admin/directory', requireAdmin, upload.single('media'), (req, res) => {
  const { business_name, description, category, phone, whatsapp, address, is_featured } = req.body;
  if (!business_name || !category) {
    return res.status(400).json({ error: 'Business name and category are required.' });
  }

  let imagePath = null;
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  }

  const featured = is_featured === 'true' || is_featured === '1' ? 1 : 0;

  db.run(
    "INSERT INTO directory (business_name, description, category, phone, whatsapp, address, image_path, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [business_name, description, category, phone, whatsapp, address, imagePath, featured],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to add directory entry.' });
      res.status(201).json({ success: true, message: 'Directory entry added successfully.' });
    }
  );
});

// Delete Directory Entry (Admin Only)
app.delete('/api/admin/directory/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM directory WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete directory entry.' });
    res.json({ success: true, message: 'Listing deleted.' });
  });
});

// ==========================================
// 6. COMMUNITY TIPS / SUBMISSIONS ENDPOINTS
// ==========================================

// User submits incident tip (Public)
app.post('/api/tips', tipUpload.single('media'), (req, res) => {
  const { name, contact, title, description } = req.body;
  if (!name || !contact || !title || !description) {
    return res.status(400).json({ error: 'Name, contact, title, and description are required.' });
  }

  let mediaPath = null;
  let mediaType = 'none';

  if (req.file) {
    mediaPath = `/uploads/${req.file.filename}`;
    const mimetype = req.file.mimetype;
    if (mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (mimetype.startsWith('video/')) {
      mediaType = 'video';
    }
  }

  db.run(
    "INSERT INTO tips (name, contact, title, description, media_path, media_type, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
    [name, contact, title, description, mediaPath, mediaType],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to record tip.' });
      res.status(201).json({ success: true, message: 'Thank you! Your news tip has been successfully submitted to Nandyal Times admins.' });
    }
  );
});

// Admin get tips
app.get('/api/admin/tips', requireAdmin, (req, res) => {
  db.all("SELECT * FROM tips ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error fetching tips.' });
    res.json(rows);
  });
});

// Admin update tip status (reviewed)
app.put('/api/admin/tips/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run("UPDATE tips SET status = 'reviewed' WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Database update failed.' });
    res.json({ success: true, message: 'Tip marked as reviewed.' });
  });
});

// Admin delete tip (Admin Only)
app.delete('/api/admin/tips/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM tips WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete report.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Report not found.' });
    res.json({ success: true, message: 'Report deleted successfully.' });
  });
});

// ==========================================
// 7. LIKES & COMMENTS ENDPOINTS
// ==========================================

// Get Reviewed Community Notices (Public)
app.get('/api/public-notices', (req, res) => {
  db.all("SELECT id, title, description, media_path, media_type, created_at FROM tips WHERE status = 'reviewed' ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch community notices.' });
    }
    res.json(rows);
  });
});

// Add like to article
app.post('/api/news/like/:id', (req, res) => {
  const { id } = req.params;
  db.run("UPDATE news SET likes = likes + 1 WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to record like.' });
    res.json({ success: true });
  });
});

// Get comments for an article
app.get('/api/news/comments/:news_id', (req, res) => {
  const { news_id } = req.params;
  db.all("SELECT * FROM comments WHERE news_id = ? ORDER BY created_at DESC", [news_id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error fetching comments.' });
    res.json(rows);
  });
});

// Add comment to an article
app.post('/api/news/comments/:news_id', (req, res) => {
  const { news_id } = req.params;
  const { author, content } = req.body;
  if (!author || !content) {
    return res.status(400).json({ error: 'Author and comment text are required.' });
  }
  db.run("INSERT INTO comments (news_id, author, content) VALUES (?, ?, ?)", [news_id, author, content], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to save comment.' });
    res.status(201).json({ success: true, commentId: this.lastID });
  });
});

// Global Error Handler for Multer errors and file validations
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Max allowed size is 200MB for news posts and 100MB for community tips.' });
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
