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
    this._hideLoading();

    // Init auth
    SevaAuth.init();
    SevaAuth.onAuthChange(() => this._updateAuthUI());

    // Activate first module
    const modules = SevaRegistry.getAll();
    if (modules.length > 0) {
      this.activateModule(modules[0].id);
    }
  }

  render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      ${this._renderBillboard()}
      <div class="seva-app">
        ${this._renderHeader()}
        ${this._renderClock()}
        ${this._renderNav()}
        <div id="seva-module-container" class="seva-module-container">
          <div class="seva-empty-state">
            <p>Select a section above to get started.</p>
          </div>
        </div>
        ${this._renderFooter()}
      </div>
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
