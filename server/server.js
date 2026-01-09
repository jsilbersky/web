/* ========================================
   GAMINUTE - SERVER
   Production-ready Node.js backend
   ======================================== */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

// ========== CONFIGURATION ==========
const CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_TO: process.env.EMAIL_TO || 'gaminutestudio@gmail.com',
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }
};

// ========== DATA LAYER ==========
const PORTFOLIO_GAMES = [
  {
    id: 1,
    title: "Loading Rush",
    description: "Hyper-casual reflex test. Turn the most boring part of gaming into a neon timing challenge. A simple one-tap game where you finally get to control the progress bar.",
    genre: "arcade",
    tech: "canvas",
    version: "1.0.2",
    status: "Live",
    priority: 1,
    url: "https://play.google.com/store/apps/details?id=com.jsilb.loadingrush",
    thumb: "img/loadingwebimg.webp"
  },
  {
    id: 2,
    title: "Tic Tac Toe Lava",
    description: "Classic logic game with a chaotic twist. The board melts beneath you as tiles fall due to gravity, and you must survive the rising lava. Includes Daily Challenges, power-ups, and progressive difficulty modes.",
    genre: "puzzle",
    tech: "dom",
    version: "1.4.5",
    status: "Live",
    priority: 2,
    url: "https://play.google.com/store/apps/details?id=com.gaminute.tictactoelava",
    thumb: "img/lavawebimg.webp"
  },
  {
    id: 4,
    title: "Galaxiko Joystick",
    description: "Survival is simple: Match the color or crash. Pilot your ship through a neon tunnel that gets faster every second. Panic is your enemy, speed is your friend.",
    genre: "arcade",
    tech: "canvas",
    version: "0.5.0",
    status: "Live",
    priority: 3,
    url: "https://play.google.com/store/apps/details?id=com.gaminute.galaxikojoystick",
    thumb: "img/galaxikowebimg.webp"
  },
  {
    id: 5,
    title: "Shape Slash",
    description: "Swipe to connect matching shapes and clear the board in this fast-paced puzzle game. Unlock special power-ups to freeze time and create massive combos. Race against the clock to set new high scores before time runs out.",
    genre: "puzzle",
    tech: "canvas",
    version: "0.8.0",
    status: "Live",
    priority: 4,
    url: "https://play.google.com/store/apps/details?id=com.jsilbersky.shape",
    thumb: "img/shapeslash.webp"
  },
  {
    id: 3,
    title: "Neon Glide",
    description: "A modern twist on the classic Snake mechanic. Guide the glowing coil directly with your finger, collect parts to grow, and try not to crash into your own tail.",
    genre: "arcade",
    tech: "canvas",
    version: "0.9.0",
    status: "In Dev",
    priority: 5,
    url: "",
    thumb: "img/backgroundhero.webp"
  }
];

