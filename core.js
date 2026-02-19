/**
 * Seva Core — Main app shell for Siddhanath Kriya Yoga
 * Renders header, nav, module container, footer, ashram clock, billboard.
 * Seva modules plug in via SevaRegistry.
 */

window.SevaUtils = {
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

class SevaCore {
  constructor() {
    this.activeModule = null;
    this.billboardMessages = this._loadBillboard();
    this.billboardIndex = 0;
    this.apiBaseUrl = location.hostname === 'localhost'
      ? 'http://localhost:3009'
      : 'https://siddhanath-ashram-sangha.onrender.com';
    this.init();
  }

  async init() {
    // Small delay to let seva modules register
    await new Promise(r => setTimeout(r, 200));

    this.render();
    this._startClock();
    this._startBillboard();

    // Init auth — gate all content behind sign-in
    SevaAuth.init();
    SevaAuth.onAuthChange((user) => {
      this._updateAuthUI();
      this._updateGate(user);
    });

    this._hideLoading();
  }

  _updateGate(user) {
    const gateEl = document.getElementById('seva-auth-gate');
    const contentEl = document.getElementById('seva-content');
    if (!gateEl || !contentEl) return;

    if (user) {
      gateEl.style.display = 'none';
      contentEl.style.display = 'block';
      // Activate first module if none active
      if (!this.activeModule) {
        const modules = SevaRegistry.getAll();
        if (modules.length > 0) this.activateModule(modules[0].id);
      }
    } else {
      gateEl.style.display = 'flex';
      contentEl.style.display = 'none';
    }
  }

  render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      ${this._renderBillboard()}
      ${this._renderHeader()}
      <div id="seva-auth-gate" class="seva-auth-gate" style="display:none">
        <div class="seva-gate-card">
          <img src="./icon.png" alt="Siddhanath Yoga" class="gate-logo" onerror="this.style.display='none'">
          <h2>Hamsa Sangha Platform</h2>
          <p>This platform is for initiated Hamsas of Yogiraj Siddhanath.<br>Sign in with your Google account to access.</p>
          <button class="seva-btn seva-btn-primary gate-signin-btn" onclick="SevaAuth.signIn()">
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#fff" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#fff" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#fff" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#fff" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
            Sign in with Google
          </button>
          <p class="gate-note">🕉️ For initiated Hamsas only</p>
        </div>
      </div>
      <div id="seva-content" style="display:none">
        <div class="seva-page">
          <div class="seva-container">
            ${this._renderClock()}
            ${this._renderNav()}
            <div id="seva-module-container" class="seva-module-container"></div>
          </div>
        </div>
      </div>
      ${this._renderFooter()}
    `;
  }

  _renderBillboard() {
    return `
      <div class="billboard-container">
        <div class="billboard-ticker" id="billboard-ticker">
          <span class="billboard-message">Loading...</span>
        </div>
      </div>
    `;
  }

  _renderHeader() {
    return `
      <header class="app-header">
        <div class="header-content">
          <div class="logo-section">
            <img src="./icon.png" alt="Siddhanath Yoga" class="logo" onerror="this.style.display='none'">
            <div class="title-section">
              <h1>Siddhanath Kriya Yoga</h1>
              <p>Journey Through Sacred Teachings</p>
            </div>
          </div>
          <div class="header-actions" id="auth-container">
            ${SevaAuth.renderAuthButton()}
          </div>
        </div>
      </header>
    `;
  }

  _renderClock() {
    return `
      <div class="ashram-time-bar">
        <div class="time-item">
          <span class="time-label">India (Ashram)</span>
          <span class="time-value" id="ashram-ist-time">--:--:--</span>
        </div>
        <div class="time-divider">|</div>
        <div class="time-item">
          <span class="time-label">Your Time</span>
          <span class="time-value" id="ashram-local-time">--:--:--</span>
        </div>
      </div>
    `;
  }

  _renderNav() {
    const modules = SevaRegistry.getAll();
    if (modules.length === 0) {
      return '<div class="seva-nav"><p>No modules loaded yet.</p></div>';
    }

    const tabs = modules.map(m => `
      <button class="seva-tab ${m.id === this.activeModule ? 'active' : ''}"
              data-seva-tab="${m.id}">
        ${m.emoji} ${m.name}
      </button>
    `).join('');

    return `
      <nav class="seva-nav" id="seva-nav">
        <div class="seva-tabs">${tabs}</div>
      </nav>
    `;
  }

  _renderFooter() {
    return `
      <footer class="app-footer">
        <div class="footer-content">
          <p>&copy; 2025 Siddhanath Gurunath Yogiraj. All rights reserved.</p>
          <div class="footer-links">
            <a href="https://hamsa-yoga.org" target="_blank">Official Website</a>
            <a href="privacy-policy.html">Privacy</a>
            <a href="support.html">Support</a>
          </div>
        </div>
      </footer>
    `;
  }

  activateModule(id) {
    const mod = SevaRegistry.get(id);
    if (!mod) return;

    // Destroy previous module
    if (this.activeModule) {
      const prev = SevaRegistry.get(this.activeModule);
      if (prev && prev.destroy) prev.destroy();
    }

    this.activeModule = id;

    // Update nav
    document.querySelectorAll('.seva-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.sevaTab === id);
    });

    // Render module
    const container = document.getElementById('seva-module-container');
    if (container) {
      container.innerHTML = mod.render();
      if (mod.init) mod.init();
    }
  }

  _startClock() {
    const update = () => {
      const now = new Date();
      const istEl = document.getElementById('ashram-ist-time');
      const localEl = document.getElementById('ashram-local-time');
      if (istEl) {
        const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
        istEl.textContent = ist.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      }
      if (localEl) {
        localEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      }
    };
    update();
    setInterval(update, 1000);
  }

  _startBillboard() {
    const tick = () => {
      const el = document.getElementById('billboard-ticker');
      if (!el) return;
      const msg = this.billboardMessages[this.billboardIndex % this.billboardMessages.length];
      el.innerHTML = `<span class="billboard-message">${SevaUtils.escapeHtml(msg.text)}</span>`;
      el.classList.add('billboard-animate');
      setTimeout(() => el.classList.remove('billboard-animate'), 500);
      this.billboardIndex++;
    };
    tick();
    setInterval(tick, 6000);
  }

  _loadBillboard() {
    try {
      const saved = localStorage.getItem('seva-billboard');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { text: '"Earth Peace Through Self Peace" - Yogiraj Siddhanath' },
      { text: 'Join Full Moon Earth Peace Meditation - 7-9 PM your local time' },
      { text: 'Practice Kriya Yoga daily for spiritual evolution' },
      { text: 'Visit siddhanath.org for retreats and empowerments' },
      { text: '"The breath is the bridge between body and soul"' },
    ];
  }

  _hideLoading() {
    const loading = document.querySelector('.loading-screen');
    if (loading) {
      setTimeout(() => {
        loading.style.opacity = '0';
        setTimeout(() => loading.remove(), 500);
      }, 800);
    }
  }

  _updateAuthUI() {
    const container = document.getElementById('auth-container');
    if (container) {
      container.innerHTML = SevaAuth.renderAuthButton();
    }
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  // Listen for tab clicks (delegated)
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-seva-tab]');
    if (tab && window._sevaCore) {
      window._sevaCore.activateModule(tab.dataset.sevaTab);
    }
  });

  window._sevaCore = new SevaCore();
});
