/* ========================================
   GAMINUTE - COMPLETE JAVASCRIPT
   Single-page portfolio logic
   ======================================== */

// ========== GLOBAL STATE ==========
const STATE = {
  games: [],
  filteredGames: [],
  currentFilters: {
    search: '',
    genre: 'all',
    status: 'all'
  },
  expandedGameId: null
};

// ========== API CLIENT ==========
const API = {
  baseURL: '/api',
  
  async fetchStats() {
    try {
      const res = await fetch(`${this.baseURL}/stats`);
      if (!res.ok) throw new Error('Stats fetch failed');
      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      return { totalGames: 4, liveGames: 1, inDev: 2 };
    }
  },

  async fetchGames() {
    try {
      const res = await fetch(`${this.baseURL}/games`);
      if (!res.ok) throw new Error('Games fetch failed');
      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      return [];
    }
  },

  async submitContact(data) {
    try {
      const res = await fetch(`${this.baseURL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Contact submission failed');
      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  }
};

// ========== NAVIGATION ==========
const Navigation = {
  init() {
    this.setupSmoothScroll();
    this.setupActiveLink();
    this.setupMobileMenu();
  },

  setupSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          this.closeMobileMenu();
        }
      });
    });
  },

  setupActiveLink() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            }
          });
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(section => observer.observe(section));
  },

  setupMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const panel = document.getElementById('mobile-panel');
    const backdrop = panel?.querySelector('.mobile-panel__backdrop');
    const mobileLinks = panel?.querySelectorAll('.mobile-link');

    if (!hamburger || !panel) return;

    hamburger.addEventListener('click', () => {
      const isHidden = panel.hidden;
      if (isHidden) {
        this.openMobileMenu();
      } else {
        this.closeMobileMenu();
      }
    });

    backdrop?.addEventListener('click', () => this.closeMobileMenu());
    mobileLinks?.forEach(link => {
      link.addEventListener('click', () => this.closeMobileMenu());
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) {
        this.closeMobileMenu();
      }
    });
  },

  openMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const panel = document.getElementById('mobile-panel');
    
    panel.hidden = false;
    setTimeout(() => panel.setAttribute('aria-hidden', 'false'), 10);
    hamburger.classList.add('active');
    document.body.classList.add('nav-open');
  },

  closeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const panel = document.getElementById('mobile-panel');
    
    panel.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('active');
    document.body.classList.remove('nav-open');
    
    setTimeout(() => {
      panel.hidden = true;
    }, 300);
  }
};

// ========== STATS SECTION ==========
const Stats = {
  async load() {
    const grid = document.getElementById('stats-grid');
    const data = await API.fetchStats();
    
    grid.innerHTML = `
      <div class="stat-card reveal">
        <span class="stat-number">${data.totalGames}</span>
        <span class="stat-label">Games Built</span>
      </div>
      <div class="stat-card reveal">
        <span class="stat-number">${data.liveGames}</span>
        <span class="stat-label">Live on Play Store</span>
      </div>
      <div class="stat-card reveal">
        <span class="stat-number">${data.inDev}</span>
        <span class="stat-label">In Development</span>
      </div>
    `;
    
    setTimeout(() => {
      grid.querySelectorAll('.stat-card').forEach(card => card.classList.add('show'));
    }, 100);
  }
};

// ========== GAMES SECTION ==========
const Games = {
  debounceTimer: null,

  async init() {
    await this.loadGames();
    this.setupControls();
  },

  async loadGames() {
    const games = await API.fetchGames();
    STATE.games = games;
    STATE.filteredGames = games;
    this.render();
  },

  setupControls() {
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.chip');
    const statusSelect = document.getElementById('status-select');
    const resetBtn = document.getElementById('reset-filters');

    // Search with debounce
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        STATE.currentFilters.search = e.target.value.toLowerCase();
        this.applyFilters();
      }, 300);
    });

    // Genre filters
    filterChips?.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        STATE.currentFilters.genre = chip.dataset.genre;
        this.applyFilters();
      });
    });

    // Status filter
    statusSelect?.addEventListener('change', (e) => {
      STATE.currentFilters.status = e.target.value;
      this.applyFilters();
    });

    // Reset filters
    resetBtn?.addEventListener('click', () => {
      searchInput.value = '';
      STATE.currentFilters = { search: '', genre: 'all', status: 'all' };
      filterChips?.forEach(c => c.classList.remove('active'));
      document.querySelector('.chip[data-genre="all"]')?.classList.add('active');
      statusSelect.value = 'all';
      this.applyFilters();
    });
  },

  applyFilters() {
    let filtered = [...STATE.games];

    // Search filter
    if (STATE.currentFilters.search) {
      filtered = filtered.filter(game =>
        game.title.toLowerCase().includes(STATE.currentFilters.search) ||
        game.description.toLowerCase().includes(STATE.currentFilters.search)
      );
    }

    // Genre filter
    if (STATE.currentFilters.genre !== 'all') {
      filtered = filtered.filter(game => game.genre === STATE.currentFilters.genre);
    }

    // Status filter
    if (STATE.currentFilters.status !== 'all') {
      filtered = filtered.filter(game => game.status === STATE.currentFilters.status);
    }

    // Sort by status priority (Live > In Dev > Prototype > Concept)
    const statusOrder = { 'Live': 0, 'In Dev': 1, 'Prototype': 2, 'Concept': 3 };
    filtered.sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      return statusDiff !== 0 ? statusDiff : b.id - a.id;
    });

    STATE.filteredGames = filtered;
    this.render();
  },

  render() {
    const grid = document.getElementById('games-grid');
    const emptyState = document.getElementById('empty-state');

    if (STATE.filteredGames.length === 0) {
      grid.style.display = 'none';
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    grid.style.display = 'grid';
    
    grid.innerHTML = STATE.filteredGames.map(game => this.createCard(game)).join('');

    // Setup click handlers for expand/collapse
    STATE.filteredGames.forEach(game => {
      const moreBtn = document.getElementById(`more-btn-${game.id}`);
      const downloadBtn = document.getElementById(`download-btn-${game.id}`);
      
      moreBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDetail(game.id);
      });
    });
  },

  toggleDetail(gameId) {
    const detail = document.getElementById(`detail-${gameId}`);
    const moreBtn = document.getElementById(`more-btn-${gameId}`);
    
    if (!detail || !moreBtn) return;

    const isExpanded = detail.classList.contains('expanded');
    
    // Close all other details
    document.querySelectorAll('.game-detail').forEach(d => {
      if (d.id !== `detail-${gameId}`) {
        d.classList.remove('expanded');
      }
    });
    
    // Update all buttons
    document.querySelectorAll('[id^="more-btn-"]').forEach(btn => {
      if (btn.id !== `more-btn-${gameId}`) {
        btn.textContent = 'More Info';
      }
    });

    // Toggle current detail
    if (isExpanded) {
      detail.classList.remove('expanded');
      moreBtn.textContent = 'More Info';
      STATE.expandedGameId = null;
    } else {
      detail.classList.add('expanded');
      moreBtn.textContent = 'Less Info';
      STATE.expandedGameId = gameId;
      
      // Scroll to show the expanded content
      setTimeout(() => {
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  },

  createCard(game) {
    const statusClass = {
      'Live': 'badge-live',
      'In Dev': 'badge-dev',
      'Prototype': 'badge-concept',
      'Concept': 'badge-concept'
    }[game.status] || 'badge-concept';

    const hasUrl = game.url && game.url.trim() !== '';
    
    const downloadBtn = hasUrl 
      ? `<a href="${game.url}" target="_blank" rel="noopener" class="btn btn-primary" id="download-btn-${game.id}">Google Play</a>`
      : `<button class="btn btn-ghost" disabled style="opacity: .5; cursor: not-allowed;">Not Released</button>`;

    return `
      <article class="game-card" data-game-id="${game.id}">
        <div class="game-thumb">
          <img src="${game.thumb}" alt="${game.title}" loading="lazy" onerror="this.src='img/gaminute_logo.png'">
          <div class="game-badges">
            <span class="badge ${statusClass}">${game.status}</span>
            <span class="badge badge-genre">${game.genre}</span>
          </div>
        </div>
        <div class="game-body">
          <h3 class="game-title">${game.title}</h3>
          <div class="game-tech">
            <span>${game.tech === 'canvas' ? '🎨 Canvas' : '📱 Native UI'}</span>
            <span>•</span>
            <span>v${game.version}</span>
          </div>
          <p class="game-desc">${game.description.substring(0, 120)}...</p>
          
          <div class="game-detail" id="detail-${game.id}">
            <div class="game-detail-content">
              <h4>Full Description</h4>
              <p>${game.description}</p>
              
              <h4>Technical Details</h4>
              <ul>
                <li><strong>Technology:</strong> ${game.tech === 'canvas' ? 'HTML5 Canvas API' : 'Native DOM UI'}</li>
                <li><strong>Version:</strong> ${game.version}</li>
                <li><strong>Genre:</strong> ${game.genre.charAt(0).toUpperCase() + game.genre.slice(1)}</li>
                <li><strong>Status:</strong> ${game.status}</li>
                ${hasUrl ? `<li><strong>Download:</strong> <a href="${game.url}" target="_blank" rel="noopener">Google Play Store</a></li>` : ''}
              </ul>
            </div>
          </div>

          <div class="game-actions">
            ${downloadBtn}
            <button class="btn btn-ghost" id="more-btn-${game.id}">More Info</button>
          </div>
        </div>
      </article>
    `;
  }
};

// ========== CONTACT FORM ==========
const ContactForm = {
  form: null,
  submitBtn: null,
  isSubmitting: false,

  init() {
    this.form = document.getElementById('contact-form');
    this.submitBtn = document.getElementById('submit-btn');

    if (!this.form) return;

    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Live validation
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');

    emailInput?.addEventListener('blur', () => this.validateEmail());
    messageInput?.addEventListener('blur', () => this.validateMessage());
  },

  validateEmail() {
    const input = document.getElementById('email');
    const error = document.getElementById('email-error');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!input.value) {
      error.textContent = 'Email is required';
      input.style.borderColor = 'var(--error)';
      return false;
    }

    if (!emailRegex.test(input.value)) {
      error.textContent = 'Please enter a valid email';
      input.style.borderColor = 'var(--error)';
      return false;
    }

    error.textContent = '';
    input.style.borderColor = '';
    return true;
  },

  validateMessage() {
    const input = document.getElementById('message');
    const error = document.getElementById('message-error');

    if (!input.value || input.value.trim().length < 10) {
      error.textContent = 'Message must be at least 10 characters';
      input.style.borderColor = 'var(--error)';
      return false;
    }

    error.textContent = '';
    input.style.borderColor = '';
    return true;
  },

  async handleSubmit(e) {
    e.preventDefault();

    // Prevent double submission
    if (this.isSubmitting) return;

    const emailValid = this.validateEmail();
    const messageValid = this.validateMessage();

    if (!emailValid || !messageValid) {
      Toast.show('Please fix the errors', 'error');
      return;
    }

    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    this.isSubmitting = true;
    this.setLoading(true);

    try {
      await API.submitContact({ email, message });
      Toast.show('Message sent successfully!', 'success');
      this.form.reset();
    } catch (err) {
      Toast.show('Failed to send message. Please try again.', 'error');
    } finally {
      this.isSubmitting = false;
      this.setLoading(false);
    }
  },

  setLoading(loading) {
    const btnText = this.submitBtn?.querySelector('.btn-text');
    const btnLoader = this.submitBtn?.querySelector('.btn-loader');

    if (!this.submitBtn) return;

    this.submitBtn.disabled = loading;
    
    if (btnText) btnText.hidden = loading;
    if (btnLoader) btnLoader.hidden = !loading;
  }
};

// ========== TOAST NOTIFICATIONS ==========
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(message, type = 'success') {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' 
      ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
      : '<svg class="toast-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';

    toast.innerHTML = `
      ${icon}
      <div class="toast-body">
        <div class="toast-title">${type === 'success' ? 'Success' : 'Error'}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    this.container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// ========== REVEAL ON SCROLL ==========
const RevealOnScroll = {
  init() {
    const elements = document.querySelectorAll('.reveal');
    
    if (typeof IntersectionObserver === 'undefined') {
      elements.forEach(el => el.classList.add('show'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    elements.forEach(el => observer.observe(el));
  }
};

// ========== UTILITIES ==========
const Utils = {
  updateYear() {
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  }
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize all modules
  Utils.updateYear();
  Navigation.init();
  ContactForm.init();
  Toast.init();
  RevealOnScroll.init();

  // Load data
  await Promise.all([
    Stats.load(),
    Games.init()
  ]);

  // Trigger initial reveal animations
  setTimeout(() => {
    document.querySelectorAll('.hero-content .reveal').forEach(el => {
      el.classList.add('show');
    });
  }, 100);
});

// ========== EXPORT FOR TESTING ==========
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API, STATE, Games, ContactForm, Toast };
}