// ========== EMAIL SERVICE ==========
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  initialize() {
    if (!CONFIG.EMAIL_USER || !CONFIG.EMAIL_PASS) {
      console.warn('⚠️  Email not configured (missing EMAIL_USER or EMAIL_PASS)');
      return false;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: CONFIG.EMAIL_USER,
          pass: CONFIG.EMAIL_PASS
        }
      });
      this.isConfigured = true;
      console.log('✅ Email service configured');
      return true;
    } catch (error) {
      console.error('❌ Email service failed:', error.message);
      return false;
    }
  }

  async sendContactEmail(fromEmail, message) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: CONFIG.EMAIL_USER,
      to: CONFIG.EMAIL_TO,
      replyTo: fromEmail,
      subject: `🎮 Gaminute Contact: ${fromEmail}`,
      text: `From: ${fromEmail}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00d4ff; border-bottom: 2px solid #00d4ff; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          <div style="margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>From:</strong> ${fromEmail}</p>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #00d4ff; margin: 20px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent from Gaminute Portfolio - ${new Date().toLocaleString()}
          </p>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }
}

// ========== MIDDLEWARE ==========
const middleware = {
  // Security headers
  securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  },

  // No cache for API routes
  noCache(req, res, next) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  },

  // Request logging
  requestLogger(req, res, next) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`[${timestamp}] ${method} ${path} - ${ip}`);
    next();
  },

  // Simple rate limiting (in-memory)
  createRateLimiter() {
    const requests = new Map();
    
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      if (!requests.has(ip)) {
        requests.set(ip, []);
      }
      
      const userRequests = requests.get(ip);
      const recentRequests = userRequests.filter(
        time => now - time < CONFIG.RATE_LIMIT.windowMs
      );
      
      if (recentRequests.length >= CONFIG.RATE_LIMIT.maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.'
        });
      }
      
      recentRequests.push(now);
      requests.set(ip, recentRequests);
      
      next();
    };
  },

  // Validate contact form
  validateContactForm(req, res, next) {
    const { email, message } = req.body;
    
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
        error: 'Invalid email format.'
      });
    }
    
    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Message must be at least 10 characters long.'
      });
    }
    
    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot exceed 2000 characters.'
      });
    }
    
    next();
  },

  // Error handler
  errorHandler(err, req, res, next) {
    console.error('❌ Error:', err);
    
    res.status(err.status || 500).json({
      success: false,
      error: CONFIG.NODE_ENV === 'production' 
        ? 'Internal server error'
        : err.message
    });
  }
};

// ========== GAMES SERVICE ==========
class GamesService {
  static getAll(filters = {}) {
    let games = [...PORTFOLIO_GAMES];
    
    // Apply filters
    if (filters.genre && filters.genre !== 'all') {
      games = games.filter(g => g.genre === filters.genre);
    }
    
    if (filters.status && filters.status !== 'all') {
      games = games.filter(g => g.status === filters.status);
    }
    
    if (filters.search) {
      const term = filters.search.toLowerCase();
      games = games.filter(g =>
        g.title.toLowerCase().includes(term) ||
        g.description.toLowerCase().includes(term)
      );
    }
    
    // Sort games
    return this.sortGames(games);
  }
  
  static sortGames(games) {
    const statusOrder = { 'live': 0, 'in dev': 1 };
    
    return games.sort((a, b) => {
      const statA = a.status.toLowerCase().trim();
      const statB = b.status.toLowerCase().trim();

      const valA = statusOrder[statA] !== undefined ? statusOrder[statA] : 99;
      const valB = statusOrder[statB] !== undefined ? statusOrder[statB] : 99;
      
      const statusDiff = valA - valB;
      if (statusDiff !== 0) return statusDiff;
      
      return (a.priority || 999) - (b.priority || 999);
    });
  }
  
  static getStats() {
    return {
      totalGames: PORTFOLIO_GAMES.length,
      liveGames: PORTFOLIO_GAMES.filter(g => g.status === 'Live').length,
      inDev: PORTFOLIO_GAMES.filter(g => g.status === 'In Dev').length,
      concepts: PORTFOLIO_GAMES.filter(g => g.status === 'Concept').length
    };
  }
}

// ========== APP INITIALIZATION ==========
function createApp() {
  const app = express();
  const emailService = new EmailService();
  
  // Initialize email service
  emailService.initialize();
  
  // Apply middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(middleware.securityHeaders);
  app.use(middleware.requestLogger);
  
  // Serve static files
  app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: CONFIG.NODE_ENV === 'production' ? '1d' : 0
  }));
  
  // ========== API ROUTES ==========
  const apiRouter = express.Router();
  
  // Apply rate limiting to API routes
  apiRouter.use(middleware.createRateLimiter());
  apiRouter.use(middleware.noCache);
  
  // GET /api/health
  apiRouter.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      environment: CONFIG.NODE_ENV,
      timestamp: new Date().toISOString(),
      email_configured: emailService.isConfigured,
      games: PORTFOLIO_GAMES.length,
      version: '2.0.0'
    });
  });
  
  // GET /api/stats
  apiRouter.get('/stats', (req, res) => {
    const stats = GamesService.getStats();
    res.json(stats);
  });
  
  // GET /api/games
  apiRouter.get('/games', (req, res) => {
    const { search, genre, status } = req.query;
    const games = GamesService.getAll({ search, genre, status });
    res.json(games);
  });
  
  // POST /api/contact
  apiRouter.post('/contact', 
    middleware.validateContactForm,
    async (req, res, next) => {
      try {
        const { email, message } = req.body;
        
        if (!emailService.isConfigured) {
          return res.status(503).json({
            success: false,
            error: 'Email service is not configured.'
          });
        }
        
        await emailService.sendContactEmail(email, message);
        
        console.log(`✅ Email sent from ${email}`);
        
        res.status(200).json({
          success: true,
          message: 'Email sent successfully.',
          id: Date.now()
        });
      } catch (error) {
        next(error);
      }
    }
  );
  
  // Mount API router
  app.use('/api', apiRouter);
  
  // SPA fallback - serve index.html for all non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
  
  // Error handler (must be last)
  app.use(middleware.errorHandler);
  
  return app;
}

// ========== SERVER START ==========
const app = createApp();

function startServer() {
  const server = app.listen(CONFIG.PORT, () => {
    const stats = GamesService.getStats();
    
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Gaminute Server Started');
    console.log('='.repeat(50));
    console.log(`📍 URL: http://localhost:${CONFIG.PORT}`);
    console.log(`🌍 Environment: ${CONFIG.NODE_ENV}`);
    console.log(`📊 Total games: ${stats.totalGames}`);
    console.log(`✅ Live games: ${stats.liveGames}`);
    console.log(`🔧 In development: ${stats.inDev}`);
    console.log(`💡 Concepts: ${stats.concepts}`);
    
    if (!CONFIG.EMAIL_USER || !CONFIG.EMAIL_PASS) {
      console.log('⚠️  Email: Not configured');
    } else {
      console.log('✉️  Email: Configured');
    }
    
    console.log('='.repeat(50) + '\n');
  });
  
  // 1. SIGTERM (pro Vercel/Hosting)
  process.on('SIGTERM', () => {
    console.log('\n⏹️  SIGTERM received, closing server...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  // 2. SIGINT (pro tvůj CTRL + C ve Windows)
  process.on('SIGINT', () => {
    console.log('\n⏹️  SIGINT (CTRL+C) received. Closing server gracefully...');
    server.close(() => {
      console.log('✅ Server closed properly.');
      process.exit(0);
    });
  });
  
  return server;
}

// Export for Vercel
module.exports = app;

// Start server if run directly
if (require.main === module) {
  startServer();
}