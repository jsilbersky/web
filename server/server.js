/* ========================================
   GAMINUTE - COMPLETE BACKEND SERVER
   Node.js + Express + SQLite
   ======================================== */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========== DATABASE SETUP ==========
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Initialize tables
db.serialize(() => {
  // Games table
  db.run(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    genre TEXT NOT NULL,
    tech TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    url TEXT,
    thumb TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Table creation error:', err);
  });

  // Contact submissions table
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Table creation error:', err);
  });
});

// ========== SEED DATA ==========
db.get("SELECT COUNT(*) as count FROM games", (err, row) => {
  if (err) {
    console.error('Seed check error:', err);
    return;
  }

  if (row && row.count === 0) {
    console.log('🌱 Seeding database with portfolio games...');
    
    const games = [
      {
        title: "Loading Rush",
        description: "Hyper-casual reflex test. Tap with millisecond precision to stop the loading bar at the perfect moment. Features anti-cheat logic, global leaderboards, and haptic feedback that responds to your accuracy.",
        genre: "arcade",
        tech: "canvas",
        version: "1.0.2",
        status: "Live",
        url: "https://play.google.com/store/apps/details?id=com.jsilb.loadingrush",
        thumb: "img/loadingwebimg.webp"
      },
      {
        title: "TicTacToe Lava",
        description: "Classic logic game with a chaotic twist. The board melts beneath you as tiles fall due to gravity, and you must survive the rising lava. Includes Daily Challenges, power-ups, and progressive difficulty modes.",
        genre: "puzzle",
        tech: "dom",
        version: "1.4.5",
        status: "In Dev",
        url: "",
        thumb: "img/lavawebimg.webp"
      },
      {
        title: "Neon Coil",
        description: "Modern survival arcade with 360-degree movement mechanics. Navigate through dynamic obstacles with glowing trail effects and starfield parallax backgrounds. Built with custom 2D rendering engine for maximum performance.",
        genre: "arcade",
        tech: "canvas",
        version: "0.9.0",
        status: "Prototype",
        url: "",
        thumb: "img/backgroundhero.webp"
      },
      {
        title: "Galaxiko Joystick",
        description: "High-speed 3D tunnel runner using math-based perspective projection. Test your reflexes in a neon void as the tunnel twists and accelerates. Features procedural generation and dynamic difficulty adjustment.",
        genre: "arcade",
        tech: "canvas",
        version: "0.5.0",
        status: "Concept",
        url: "",
        thumb: "img/galaxikowebimg.webp"
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO games (title, description, genre, tech, version, status, url, thumb)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    games.forEach(game => {
      stmt.run(
        game.title,
        game.description,
        game.genre,
        game.tech,
        game.version,
        game.status,
        game.url,
        game.thumb
      );
    });

    stmt.finalize((err) => {
      if (err) console.error('Seed error:', err);
      else console.log('✅ Database seeded with', games.length, 'games');
    });
  }
});

// ========== PUBLIC API ENDPOINTS ==========

/**
 * GET /api/stats
 * Returns portfolio statistics
 */
app.get('/api/stats', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as totalGames,
      SUM(CASE WHEN status = 'Live' THEN 1 ELSE 0 END) as liveGames,
      SUM(CASE WHEN status = 'In Dev' THEN 1 ELSE 0 END) as inDev,
      SUM(CASE WHEN status IN ('Prototype', 'Concept') THEN 1 ELSE 0 END) as concepts
    FROM games
  `;

  db.get(query, (err, row) => {
    if (err) {
      console.error('Stats query error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      totalGames: row.totalGames || 0,
      liveGames: row.liveGames || 0,
      inDev: row.inDev || 0,
      concepts: row.concepts || 0
    });
  });
});

/**
 * GET /api/games
 * Returns all games with optional filtering
 * Query params: search, genre, sort
 */
app.get('/api/games', (req, res) => {
  const { search, genre, sort } = req.query;
  
  let sql = "SELECT * FROM games WHERE 1=1";
  const params = [];

  // Genre filter
  if (genre && genre !== 'all') {
    sql += " AND genre = ?";
    params.push(genre);
  }

  // Search filter
  if (search) {
    sql += " AND (title LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  // Sorting
  if (sort === 'oldest') {
    sql += " ORDER BY id ASC";
  } else if (sort === 'alpha') {
    sql += " ORDER BY title ASC";
  } else {
    // Default: newest (Live first, then by ID desc)
    sql += " ORDER BY CASE status WHEN 'Live' THEN 0 WHEN 'In Dev' THEN 1 ELSE 2 END, id DESC";
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Games query error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Simulate network delay (for testing loading states)
    setTimeout(() => {
      res.json(rows || []);
    }, 200);
  });
});

/**
 * GET /api/games/:id
 * Returns single game by ID
 */
app.get('/api/games/:id', (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM games WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error('Game fetch error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(row);
  });
});

/**
 * POST /api/contact
 * Handles contact form submissions
 */
app.post('/api/contact', (req, res) => {
  const { email, message } = req.body;

  // Validation
  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (message.trim().length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters' });
  }

  // Save to database
  const stmt = db.prepare("INSERT INTO contacts (email, message) VALUES (?, ?)");
  
  stmt.run(email, message.trim(), function(err) {
    if (err) {
      console.error('Contact save error:', err);
      return res.status(500).json({ error: 'Failed to save message' });
    }

    console.log(`📧 New contact submission from ${email} (ID: ${this.lastID})`);
    
    res.json({
      success: true,
      message: 'Message received successfully',
      id: this.lastID
    });
  });

  stmt.finalize();
});

// ========== HIDDEN TEST ENDPOINTS ==========
// These are for Playwright/Postman testing, not exposed in UI

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /api/test/slow
 * Simulates slow API response (for timeout testing)
 */
app.get('/api/test/slow', (req, res) => {
  const delay = parseInt(req.query.delay) || 3000;
  
  setTimeout(() => {
    res.json({
      message: 'This response was delayed',
      delay: delay
    });
  }, delay);
});

/**
 * GET /api/test/error
 * Simulates server error (for error handling testing)
 */
app.get('/api/test/error', (req, res) => {
  res.status(500).json({
    error: 'Simulated server error',
    code: 'TEST_ERROR'
  });
});

/**
 * POST /api/test/reset
 * Resets database to initial seed state (for test isolation)
 */
app.post('/api/test/reset', (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  db.serialize(() => {
    db.run("DELETE FROM games");
    db.run("DELETE FROM contacts");
    
    // Re-seed games
    const games = [
      ["Loading Rush", "Hyper-casual reflex test...", "arcade", "canvas", "1.0.2", "Live", "https://play.google.com/store/apps/details?id=com.jsilb.loadingrush", "img/loadingwebimg.webp"],
      ["TicTacToe Lava", "Classic logic game...", "puzzle", "dom", "1.4.5", "In Dev", "", "img/lavawebimg.webp"],
      ["Neon Coil", "Modern survival arcade...", "arcade", "canvas", "0.9.0", "Prototype", "", "img/backgroundhero.webp"],
      ["Galaxiko Joystick", "High-speed 3D tunnel...", "arcade", "canvas", "0.5.0", "Concept", "", "img/galaxikowebimg.webp"]
    ];

    const stmt = db.prepare("INSERT INTO games (title, description, genre, tech, version, status, url, thumb) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    games.forEach(game => stmt.run(game));
    stmt.finalize();

    res.json({ success: true, message: 'Database reset to seed state' });
  });
});

/**
 * GET /api/test/contacts
 * Returns all contact submissions (for testing)
 */
app.get('/api/test/contacts', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  db.all("SELECT * FROM contacts ORDER BY submitted_at DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
  // Serve index.html for all non-API routes (SPA fallback)
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========== SERVER START ==========
const server = app.listen(PORT, () => {
  console.log('\n🚀 Gaminute Server Running');
  console.log('================================');
  console.log(`📍 Local:   http://localhost:${PORT}`);
  console.log(`🎮 Public:  http://localhost:${PORT}/`);
  console.log(`🔌 API:     http://localhost:${PORT}/api/`);
  console.log(`🧪 Health:  http://localhost:${PORT}/api/health`);
  console.log('================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      console.log('Database connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  Server interrupted, shutting down...');
  server.close(() => {
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      console.log('✅ Database connection closed');
      process.exit(0);
    });
  });
});

// ========== EXPORTS FOR TESTING ==========
module.exports = { app, db };