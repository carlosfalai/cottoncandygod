/**
 * Seva Infrastructure — System 8
 * Ashram project fundraising tracker (kickstarter-style).
 * Hamsas see what needs funding and pledge support.
 */

(function() {
  const API_BASE = location.hostname === 'localhost'
    ? 'http://localhost:3009'
    : 'https://siddhanath-ashram-sangha.onrender.com';

  const SUPABASE_URL = 'https://gbxksgxezbljwlnlpkpz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGtzZ3hlemJsandsbmxwa3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE1ODksImV4cCI6MjA2NDMyNzU4OX0.MCZ9NTKCUe8DLwXz8Cy2-Qr-KYPpq-tn376dpjQ6HxM';

  const CATEGORY_LABELS = {
    accommodation: '🏠 Accommodation',
    infrastructure: '🔧 Infrastructure',
    temple: '🪔 Temple',
    kitchen: '🍽️ Kitchen',
    grounds: '🌱 Grounds',
    other: '📦 Other'
  };

  const PHASE_LABELS = {
    1: 'Phase 1 — Essential',
    2: 'Phase 2 — Upgrade',
    3: 'Phase 3 — Expansion'
  };

  const STATUS_LABELS = {
    open: { label: 'Funding Open', color: '#117743' },
    planning: { label: 'In Planning', color: '#C9A227' },
    funded: { label: 'Funded ✓', color: '#0D5C35' },
    complete: { label: 'Complete ✓', color: '#667085' }
  };

  let projects = [];
  let pledges = {};
  let view = 'grid'; // grid | detail
  let selectedProject = null;
  let filterPhase = 'all';

  function esc(s) { return SevaUtils ? SevaUtils.escapeHtml(String(s || '')) : String(s || ''); }

  function fmt(n) {
    return '$' + Number(n || 0).toLocaleString('en-US');
  }

  function pct(raised, goal) {
    if (!goal) return 0;
    return Math.min(100, Math.round((raised / goal) * 100));
  }

  async function loadProjects() {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/ashram_projects?select=*&order=priority.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      if (!resp.ok) throw new Error('Failed to load projects');
      projects = await resp.json();
    } catch (e) {
      console.warn('[Infrastructure] Load failed:', e.message);
      projects = [];
    }
  }

  async function loadPledgesForProject(projectId) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/ashram_pledges?project_id=eq.${projectId}&select=*&order=created_at.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      if (!resp.ok) return [];
      return await resp.json();
    } catch (e) { return []; }
  }

  async function submitPledge(projectId, amount, message) {
    const user = SevaAuth.user;
    const payload = {
      project_id: projectId,
      hamsa_id: user ? user.id : null,
      hamsa_name: user ? (user.user_metadata?.full_name || user.email) : 'Anonymous',
      amount_usd: amount,
      message: message || ''
    };

    // Insert pledge
    const sb = SevaAuth.client || (window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null);
    if (!sb) return { error: 'Supabase not loaded' };

    const { error } = await sb.from('ashram_pledges').insert(payload);
    if (error) return { error: error.message };

    // Update raised amount on project
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const newRaised = (project.raised_usd || 0) + amount;
      await sb.from('ashram_projects').update({ raised_usd: newRaised, updated_at: new Date().toISOString() }).eq('id', projectId);
      project.raised_usd = newRaised;
    }

    return { ok: true };
  }

  function renderProjectCard(p) {
    const progress = pct(p.raised_usd, p.goal_usd);
    const status = STATUS_LABELS[p.status] || STATUS_LABELS.open;
    const cat = CATEGORY_LABELS[p.category] || p.category;
    const catEmoji = cat.split(' ')[0];

    return `
      <div class="sg-project" data-project-id="${esc(p.id)}">
        <div class="sg-thumb">
          ${p.photo_url
            ? `<img src="${esc(p.photo_url)}" alt="${esc(p.title)}">`
            : `<div class="sg-no-image">${catEmoji}</div>`}
        </div>
        <div class="sg-content">
          <div class="sg-top-row">
            <span class="sg-cat-tag">${esc(cat)}</span>
            <span class="sg-phase-tag">${esc(PHASE_LABELS[p.phase] || 'Phase ' + p.phase)}</span>
          </div>
          <div class="sg-subject">${esc(p.title)}</div>
          <div class="sg-comment">${esc(p.description)}</div>
          <div class="sg-progress-row">
            <div class="sg-progress-wrap"><div class="sg-progress-fill" style="width:${progress}%"></div></div>
            <span class="sg-progress-pct">${progress}%</span>
          </div>
          <div class="sg-stats">
            <span class="sg-stat-raised">${fmt(p.raised_usd)} raised</span>
            <span class="sg-stat-goal">Goal: ${fmt(p.goal_usd)}</span>
            <span class="sg-stat-status" style="color:${status.color}">${esc(status.label)}</span>
          </div>
          <div class="sg-actions">
            <button class="sg-action-btn sg-btn-pledge" onclick="window._infraModule.openProject('${esc(p.id)}')">💰 Pledge</button>
            <button class="sg-action-btn" onclick="window._infraModule.openProject('${esc(p.id)}')">📋 Details</button>
            <button class="sg-action-btn" onclick="window._infraModule.openProject('${esc(p.id)}')">📸 Photos</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderDetailView(p) {
    const progress = pct(p.raised_usd, p.goal_usd);
    const status = STATUS_LABELS[p.status] || STATUS_LABELS.open;
    const pledgeList = (pledges[p.id] || []);

    return `
      <div class="infra-detail">
        <button class="seva-btn seva-btn-ghost seva-btn-sm infra-back-btn" onclick="window._infraModule.backToGrid()">← Back to all projects</button>

        ${p.photo_url ? `<img src="${esc(p.photo_url)}" alt="${esc(p.title)}" class="infra-detail-img">` : ''}

        <div class="infra-detail-header">
          <div>
            <div class="infra-card-meta" style="margin-bottom:8px">
              <span class="infra-category-tag">${esc(CATEGORY_LABELS[p.category] || p.category)}</span>
              <span class="infra-phase-tag">${esc(PHASE_LABELS[p.phase] || 'Phase ' + p.phase)}</span>
              <span class="infra-status-badge" style="background:${status.color}20;color:${status.color}">${esc(status.label)}</span>
            </div>
            <h2 class="infra-detail-title">${esc(p.title)}</h2>
            <p class="infra-detail-desc">${esc(p.description)}</p>
          </div>
          <div class="infra-detail-funding">
            <div class="infra-big-number">${fmt(p.raised_usd)}</div>
            <div class="infra-big-label">raised of ${fmt(p.goal_usd)} goal</div>
            <div class="infra-progress-bar-wrap infra-progress-lg">
              <div class="infra-progress-bar" style="width:${progress}%"></div>
            </div>
            <div class="infra-pct-big">${progress}% funded</div>
          </div>
        </div>

        ${p.status !== 'complete' ? `
        <div class="infra-pledge-form seva-card">
          <h4>🙏 Pledge Support</h4>
          <p class="field-hint">Express your intention to contribute. Actual payment coordination is handled separately.</p>
          <div class="infra-pledge-grid">
            <div class="form-group">
              <label>Amount (USD)</label>
              <input type="number" id="pledge-amount" placeholder="100" min="1" max="50000">
            </div>
            <div class="form-group">
              <label>Message (optional)</label>
              <input type="text" id="pledge-message" placeholder="Hari Om! Happy to help with this..." maxlength="200">
            </div>
          </div>
          <div id="pledge-status" class="save-status"></div>
          <button class="seva-btn seva-btn-primary" id="pledge-btn" onclick="window._infraModule.pledge('${esc(p.id)}')">
            🙏 Pledge Support
          </button>
          ${!SevaAuth.user ? '<p class="field-hint" style="margin-top:8px">Sign in with Google to pledge.</p>' : ''}
        </div>
        ` : ''}

        ${pledgeList.length > 0 ? `
        <div class="infra-pledges-section">
          <h4>Pledges (${pledgeList.length})</h4>
          <div class="infra-pledges-list">
            ${pledgeList.map(pl => `
              <div class="infra-pledge-item">
                <span class="infra-pledge-name">🙏 ${esc(pl.hamsa_name)}</span>
                <span class="infra-pledge-amount">${fmt(pl.amount_usd)}</span>
                ${pl.message ? `<p class="infra-pledge-msg">${esc(pl.message)}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  function render() {
    const container = document.getElementById('seva-module-container');
    if (!container) return;

    const phaseFilters = ['all', 1, 2, 3];
    const filtered = filterPhase === 'all' ? projects : projects.filter(p => p.phase === filterPhase);

    let html = `<div class="infra-module">`;

    if (view === 'grid') {
      html += `
        <div class="infra-header">
          <div>
            <h2 class="infra-main-title">🏛️ Ashram Development Projects</h2>
            <p class="infra-main-desc">Each project represents a real need at the ashram. Your support makes it happen.</p>
          </div>
          <div class="infra-total-bar">
            <span class="infra-total-label">Total raised</span>
            <span class="infra-total-value">${fmt(projects.reduce((s, p) => s + (p.raised_usd || 0), 0))}</span>
          </div>
        </div>

        <div class="infra-filters">
          ${phaseFilters.map(f => `
            <button class="infra-filter-btn ${filterPhase === f ? 'active' : ''}"
              onclick="window._infraModule.setFilter(${JSON.stringify(f)})">
              ${f === 'all' ? 'All Projects' : PHASE_LABELS[f] || 'Phase ' + f}
            </button>
          `).join('')}
        </div>

        <div class="sg-projects-list">
          ${filtered.length === 0
            ? '<p class="empty-state">No projects yet. Projects will be posted by the ashram team.</p>'
            : filtered.map(renderProjectCard).join('')}
        </div>
      `;
    } else if (view === 'detail' && selectedProject) {
      html += renderDetailView(selectedProject);
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  window._infraModule = {
    setFilter(phase) {
      filterPhase = phase;
      render();
    },
    async openProject(id) {
      const p = projects.find(pr => pr.id === id);
      if (!p) return;
      selectedProject = p;
      view = 'detail';
      render();
      // Load pledges
      pledges[id] = await loadPledgesForProject(id);
      render();
    },
    backToGrid() {
      view = 'grid';
      selectedProject = null;
      render();
    },
    async pledge(projectId) {
      const btn = document.getElementById('pledge-btn');
      const status = document.getElementById('pledge-status');
      const amountEl = document.getElementById('pledge-amount');
      const msgEl = document.getElementById('pledge-message');

      if (!SevaAuth.user) {
        status.textContent = '⚠️ Please sign in first.';
        status.className = 'save-status error';
        return;
      }

      const amount = parseInt(amountEl?.value);
      if (!amount || amount < 1) {
        status.textContent = '⚠️ Enter a valid amount.';
        status.className = 'save-status error';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Saving...';
      status.textContent = '';

      const result = await submitPledge(projectId, amount, msgEl?.value);
      if (result.error) {
        status.textContent = '❌ ' + result.error;
        status.className = 'save-status error';
        btn.disabled = false;
        btn.textContent = '🙏 Pledge Support';
      } else {
        status.textContent = '✅ Pledge recorded! Thank you.';
        status.className = 'save-status success';
        // Reload pledges
        pledges[projectId] = await loadPledgesForProject(projectId);
        setTimeout(() => render(), 1000);
      }
    }
  };

  SevaRegistry.register('infrastructure', {
    name: 'Ashram Projects',
    emoji: '🏛️',
    order: 3,
    render() { return '<div class="seva-empty-state">Loading projects...</div>'; },
    async init() {
      await loadProjects();
      render();
    },
    destroy() {}
  });

})();
