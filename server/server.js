/* ========================================
   GAMINUTE - STATIC SERVER (NO DATABASE)
   Node.js + Express (Vercel Compatible)
   ======================================== */

// Načtení proměnných prostředí (pro bezpečné heslo k emailu)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer'); // Přidáno pro odesílání emailů

const app = express();
const PORT = process.env.PORT || 3000;

// ========== DATA (Místo databáze) ==========
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
// Servírování statických souborů z veřejné složky
app.use(express.static(path.join(__dirname, '../public')));

// Logování požadavků (pro debug a testování)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========== API ENDPOINTS ==========

/**
 * GET /api/stats
 * Vrací statistiky vypočítané ze statického pole
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
 * Vrací hry s možností filtrování
 */
app.get('/api/games', (req, res) => {
  const { search, genre, sort } = req.query;
  
  let results = [...PORTFOLIO_GAMES];

  // Filtr podle žánru
  if (genre && genre !== 'all') {
    results = results.filter(g => g.genre === genre);
  }

  // Vyhledávání
  if (search) {
    const term = search.toLowerCase();
    results = results.filter(g => 
      g.title.toLowerCase().includes(term) || 
      g.description.toLowerCase().includes(term)
    );
  }

  // Řazení
  if (sort === 'oldest') {
    results.sort((a, b) => a.id - b.id);
  } else if (sort === 'alpha') {
    results.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // Default: Live první, pak podle priority statusu
    const statusOrder = { 'Live': 0, 'In Dev': 1, 'Prototype': 2, 'Concept': 3 };
    results.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));
  }

  setTimeout(() => {
    res.json(results);
  }, 100);
});

/**
 * GET /api/games/:id
 * Najde jednu hru podle ID
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
 * Odeslání skutečného emailu pomocí Nodemailer
 * Slouží i pro testování QA scénářů (validace, error handling)
 */
app.post('/api/contact', async (req, res) => {
  const { email, message } = req.body;

  // 1. Validace vstupů (Test: HTTP 400)
  if (!email || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and message are required fields.' 
    });
  }

  // 2. Validace formátu emailu (Test: HTTP 400 regex check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid email format provided.' 
    });
  }

  try {
    // Konfigurace transportéru pro Gmail
    // Údaje se načítají z .env souboru (bezpečnost)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // gaminutestudio@gmail.com
        pass: process.env.EMAIL_PASS  // Heslo aplikace (ne tvoje osobní heslo!)
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER, // Odesílatel musí být autentikovaný účet (Gmail politika)
      to: 'gaminutestudio@gmail.com', // Kam má zpráva přijít
      replyTo: email, // Když dáš v Gmailu "Odpovědět", půjde to na email uživatele
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

    // Odeslání emailu
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully from ${email}`);

    // Úspěšná odpověď (Test: HTTP 200)
    res.status(200).json({
      success: true,
      message: 'Email has been sent successfully.',
      id: Date.now()
    });

  } catch (error) {
    console.error('❌ Email send error:', error);
    
    // Chyba serveru/SMTP (Test: HTTP 500)
    res.status(500).json({
      success: false,
      error: 'Failed to send email via SMTP provider.'
    });
  }
});

// ========== SYSTEM ENDPOINTS ==========

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'static-no-db-email-enabled' });
});

// 404 handler
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// ========== SERVER START ==========

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    if(!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("⚠️  WARNING: EMAIL_USER or EMAIL_PASS missing in .env file. Emails will fail.");
    }
  });
}