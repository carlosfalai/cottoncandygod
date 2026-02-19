/**
 * Gurumata's Will — System 4
 * 6 sacred claimable seva tasks from Gurumata's wishes.
 * No database — localStorage only.
 */

(function() {
  const STORAGE_KEY = 'gurumata_claims_v1';

  const TASKS = [
    {
      id: 'gm1',
      title: 'Water Purification System',
      description: 'Establish a water purification system for the ashram kitchen to ensure clean, sacred water for all sadhaks and guests.',
      icon: '💧'
    },
    {
      id: 'gm2',
      title: "Women's Meditation Garden",
      description: "Create a women's meditation garden with proper seating, shade, and peaceful sanctuary space for retreat participants.",
      icon: '🌸'
    },
    {
      id: 'gm3',
      title: "Digitize Gurumata's Teachings",
      description: "Document and digitize Gurumata's teachings, writings, and wisdom so they may be preserved and shared with the world.",
      icon: '📜'
    },
    {
      id: 'gm4',
      title: 'Medical Supply Cabinet',
      description: 'Set up a fully stocked medical supply cabinet with first aid essentials for retreat guests and ashram residents.',
      icon: '🏥'
    },
    {
      id: 'gm5',
      title: 'Plant 50 Native Trees',
      description: 'Plant 50 native trees along the ashram boundary to restore the natural habitat and create a living border of sacred groves.',
      icon: '🌳'
    },
    {
      id: 'gm6',
      title: 'Welcoming Committee System',
      description: 'Create a welcoming committee system to greet and orient new retreat guests, ensuring every soul arrives in warmth and love.',
      icon: '🙏'
    }
  ];

  let container = null;

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function getClaims() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) { return {}; }
  }

  function saveClaims(claims) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
    } catch (e) {}
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function renderTask(task, claims) {
    const claim = claims[task.id];
    const user = SevaAuth.user;

    let footer = '';
    if (claim) {
      footer = `
        <div class="gurumata-claimed">
          <span class="gurumata-claimed-badge">✅ Claimed</span>
          <span class="gurumata-claimed-who">by <strong>${esc(claim.name)}</strong> · ${esc(formatDate(claim.claimedAt))}</span>
        </div>
      `;
    } else if (user) {
      footer = `<button class="seva-btn seva-btn-sm seva-btn-primary" onclick="window._sevaGurumata.claim('${task.id}')">Claim this Seva</button>`;
    } else {
      footer = `<button class="seva-btn seva-btn-sm seva-btn-outline" onclick="SevaAuth.signIn()">Sign in to Claim</button>`;
    }

    return `
      <div class="gurumata-card seva-card ${claim ? 'gurumata-card--claimed' : ''}">
        <div class="gurumata-task-icon">${task.icon}</div>
        <h3 class="gurumata-task-title">${esc(task.title)}</h3>
        <p class="gurumata-task-desc">${esc(task.description)}</p>
        <div class="gurumata-task-footer">${footer}</div>
      </div>
    `;
  }

  function render() {
    if (!container) return;
    const claims = getClaims();

    container.innerHTML = `
      <div class="seva-section-header">
        <h2>🙏 Gurumata's Will</h2>
        <p>Sacred seva tasks that Gurumata wishes to see fulfilled at the ashram.</p>
      </div>

      <div class="gurumata-quote">
        <span class="gurumata-quote-mark">"</span>
        Service to the Guru is service to the Divine.
        <span class="gurumata-quote-mark">"</span>
      </div>

      <div class="gurumata-tasks">
        ${TASKS.map(t => renderTask(t, claims)).join('')}
      </div>
    `;
  }

  function claimTask(taskId) {
    const user = SevaAuth.user;
    if (!user) return;
    const task = TASKS.find(t => t.id === taskId);
    if (!task) return;
    const claims = getClaims();
    if (claims[taskId]) return; // already claimed
    const name = user.user_metadata?.full_name || user.email || 'A Hamsa';
    claims[taskId] = { name, claimedAt: new Date().toISOString() };
    saveClaims(claims);
    render();
  }

  window._sevaGurumata = {
    claim(taskId) { claimTask(taskId); }
  };

  SevaRegistry.register('gurumata', {
    name: "Gurumata's Will",
    emoji: '🙏',
    order: 6,
    render() { return `<div id="seva-gurumata-container"></div>`; },
    init() {
      container = document.getElementById('seva-gurumata-container');
      render();
      SevaAuth.onAuthChange(() => render());
    },
    destroy() { container = null; }
  });

})();
