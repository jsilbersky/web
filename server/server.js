/* ========================================
   GAMINUTE - STATIC SERVER (NO DATABASE)
   Node.js + Express (Vercel Compatible)
   ======================================== */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== DATA (Místo databáze) ==========
// Data jsou nyní "natvrdo" v kódu, aby se načetla bez SQLite
const PORTFOLIO_GAMES = [
  {
    id: 1,
    title: "Loading Rush",
    description: "Hyper-casual reflex test. Tap with millisecond precision to stop the loading bar at the perfect moment. Features anti-cheat logic, global leaderboards, and haptic feedback that responds to your accuracy.",
    genre: "arcade",
    tech: "canvas",
    version: "1.0.2",
    status: "Live",
    url: "https://play.google.com/store/apps/details?id=com.jsilb.loadingrush",
    thumb: "img/loadingwebimg.webp",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: "TicTacToe Lava",
    description: "Classic logic game with a chaotic twist. The board melts beneath you as tiles fall due to gravity, and you must survive the rising lava. Includes Daily Challenges, power-ups, and progressive difficulty modes.",
    genre: "puzzle",
    tech: "dom",
    version: "1.4.5",
    status: "In Dev",
    url: "",
    thumb: "img/lavawebimg.webp",
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    title: "Neon Coil",
    description: "Modern survival arcade with 360-degree movement mechanics. Navigate through dynamic obstacles with glowing trail effects and starfield parallax backgrounds. Built with custom 2D rendering engine for maximum performance.",
    genre: "arcade",
    tech: "canvas",
    version: "0.9.0",
    status: "Prototype",
    url: "",
    thumb: "img/backgroundhero.webp",
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    title: "Galaxiko Joystick",
    description: "High-speed 3D tunnel runner using math-based perspective projection. Test your reflexes in a neon void as the tunnel twists and accelerates. Features procedural generation and dynamic difficulty adjustment.",
    genre: "arcade",
    tech: "canvas",
    version: "0.5.0",
    status: "Concept",
    url: "",
    thumb: "img/galaxikowebimg.webp",
    created_at: new Date().toISOString()
  }
];

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json());
// Servírování statických souborů (obrázky, css, html)
app.use(express.static(path.join(__dirname, '../public')));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========== PUBLIC API ENDPOINTS ==========

/**
 * GET /api/stats
 * Vrací statistiky (počítáno z pole PORTFOLIO_GAMES)
 */
app.get('/api/stats', (req, res) => {
  const stats = {
    totalGames: PORTFOLIO_GAMES.length,
    liveGames: PORTFOLIO_GAMES.filter(g => g.status === 'Live').length,
    inDev: PORTFOLIO_GAMES.filter(g => g.status === 'In Dev').length,
    concepts: PORTFOLIO_GAMES.filter(g => ['Prototype', 'Concept'].includes(g.status)).length
  };
  res.json(stats);
});

/**
 * GET /api/games
 * Vrací všechny hry s možností filtrování
 */
app.get('/api/games', (req, res) => {
  const { search, genre, sort } = req.query;
  
  let results = [...PORTFOLIO_GAMES];

  // Genre filter
  if (genre && genre !== 'all') {
    results = results.filter(g => g.genre === genre);
  }

  // Search filter
  if (search) {
    const term = search.toLowerCase();
    results = results.filter(g => 
      g.title.toLowerCase().includes(term) || 
      g.description.toLowerCase().includes(term)
    );
  }

  // Sorting (jednoduchá implementace)
  if (sort === 'oldest') {
    results.sort((a, b) => a.id - b.id);
  } else if (sort === 'alpha') {
    results.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // Default: Live first
    const statusOrder = { 'Live': 0, 'In Dev': 1, 'Prototype': 2, 'Concept': 3 };
    results.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));
  }

  // Simulate delay
  setTimeout(() => {
    res.json(results);
  }, 200);
});

/**
 * GET /api/games/:id
 */
app.get('/api/games/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const game = PORTFOLIO_GAMES.find(g => g.id === id);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(game);
});

/**
 * POST /api/contact
 * Přijme zprávu, ale jen ji vypíše do logu (neukládá do DB)
 */
app.post('/api/contact', (req, res) => {
  const { email, message } = req.body;

  // Validation
  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  console.log(`📧 FAKE EMAIL SENT: From ${email}, Msg: ${message}`);
  
  // Vrátíme úspěch, aby frontend nehlásil chybu
  res.json({
    success: true,
    message: 'Message received (Simulation)',
    id: Date.now()
  });
});

// ========== SYSTEM ENDPOINTS ==========

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'static-no-db' });
});

// 404 handler
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// ========== SERVER START (Vercel Compatible) ==========

// Exportujeme aplikaci pro Vercel
module.exports = app;

// Server spustíme pouze pokud běžíme lokálně (ne jako modul)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running in STATIC mode on http://localhost:${PORT}`);
  });
}