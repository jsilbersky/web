/* ========================================
   GAMINUTE - STATIC SERVER (NO DATABASE)
   Node.js + Express (Vercel Compatible)
   ======================================== */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== DATA ==========
const PORTFOLIO_GAMES = [
  {
    id: 1,
    title: "Loading Rush",
    description: "Hyper-casual reflex test. Tap with millisecond precision to stop the loading bar at the perfect moment. Features anti-cheat logic, global leaderboards, and haptic feedback that responds to your accuracy.",
    genre: "arcade",
    tech: "canvas",
    version: "1.0.2",
    status: "Live",
    priority: 1, // ← Nižší = vyšší priorita (první na webu)
    url: "https://play.google.com/store/apps/details?id=com.jsilb.loadingrush",
    thumb: "img/loadingwebimg.webp",
    created_at: "2024-01-15T10:00:00Z"
  },
  {
    id: 2,
    title: "TicTacToe Lava",
    description: "Classic logic game with a chaotic twist. The board melts beneath you as tiles fall due to gravity, and you must survive the rising lava. Includes Daily Challenges, power-ups, and progressive difficulty modes.",
    genre: "puzzle",
    tech: "dom",
    version: "1.4.5",
    status: "In Dev",
    priority: 2,
    url: "",
    thumb: "img/lavawebimg.webp",
    created_at: "2024-03-20T10:00:00Z"
  },
  {
    id: 3,
    title: "Neon Coil",
    description: "Modern survival arcade with 360-degree movement mechanics. Navigate through dynamic obstacles with glowing trail effects and starfield parallax backgrounds. Built with custom 2D rendering engine for maximum performance.",
    genre: "arcade",
    tech: "canvas",
    version: "0.9.0",
    status: "Concept",
    priority: 5,
    url: "",
    thumb: "img/backgroundhero.webp",
    created_at: "2024-05-10T10:00:00Z"
  },
  {
    id: 4,
    title: "Galaxiko Joystick",
    description: "High-speed 3D tunnel runner using math-based perspective projection. Test your reflexes in a neon void as the tunnel twists and accelerates. Features procedural generation and dynamic difficulty adjustment.",
    genre: "arcade",
    tech: "canvas",
    version: "0.5.0",
    status: "In Dev",
    priority: 3,
    url: "",
    thumb: "img/galaxikowebimg.webp",
    created_at: "2024-08-15T10:00:00Z"
  },
  {
    id: 5,
    title: "Shape Slash",
    description: "Swipe to connect matching shapes and clear the board in this fast-paced puzzle game. Unlock special power-ups to freeze time and create massive combos. Race against the clock to set new high scores before time runs out.",
    genre: "puzzle",
    tech: "canvas",
    version: "0.8.0",
    status: "In Dev",
    priority: 4,
    url: "",
    thumb: "img/shapeslash.webp",
    created_at: "2024-11-10T10:00:00Z"
  }
];

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========== API ENDPOINTS ==========

// GET /api/games - Hlavní endpoint pro načtení her
app.get('/api/games', (req, res) => {
  const { search, genre, sort } = req.query;
  
  let results = [...PORTFOLIO_GAMES];

  // Filtr podle žánru
  if (genre && genre !== 'all') {
    results = results.filter(g => g.genre === genre);
  }

  // Filtr podle vyhledávání
  if (search) {
    const term = search.toLowerCase();
    results = results.filter(g => 
      g.title.toLowerCase().includes(term) || 
      g.description.toLowerCase().includes(term)
    );
  }

  // Řazení
  if (sort === 'oldest') {
    results.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (sort === 'alpha') {
    results.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // Default: Řazení podle statusu a priority
    const statusOrder = { 'Live': 0, 'In Dev': 1, 'Concept': 2 };
    
    results.sort((a, b) => {
      const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      
      // 1. Primární řazení: podle statusu (Live > In Dev > Concept)
      if (statusDiff !== 0) {
        return statusDiff;
      }
      
      // 2. Sekundární řazení: podle priority (nižší číslo = vyšší priorita)
      return (a.priority || 999) - (b.priority || 999);
    });
  }

  setTimeout(() => {
    res.json(results);
  }, 100);
});

// GET /api/stats - Statistiky portfolia
app.get('/api/stats', (req, res) => {
  const stats = {
    totalGames: PORTFOLIO_GAMES.length,
    liveGames: PORTFOLIO_GAMES.filter(g => g.status === 'Live').length,
    inDev: PORTFOLIO_GAMES.filter(g => g.status === 'In Dev').length,
    concepts: PORTFOLIO_GAMES.filter(g => g.status === 'Concept').length
  };
  res.json(stats);
});

// POST /api/contact - Kontaktní formulář
app.post('/api/contact', async (req, res) => {
  const { email, message } = req.body;

  // Validace vstupů
  if (!email || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and message are required fields.' 
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid email format provided.' 
    });
  }

  if (message.trim().length < 10) {
    return res.status(400).json({ 
      success: false, 
      error: 'Message must be at least 10 characters long.' 
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'gaminutestudio@gmail.com',
      replyTo: email,
      subject: `🎮 Gaminute Portfolio: New Message from ${email}`,
      text: `Name/Email: ${email}\n\nMessage:\n${message}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="background: #f0f0f0; padding: 10px; border-left: 4px solid #00d4ff;">
          ${message.replace(/\n/g, '<br>')}
        </blockquote>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully from ${email}`);

    res.status(200).json({
      success: true,
      message: 'Email has been sent successfully.',
      id: Date.now()
    });

  } catch (error) {
    console.error('❌ Email send error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email via SMTP provider.'
    });
  }
});

// GET /api/health - Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: 'static-no-db-email-enabled',
    timestamp: new Date().toISOString(),
    games: PORTFOLIO_GAMES.length
  });
});

// Fallback pro SPA routing
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// Export pro Vercel
module.exports = app;

// Local development server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Total games: ${PORTFOLIO_GAMES.length}`);
    console.log(`✅ Live games: ${PORTFOLIO_GAMES.filter(g => g.status === 'Live').length}`);
    console.log(`🔧 In Dev: ${PORTFOLIO_GAMES.filter(g => g.status === 'In Dev').length}`);
    console.log(`💡 Concepts: ${PORTFOLIO_GAMES.filter(g => g.status === 'Concept').length}`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("⚠️  WARNING: EMAIL_USER or EMAIL_PASS missing in .env file. Emails will fail.");
    }
  });
}