/* ========================================
   GAMINUTE - MODERN JAVASCRIPT
   Optimized single-page portfolio
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
  isLoading: false
};

// ========== CONFIGURATION ==========
const CONFIG = {
  API_BASE: '/api',
  DEBOUNCE_DELAY: 300,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TOAST_DURATION: 4000,
  DEBUG: true
};

// ========== UTILITIES ==========
const Utils = {
  /**
   * Debounce function calls
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   */
  debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Log debug messages
   * @param {string} message - Message to log
   * @param {any} data - Optional data to log
   */
  log(message, data = null) {
    if (CONFIG.DEBUG) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] 🎮 ${message}`, data || '');
    }
  },

  /**
   * Update year in footer
   */
  updateYear() {
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  }
};

// ========== API CLIENT ==========
const API = {
  /**
   * Fetch with retry logic
   * @param {string} url - URL to fetch
   * @param {RequestInit} options - Fetch options
   * @param {number} retries - Number of retries
   */
  async fetchWithRetry(url, options = {}, retries = CONFIG.RETRY_ATTEMPTS) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            ...options.headers
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        Utils.log(`Attempt ${i + 1}/${retries} failed for ${url}`, error.message);
        
        if (i === retries - 1) throw error;
        await Utils.sleep(CONFIG.RETRY_DELAY * (i + 1));
      }
    }
  },

  /**
   * Fetch portfolio statistics
   */
  async fetchStats() {
    try {
      const data = await this.fetchWithRetry(
        `${CONFIG.API_BASE}/stats?t=${Date.now()}`
      );
      Utils.log('Stats loaded:', data);
      return data;
    } catch (error) {
      Utils.log('Stats fetch failed, using fallback', error);
      return { totalGames: 5, liveGames: 3, inDev: 1, concepts: 1 };
    }
  },

  /**
   * Fetch all games
   */
  async fetchGames() {
    try {
      const data = await this.fetchWithRetry(
        `${CONFIG.API_BASE}/games?t=${Date.now()}`
      );
      Utils.log('Games loaded:', data.length);
      return data;
    } catch (error) {
      Utils.log('Games fetch failed', error);
      Toast.show('Failed to load games. Please refresh the page.', 'error');
      return [];
    }
  },

  /**
   * Submit contact form
   * @param {Object} formData - Form data {email, message}
   */
  async submitContact(formData) {
    try {
      const data = await this.fetchWithRetry(
        `${CONFIG.API_BASE}/contact`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        },
        1 // Only 1 attempt for form submission
      );
      Utils.log('Contact form submitted:', data);
      return data;
    } catch (error) {
      Utils.log('Contact submission failed', error);
      throw error;
    }
  }
};

// ========== NAVIGATION ==========
const Navigation = {
  mobileMenuOpen: false,

  init() {
    this.setupSmoothScroll();
    this.setupActiveLink();
    this.setupMobileMenu();
    this.setupKeyboardNav();
  },

  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        
        e.preventDefault();
        this.scrollToSection(href.slice(1));
      });
    });
  },

  scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    // Close mobile menu if open
    if (this.mobileMenuOpen) {
      this.closeMobileMenu();
    }

    // Smooth scroll after menu closes
    requestAnimationFrame(() => {
      section.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    });
  },

setupActiveLink() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link, .mobile-link');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach(link => {
              const href = link.getAttribute('href');
              if (href === `#${id}`) {
                  link.classList.add('active');
              } else {
                  link.classList.remove('active');
              }
            });
          }
        });
      },
      { rootMargin: '-50% 0px -50% 0px' } 
    );

    sections.forEach(section => observer.observe(section));
  },

  setupMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const panel = document.getElementById('mobile-panel');
    const backdrop = document.getElementById('mobile-backdrop');

    if (!hamburger || !panel) return;

    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleMobileMenu();
    });

    backdrop?.addEventListener('click', () => this.closeMobileMenu());

    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        // Menu will be closed by scrollToSection
      });
    });
  },

  setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.mobileMenuOpen) {
        this.closeMobileMenu();
      }
    });
  },

  toggleMobileMenu() {
    this.mobileMenuOpen ? this.closeMobileMenu() : this.openMobileMenu();
  },

  openMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const panel = document.getElementById('mobile-panel');
    
    if (!panel || !hamburger) return;
    
    this.mobileMenuOpen = true;
    panel.classList.add('open');
    hamburger.classList.add('active');
    document.body.classList.add('nav-open');
    Utils.log('Mobile menu opened');
  },

  closeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const panel = document.getElementById('mobile-panel');
    
    if (!panel || !hamburger) return;
    
    this.mobileMenuOpen = false;
    panel.classList.remove('open');
    hamburger.classList.remove('active');
    document.body.classList.remove('nav-open');
    Utils.log('Mobile menu closed');
  }
};

// ========== STATS SECTION ==========
const Stats = {
  async load() {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    try {
      const data = await API.fetchStats();
      
      grid.innerHTML = `
        <div class="stat-card reveal">
          <span class="stat-number">${data.totalGames}</span>
          <span class="stat-label">Games in portfolio</span>
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
      
      requestAnimationFrame(() => {
        grid.querySelectorAll('.stat-card').forEach(card => 
          card.classList.add('show')
        );
      });
    } catch (error) {
      Utils.log('Failed to load stats', error);
    }
  }
};

// ========== GAMES SECTION ==========
const Games = {
  searchDebounced: null,

  async init() {
    this.searchDebounced = Utils.debounce(
      (value) => this.handleSearchChange(value),
      CONFIG.DEBOUNCE_DELAY
    );

    await this.loadGames();
    this.setupControls();
  },

  async loadGames() {
    STATE.isLoading = true;
    STATE.games = await API.fetchGames();
    STATE.isLoading = false;
    this.applyFilters();
  },

setupControls() {
    const searchInput = document.getElementById('search-input');
    const searchCounter = document.getElementById('search-counter'); // Nové
    const filterChips = document.querySelectorAll('.chip');
    const statusSelect = document.getElementById('status-select');
    const resetBtn = document.getElementById('reset-filters');

    // 1. Search Listener s počítadlem
    searchInput?.addEventListener('input', (e) => {
      // Aktualizace počítadla
      const currentLength = e.target.value.length;
      if (searchCounter) {
        searchCounter.textContent = `${currentLength}/50`;
      }
      
      // Spuštění hledání
      this.searchDebounced(e.target.value.toLowerCase());
    });

    // 2. Filter Chips
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        STATE.currentFilters.genre = chip.dataset.genre;
        this.applyFilters();
      });
    });

    // 3. Status Select
    statusSelect?.addEventListener('change', (e) => {
      STATE.currentFilters.status = e.target.value;
      this.applyFilters();
    });

    // 4. Reset Button
    resetBtn?.addEventListener('click', () => this.resetFilters());
  },

  handleSearchChange(value) {
    STATE.currentFilters.search = value;
    this.applyFilters();
  },

resetFilters() {
    const searchInput = document.getElementById('search-input');
    const searchCounter = document.getElementById('search-counter'); // New
    const statusSelect = document.getElementById('status-select');
    const filterChips = document.querySelectorAll('.chip');

    if (searchInput) searchInput.value = '';
    if (searchCounter) searchCounter.textContent = '0/50'; // Reset text
    if (statusSelect) statusSelect.value = 'all';
    
    STATE.currentFilters = { search: '', genre: 'all', status: 'all' };
    
    filterChips.forEach(c => c.classList.remove('active'));
    document.querySelector('.chip[data-genre="all"]')?.classList.add('active');
    
    this.applyFilters();
  },

  applyFilters() {
    let filtered = [...STATE.games];

    // Apply search filter
    if (STATE.currentFilters.search) {
      const searchTerm = STATE.currentFilters.search;
      filtered = filtered.filter(game =>
        game.title.toLowerCase().includes(searchTerm) ||
        game.description.toLowerCase().includes(searchTerm)
      );
    }

    // Apply genre filter
    if (STATE.currentFilters.genre !== 'all') {
      filtered = filtered.filter(game => 
        game.genre === STATE.currentFilters.genre
      );
    }

    // Apply status filter
    if (STATE.currentFilters.status !== 'all') {
      filtered = filtered.filter(game => 
        game.status === STATE.currentFilters.status
      );
    }

    // Sort games (same as server logic)
    filtered = this.sortGames(filtered);

    STATE.filteredGames = filtered;
    this.render();
  },

sortGames(games) {
    const statusOrder = { 'live': 0, 'in dev': 1 };
    
    return games.sort((a, b) => {

      const statA = a.status ? a.status.toLowerCase().trim() : '';
      const statB = b.status ? b.status.toLowerCase().trim() : '';


      const valA = statusOrder[statA] !== undefined ? statusOrder[statA] : 99;
      const valB = statusOrder[statB] !== undefined ? statusOrder[statB] : 99;
      
      const statusDiff = valA - valB;
      
      if (statusDiff !== 0) return statusDiff;
      
      return (a.priority || 999) - (b.priority || 999);
    });
  },

  render() {
    const grid = document.getElementById('games-grid');
    const emptyState = document.getElementById('empty-state');

    if (!grid || !emptyState) return;

    if (STATE.filteredGames.length === 0) {
      grid.style.display = 'none';
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    grid.style.display = 'flex';
    grid.innerHTML = STATE.filteredGames.map(game => this.createCard(game)).join('');
  },

  createCard(game) {
    const statusBadgeClass = {
      'Live': 'badge-live',
      'In Dev': 'badge-dev',
      'Concept': 'badge-concept'
    }[game.status] || 'badge-concept';

    const hasPlayStoreUrl = game.url && game.url.trim() !== '';
    
    const actionButton = hasPlayStoreUrl
      ? `<a href="${game.url}" target="_blank" rel="noopener" class="btn btn-primary">Get on Google Play</a>`
      : `<button class="btn btn-static" disabled>${game.status === 'In Dev' ? 'In Development' : 'Concept Only'}</button>`;

    return `
      <article class="game-card" data-game-id="${game.id}">
        <div class="game-thumb">
          <img 
            src="${game.thumb}" 
            alt="${game.title}" 
            loading="lazy" 
            onerror="this.src='img/gaminute_logo.png'"
          >
          <div class="game-badges">
            <span class="badge ${statusBadgeClass}">${game.status}</span>
            <span class="badge badge-genre">${game.genre}</span>
          </div>
        </div>
        
        <div class="game-body">
          <h3 class="game-title">${game.title}</h3>
          <p class="game-desc">${game.description}</p>
          <div class="game-actions">
            ${actionButton}
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
  validators: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    minMessageLength: 10,
    maxMessageLength: 2000
  },

  init() {
    this.form = document.getElementById('contact-form');
    this.submitBtn = document.getElementById('submit-btn');

    if (!this.form) return;

    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.setupValidation();
    this.setupCharCounter();
  },

  setupCharCounter() {
    const messageInput = document.getElementById('message');
    const charCounter = document.getElementById('char-counter');

    if (!messageInput || !charCounter) return;

    messageInput.addEventListener('input', () => {
      const currentLength = messageInput.value.length;
      const maxLength = this.validators.maxMessageLength;
      
      charCounter.textContent = `${currentLength}/${maxLength}`;
      
      if (currentLength >= maxLength) {
        charCounter.classList.add('limit-reached');
      } else {
        charCounter.classList.remove('limit-reached');
      }
    });
  },

  setupValidation() {
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');

    emailInput?.addEventListener('blur', () => this.validateEmail());
    messageInput?.addEventListener('blur', () => this.validateMessage());
    
    // Clear errors on input
    emailInput?.addEventListener('input', () => this.clearError('email'));
    messageInput?.addEventListener('input', () => this.clearError('message'));
  },

  clearError(fieldName) {
    const input = document.getElementById(fieldName);
    const error = document.getElementById(`${fieldName}-error`);
    
    if (input) input.style.borderColor = '';
    if (error) error.textContent = '';
  },

  validateEmail() {
    const input = document.getElementById('email');
    const error = document.getElementById('email-error');

    if (!input.value) {
      this.showFieldError(input, error, 'Email is required');
      return false;
    }

    if (!this.validators.email.test(input.value)) {
      this.showFieldError(input, error, 'Please enter a valid email');
      return false;
    }

    this.clearFieldError(input, error);
    return true;
  },

  validateMessage() {
    const input = document.getElementById('message');
    const error = document.getElementById('message-error');

    const messageLength = input.value.trim().length;

    if (messageLength === 0) {
      this.showFieldError(input, error, 'Message is required');
      return false;
    }

    if (messageLength < this.validators.minMessageLength) {
      this.showFieldError(input, error, `Message must be at least ${this.validators.minMessageLength} characters`);
      return false;
    }

    if (messageLength > this.validators.maxMessageLength) {
      this.showFieldError(input, error, `Message cannot exceed ${this.validators.maxMessageLength} characters`);
      return false;
    }

    this.clearFieldError(input, error);
    return true;
  },

  showFieldError(input, error, message) {
    if (input) input.style.borderColor = 'var(--error)';
    if (error) error.textContent = message;
  },

  clearFieldError(input, error) {
    if (input) input.style.borderColor = '';
    if (error) error.textContent = '';
  },

  async handleSubmit(e) {
    e.preventDefault();

    if (this.isSubmitting) return;

    const emailValid = this.validateEmail();
    const messageValid = this.validateMessage();

    if (!emailValid || !messageValid) {
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
      
      // Reset character counter
      const charCounter = document.getElementById('char-counter');
      if (charCounter) {
        charCounter.textContent = '0/2000';
        charCounter.classList.remove('limit-reached');
      }
    } catch (error) {
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
  activeToasts: new Set(),

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(message, type = 'success') {
    if (!this.container) return;

    const toast = this.createToast(message, type);
    this.container.appendChild(toast);
    this.activeToasts.add(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => this.remove(toast), CONFIG.TOAST_DURATION);
  },

  createToast(message, type) {
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

    return toast;
  },

  remove(toast) {
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
      this.activeToasts.delete(toast);
    }, 300);
  }
};

// ========== REVEAL ON SCROLL ==========
const RevealOnScroll = {
  observer: null,

  init() {
    const elements = document.querySelectorAll('.reveal');
    
    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('show'));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
            this.observer.unobserve(entry.target);
          }
        });
      },
      { 
        threshold: 0.1, 
        rootMargin: '0px 0px -50px 0px' 
      }
    );

    elements.forEach(el => this.observer.observe(el));
  }
};

// ========== INITIALIZATION ==========
async function initApp() {
  Utils.log('🎮 Gaminute Portfolio Loading...');
  
  // Initialize synchronous modules
  Utils.updateYear();
  Navigation.init();
  ContactForm.init();
  Toast.init();
  RevealOnScroll.init();

  // Load async data
  try {
    await Promise.all([
      Stats.load(),
      Games.init()
    ]);
    
    Utils.log('✅ All data loaded successfully');
  } catch (error) {
    Utils.log('❌ Initialization error:', error);
  }

  // Trigger hero animations
  requestAnimationFrame(() => {
    document.querySelectorAll('.hero-content .reveal').forEach(el => {
      el.classList.add('show');
    });
  });
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for testing (Node.js environments)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API, STATE, Games, ContactForm, Toast, Utils, CONFIG };
}